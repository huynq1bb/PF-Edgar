import prisma from "./db.server";

export interface GaConfig {
  measurementId: string;
  propertyName: string | null;
}

export async function getGaConfig(shop: string): Promise<GaConfig | null> {
  const model = prisma.googleAnalyticsConfig;
  if (!model) return null;
  const row = await model.findUnique({
    where: { shop },
    select: { measurementId: true, propertyName: true },
  });
  return row ? { measurementId: row.measurementId, propertyName: row.propertyName } : null;
}

export async function setGaConfig(
  shop: string,
  measurementId: string,
  propertyName?: string | null
): Promise<GaConfig> {
  const model = prisma.googleAnalyticsConfig;
  if (!model) throw new Error("GoogleAnalyticsConfig model not found");
  const id = measurementId.trim().toUpperCase();
  if (!id || !id.startsWith("G-")) {
    throw new Error("Invalid Measurement ID. Use GA4 format, e.g. G-XXXXXXX");
  }
  const row = await model.upsert({
    where: { shop },
    create: { shop, measurementId: id, propertyName: propertyName ?? null },
    update: { measurementId: id, propertyName: propertyName ?? null },
  });
  return { measurementId: row.measurementId, propertyName: row.propertyName };
}

export async function disconnectGa(shop: string): Promise<void> {
  const model = prisma.googleAnalyticsConfig;
  if (!model) return;
  await model.deleteMany({ where: { shop } });
}

export async function getLastTryOnEventAt(shop: string): Promise<Date | null> {
  const model = prisma.tryOnEvent;
  if (!model) return null;
  const last = await model.findFirst({
    where: { shop },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last?.createdAt ?? null;
}

export async function getTryOnEventsCountToday(shop: string): Promise<number> {
  const model = prisma.tryOnEvent;
  if (!model) return 0;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return model.count({
    where: { shop, createdAt: { gte: start } },
  });
}
