import prisma from "./db.server";

export type TrendPeriod = "daily" | "weekly";

export interface TryOnAnalyticsKPIs {
  tryOnSessions: number;
  addToCartAfterTryOn: number;
  conversionRate: number; // 0-100
}

export interface TrendPoint {
  label: string; // "2025-03-01" or "Week 10"
  tryOnSessions: number;
  addToCart: number;
  conversionRate: number;
}

export interface TopProductRow {
  productId: string | null;
  productTitle: string;
  tryOnCount: number;
  addToCartCount: number;
  conversionRate: number;
}

function getDateRange(period: TrendPeriod, daysBack: number): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  from.setDate(from.getDate() - daysBack);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

export async function getTryOnKPIs(
  shop: string,
  from: Date,
  to: Date
): Promise<TryOnAnalyticsKPIs> {
  const model = prisma.tryOnEvent;
  if (!model) {
    return { tryOnSessions: 0, addToCartAfterTryOn: 0, conversionRate: 0 };
  }
  const [tryOnSessions, addToCartAfterTryOn] = await Promise.all([
    model.count({
      where: {
        shop,
        eventType: "try_on_completed",
        createdAt: { gte: from, lte: to },
      },
    }),
    model.count({
      where: {
        shop,
        eventType: "add_to_cart_after_try_on",
        createdAt: { gte: from, lte: to },
      },
    }),
  ]);

  const conversionRate =
    tryOnSessions > 0 ? (addToCartAfterTryOn / tryOnSessions) * 100 : 0;

  return {
    tryOnSessions,
    addToCartAfterTryOn,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

export async function getTryOnTrend(
  shop: string,
  period: TrendPeriod,
  daysBack: number = 30
): Promise<TrendPoint[]> {
  const { from, to } = getDateRange(period, daysBack);

  const model = prisma.tryOnEvent;
  if (!model) {
    return [];
  }
  const events = await model.findMany({
    where: {
      shop,
      eventType: { in: ["try_on_completed", "add_to_cart_after_try_on"] },
      createdAt: { gte: from, lte: to },
    },
    select: { eventType: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const buckets = new Map<
    string,
    { tryOn: number; addToCart: number }
  >();

  for (const e of events) {
    const d = new Date(e.createdAt);
    const key =
      period === "daily"
        ? d.toISOString().slice(0, 10)
        : `W${getWeekNumber(d)}-${d.getFullYear()}`;
    if (!buckets.has(key)) buckets.set(key, { tryOn: 0, addToCart: 0 });
    const b = buckets.get(key)!;
    if (e.eventType === "try_on_completed") b.tryOn += 1;
    else b.addToCart += 1;
  }

  const keys = Array.from(buckets.keys()).sort();
  return keys.map((label) => {
    const b = buckets.get(label)!;
    const conversionRate =
      b.tryOn > 0 ? (b.addToCart / b.tryOn) * 100 : 0;
    return {
      label,
      tryOnSessions: b.tryOn,
      addToCart: b.addToCart,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  });
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor(
    (d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)
  );
  return Math.ceil((days + start.getDay() + 1) / 7);
}

export async function getTopProductsTryOn(
  shop: string,
  from: Date,
  to: Date,
  limit: number = 10
): Promise<TopProductRow[]> {
  const model = prisma.tryOnEvent;
  if (!model) {
    return [];
  }
  const completed = await model.findMany({
    where: {
      shop,
      eventType: "try_on_completed",
      createdAt: { gte: from, lte: to },
      productId: { not: null },
    },
    select: { productId: true, productTitle: true },
  });

  const addToCart = await model.findMany({
    where: {
      shop,
      eventType: "add_to_cart_after_try_on",
      createdAt: { gte: from, lte: to },
      productId: { not: null },
    },
    select: { productId: true },
  });

  const tryOnByProduct = new Map<string, { title: string | null; count: number }>();
  for (const e of completed) {
    const id = e.productId ?? "";
    if (!id) continue;
    const existing = tryOnByProduct.get(id);
    if (existing) {
      existing.count += 1;
    } else {
      tryOnByProduct.set(id, { title: e.productTitle, count: 1 });
    }
  }

  const addToCartByProduct = new Map<string, number>();
  for (const e of addToCart) {
    const id = e.productId!;
    addToCartByProduct.set(id, (addToCartByProduct.get(id) ?? 0) + 1);
  }

  const rows: TopProductRow[] = [];
  for (const [productId, { title, count: tryOnCount }] of tryOnByProduct) {
    const addToCartCount = addToCartByProduct.get(productId) ?? 0;
    const conversionRate =
      tryOnCount > 0 ? (addToCartCount / tryOnCount) * 100 : 0;
    rows.push({
      productId,
      productTitle: title ?? productId,
      tryOnCount,
      addToCartCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
    });
  }

  rows.sort((a, b) => b.tryOnCount - a.tryOnCount);
  return rows.slice(0, limit);
}
