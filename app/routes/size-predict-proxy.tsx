import * as crypto from "node:crypto";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { getSuggestedSize } from "../lib/sizePredict.server";

const PROXY_SECRET = process.env.SHOPIFY_API_SECRET || "";

/**
 * Build the message string used for App Proxy HMAC (keys sorted, key=value per param).
 * Multiple values for same key joined with comma (per Shopify docs).
 */
function buildProxyMessage(params: URLSearchParams): string {
  const map = new Map<string, string[]>();
  params.forEach((value, key) => {
    if (key === "signature") return;
    const list = map.get(key) ?? [];
    list.push(value);
    map.set(key, list);
  });
  const entries = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v.join(",")}`);
  return entries.join("");
}

function verifyAppProxySignature(request: Request): boolean {
  const url = new URL(request.url);
  const signature = url.searchParams.get("signature");
  if (!signature || !PROXY_SECRET) return false;
  const message = buildProxyMessage(url.searchParams);
  const digest = crypto
    .createHmac("sha256", PROXY_SECRET)
    .update(message, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(digest, "hex")
  );
}

export const loader = async (args: LoaderFunctionArgs) => handleProxyRequest(args.request);

export const action = async (args: ActionFunctionArgs) => handleProxyRequest(args.request);

async function handleProxyRequest(request: Request): Promise<Response> {
  if (!verifyAppProxySignature(request)) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  let height = url.searchParams.get("height");
  let weight = url.searchParams.get("weight");

  if (request.method === "POST") {
    try {
      const body = await request.formData();
      height = height ?? body.get("height")?.toString() ?? null;
      weight = weight ?? body.get("weight")?.toString() ?? null;
    } catch {
      // keep query params
    }
  }

  const heightNum = height ? parseFloat(height) : NaN;
  const weightNum = weight ? parseFloat(weight) : NaN;

  if (!shop || !Number.isFinite(heightNum) || !Number.isFinite(weightNum)) {
    return new Response(
      JSON.stringify({
        error: "Missing or invalid shop, height (cm), or weight (kg)",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const settingsRepo = (prisma as unknown as Record<string, unknown>).sizePredictSettings as undefined | { findUnique: (args: { where: { shop: string } }) => Promise<{ widgetEnabled: boolean } | null> };
  const settings = settingsRepo ? await settingsRepo.findUnique({ where: { shop } }).catch(() => null) : null;
  if (settings && !settings.widgetEnabled) {
    return new Response(
      JSON.stringify({ error: "Size prediction is disabled" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const rulesRepo = (prisma as unknown as Record<string, unknown>).sizePredictRule as undefined | { findMany: (args: object) => Promise<Array<{ scopeType: string; mappings: Array<{ sizeName: string; heightMin: number; heightMax: number; weightMin: number; weightMax: number }> }>> };
  const rules = rulesRepo ? await rulesRepo.findMany({ where: { shop, status: "active" }, include: { mappings: true }, orderBy: { createdAt: "asc" } }).catch(() => []) : [];

  let entries: Array<{ sizeName: string; heightMin: number; heightMax: number; weightMin: number; weightMax: number }>;
  const allRule = rules.find((r) => r.scopeType === "all");
  if (allRule && allRule.mappings.length > 0) {
    entries = allRule.mappings.map((m) => ({
      sizeName: m.sizeName,
      heightMin: m.heightMin,
      heightMax: m.heightMax,
      weightMin: m.weightMin,
      weightMax: m.weightMax,
    }));
  } else if (rules.length > 0 && rules[0].mappings.length > 0) {
    entries = rules[0].mappings.map((m) => ({
      sizeName: m.sizeName,
      heightMin: m.heightMin,
      heightMax: m.heightMax,
      weightMin: m.weightMin,
      weightMax: m.weightMax,
    }));
  } else {
    const legacyEntries = await prisma.sizeChartEntry.findMany({
      where: { shop },
      select: { sizeName: true, heightMin: true, heightMax: true, weightMin: true, weightMax: true },
    });
    entries = legacyEntries.map((e) => ({
      sizeName: e.sizeName,
      heightMin: e.heightMin,
      heightMax: e.heightMax,
      weightMin: e.weightMin,
      weightMax: e.weightMax,
    }));
  }

  const result = getSuggestedSize(entries, heightNum, weightNum);

  return new Response(JSON.stringify(result), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=0",
    },
  });
}
