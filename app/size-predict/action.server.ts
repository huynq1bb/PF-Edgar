/**
 * Size prediction admin page actions.
 * Intents: toggle, saveSettings, createRule, updateRule, deleteRule, toggleRule, testPrediction.
 */
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getSuggestedSize } from "../lib/sizePredict.server";
import type { MappingRow } from "./types";

/** Runtime access to Prisma delegates (may be missing if schema not migrated). */
const prismaRecord = prisma as unknown as Record<string, unknown>;
const ruleRepo = prismaRecord.sizePredictRule as
  | {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      findUnique: (args: object) => Promise<{ name: string; scopeType: string; scopeValue: string | null; mappings: Array<MappingRow> } | null>;
      findMany: (args: object) => Promise<Array<{ scopeType: string; scopeValue: string | null; mappings: Array<MappingRow> }>>;
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
      updateMany: (args: { where: { id: string; shop: string }; data: { status: string } }) => Promise<unknown>;
      deleteMany: (args: { where: { id: string; shop: string } }) => Promise<unknown>;
    }
  | undefined;
const mappingRepo = prismaRecord.sizePredictRuleMapping as
  | {
      deleteMany: (args: { where: { ruleId: string } }) => Promise<unknown>;
      createMany: (args: { data: Array<Record<string, unknown>> }) => Promise<unknown>;
    }
  | undefined;

type RuleRepos = { ruleRepo: NonNullable<typeof ruleRepo>; mappingRepo: NonNullable<typeof mappingRepo> };

function requireRuleRepos(): { ok: false; error: string } | ({ ok: true } & RuleRepos) {
  if (!ruleRepo?.create || !mappingRepo?.createMany) {
    return { ok: false, error: "Database models not available. Run: npm run setup" };
  }
  return { ok: true, ruleRepo, mappingRepo };
}

export async function sizePredictAction({ request }: ActionFunctionArgs): Promise<{
  ok: boolean;
  error?: string;
  savedMappings?: MappingRow[];
  testResult?: { size: string; confidence: number };
}> {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  const settingsRepo = (prisma as unknown as Record<string, unknown>).sizePredictSettings as
    | undefined
    | { upsert: (args: object) => Promise<unknown> };

  if (intent === "toggle") {
    if (!settingsRepo) return { ok: false, error: "Run npm run setup to update the database." };
    const enabled = formData.get("widgetEnabled") === "true";
    await settingsRepo.upsert({
      where: { shop },
      create: { shop, widgetEnabled: enabled },
      update: { widgetEnabled: enabled },
    });
    return { ok: true };
  }

  if (intent === "saveSettings") {
    if (!settingsRepo) return { ok: false, error: "Run npm run setup to update the database." };
    const payload = {
      buttonLabel: String(formData.get("buttonLabel") ?? "Find my size"),
      helperText: String(formData.get("helperText") ?? "Suggest the best size for you"),
      heightUnit: String(formData.get("heightUnit") ?? "cm"),
      weightUnit: String(formData.get("weightUnit") ?? "kg"),
      autoSelectSize: formData.get("autoSelectSize") === "true",
    };
    await settingsRepo.upsert({
      where: { shop },
      create: { shop, ...payload },
      update: payload,
    });
    return { ok: true };
  }

  if (intent === "createRule" || intent === "updateRule") {
    const id = formData.get("ruleId")?.toString();
    const name = formData.get("name")?.toString()?.trim() ?? "";
    const scopeType = formData.get("scopeType")?.toString() ?? "all";
    const scopeValue = formData.get("scopeValue")?.toString()?.trim() || null;
    const chartJson = formData.get("chart")?.toString();
    if (!name || !chartJson) return { ok: false, error: "Missing name or mapping" };
    let mappings: MappingRow[];
    try {
      mappings = JSON.parse(chartJson) as MappingRow[];
    } catch {
      return { ok: false, error: "Invalid mapping data" };
    }
    const valid = mappings.filter(
      (m) =>
        m.sizeName?.trim() &&
        Number.isFinite(Number(m.heightMin)) &&
        Number.isFinite(Number(m.heightMax)) &&
        Number.isFinite(Number(m.weightMin)) &&
        Number.isFinite(Number(m.weightMax))
    );
    if (valid.length === 0) return { ok: false, error: "Add at least one size mapping" };

    const savedMappings: MappingRow[] = valid.map((m) => ({
      sizeName: m.sizeName.trim(),
      heightMin: Number(m.heightMin),
      heightMax: Number(m.heightMax),
      weightMin: Number(m.weightMin),
      weightMax: Number(m.weightMax),
    }));

    const err = requireRuleRepos();
    if (!err.ok) return err;
    const { ruleRepo: r, mappingRepo: m } = err;

    if (intent === "updateRule" && id) {
      await prisma.$transaction(async (tx) => {
        const txRecord = tx as unknown as Record<string, unknown>;
        const tr = txRecord.sizePredictRule as typeof r;
        const tm = txRecord.sizePredictRuleMapping as typeof m;
        if (!tr?.update || !tm?.deleteMany || !tm?.createMany) throw new Error("Database models not available. Run: npm run setup");
        await tm.deleteMany({ where: { ruleId: id } });
        await tr.update({
          where: { id },
          data: { name, scopeType, scopeValue },
        });
        await tm.createMany({
          data: savedMappings.map((row) => ({
            ruleId: id,
            sizeName: row.sizeName,
            heightMin: row.heightMin,
            heightMax: row.heightMax,
            weightMin: row.weightMin,
            weightMax: row.weightMax,
          })),
        });
      });
    } else {
      const rule = await r.create({
        data: { shop, name, scopeType, scopeValue, status: "active" },
      });
      await m.createMany({
        data: savedMappings.map((row) => ({
          ruleId: rule.id,
          sizeName: row.sizeName,
          heightMin: row.heightMin,
          heightMax: row.heightMax,
          weightMin: row.weightMin,
          weightMax: row.weightMax,
        })),
      });
    }
    return { ok: true, savedMappings };
  }

  if (intent === "deleteRule") {
    const id = formData.get("ruleId")?.toString();
    if (id) {
      const repos = requireRuleRepos();
      if (!repos.ok) return repos;
      await repos.ruleRepo.deleteMany({ where: { id, shop } });
    }
    return { ok: true };
  }

  if (intent === "duplicateRule") {
    const repos = requireRuleRepos();
    if (!repos.ok) return repos;
    const sourceId = formData.get("ruleId")?.toString();
    if (!sourceId) return { ok: false, error: "Missing ruleId" };
    const source = await repos.ruleRepo.findUnique({
      where: { id: sourceId, shop },
      include: { mappings: true },
    } as Parameters<typeof repos.ruleRepo.findUnique>[0]);
    if (!source?.mappings?.length) return { ok: false, error: "Rule not found or has no mappings" };
    const name = `Copy of ${source.name}`;
    const rule = await repos.ruleRepo.create({
      data: { shop, name, scopeType: source.scopeType, scopeValue: source.scopeValue ?? null, status: "active" },
    });
    await repos.mappingRepo.createMany({
      data: source.mappings.map((row: MappingRow) => ({
        ruleId: rule.id,
        sizeName: row.sizeName,
        heightMin: row.heightMin,
        heightMax: row.heightMax,
        weightMin: row.weightMin,
        weightMax: row.weightMax,
      })),
    });
    return { ok: true };
  }

  if (intent === "bulkCreateRules") {
    const json = formData.get("groups")?.toString();
    if (!json) return { ok: false, error: "Missing groups data" };
    const repos = requireRuleRepos();
    if (!repos.ok) return repos;
    let groups: Array<{ name: string; scopeType: string; scopeValue: string | null; mappings: MappingRow[] }>;
    try {
      groups = JSON.parse(json) as typeof groups;
    } catch {
      return { ok: false, error: "Invalid JSON" };
    }
    for (const g of groups) {
      const name = (g.name ?? "").toString().trim() || "Imported group";
      const scopeType = (g.scopeType ?? "all").toString();
      const scopeValue = (g.scopeValue ?? "").toString().trim() || null;
      const valid = (g.mappings ?? []).filter(
        (m: MappingRow) =>
          m.sizeName?.trim() &&
          Number.isFinite(Number(m.heightMin)) &&
          Number.isFinite(Number(m.heightMax)) &&
          Number.isFinite(Number(m.weightMin)) &&
          Number.isFinite(Number(m.weightMax))
      );
      if (valid.length === 0) continue;
      const rule = await repos.ruleRepo.create({
        data: { shop, name, scopeType, scopeValue, status: "active" },
      });
      await repos.mappingRepo.createMany({
        data: valid.map((m: MappingRow) => ({
          ruleId: rule.id,
          sizeName: m.sizeName.trim(),
          heightMin: Number(m.heightMin),
          heightMax: Number(m.heightMax),
          weightMin: Number(m.weightMin),
          weightMax: Number(m.weightMax),
        })),
      });
    }
    return { ok: true };
  }

  if (intent === "toggleRule") {
    const id = formData.get("ruleId")?.toString();
    const status = formData.get("status")?.toString() === "active" ? "disabled" : "active";
    if (id) {
      const repos = requireRuleRepos();
      if (!repos.ok) return repos;
      await repos.ruleRepo.updateMany({ where: { id, shop }, data: { status } });
    }
    return { ok: true };
  }

  if (intent === "testPrediction") {
    const repos = requireRuleRepos();
    if (!repos.ok) return repos;
    const height = parseFloat(formData.get("height")?.toString() ?? "");
    const weight = parseFloat(formData.get("weight")?.toString() ?? "");
    const productId = formData.get("productId")?.toString() || null;
    if (!Number.isFinite(height) || !Number.isFinite(weight))
      return { ok: false, error: "Invalid height or weight", testResult: undefined };
    const rulesList = await repos.ruleRepo.findMany({
      where: { shop, status: "active" },
      include: { mappings: true },
      orderBy: { createdAt: "asc" },
    } as Parameters<typeof repos.ruleRepo.findMany>[0]);
    if (!rulesList?.length) return { ok: false, error: "Rules not available", testResult: undefined };

    type MapEntry = { sizeName: string; heightMin: number; heightMax: number; weightMin: number; weightMax: number };
    let entries: MapEntry[] = [];
    for (const r of rulesList) {
      let match = false;
      if (r.scopeType === "all") match = true;
      else if (r.scopeType === "product" && r.scopeValue === productId) match = true;
      else if (r.scopeType === "product_type" && r.scopeValue) match = true;
      else if (r.scopeType === "collection" && r.scopeValue) match = true;
      else if (r.scopeType === "manual" && r.scopeValue && productId) {
        try {
          const ids = JSON.parse(r.scopeValue) as string[];
          match = Array.isArray(ids) && ids.includes(productId);
        } catch {
          match = false;
        }
      }
      if (match) {
        entries = r.mappings.map((m: MapEntry) => ({
          sizeName: m.sizeName,
          heightMin: m.heightMin,
          heightMax: m.heightMax,
          weightMin: m.weightMin,
          weightMax: m.weightMax,
        }));
        break;
      }
    }
    if (entries.length === 0 && rulesList.length > 0) {
      entries = rulesList[0].mappings.map((m: MapEntry) => ({
        sizeName: m.sizeName,
        heightMin: m.heightMin,
        heightMax: m.heightMax,
        weightMin: m.weightMin,
        weightMax: m.weightMax,
      }));
    }
    const result = getSuggestedSize(entries, height, weight);
    return { ok: true, testResult: result };
  }

  return { ok: false, error: "Unknown intent" };
}
