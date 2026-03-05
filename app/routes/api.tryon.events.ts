import type { ActionFunctionArgs } from "react-router";
import prisma from "../db.server";

const VALID_EVENT_TYPES = [
  "try_on_started",
  "try_on_completed",
  "add_to_cart_after_try_on",
] as const;

function normalizeShop(shop: string): string {
  const s = shop.trim().toLowerCase();
  if (!s) return "";
  return s.includes(".myshopify.com") ? s : `${s}.myshopify.com`;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    shop?: string;
    eventType?: string;
    productId?: string | null;
    productTitle?: string | null;
    sessionId?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const shop = normalizeShop(body.shop ?? "");
  if (!shop) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid shop" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const eventType = body.eventType;
  if (!eventType || !VALID_EVENT_TYPES.includes(eventType as (typeof VALID_EVENT_TYPES)[number])) {
    return new Response(
      JSON.stringify({
        error: "Missing or invalid eventType",
        valid: VALID_EVENT_TYPES,
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Only allow events for shops that have the app installed (have a session)
  const sessionExists = await prisma.session.findFirst({
    where: { shop },
    select: { id: true },
  });
  if (!sessionExists) {
    return new Response(
      JSON.stringify({ error: "Shop not found or app not installed" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  await prisma.tryOnEvent.create({
    data: {
      shop,
      eventType,
      productId: body.productId ?? null,
      productTitle: body.productTitle ?? null,
      sessionId: body.sessionId ?? null,
    },
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
