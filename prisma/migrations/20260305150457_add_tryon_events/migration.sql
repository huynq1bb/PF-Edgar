-- CreateTable (IF NOT EXISTS so migration is safe when table already exists)
CREATE TABLE IF NOT EXISTS "TryOnEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT,
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS "TryOnEvent_shop_eventType_createdAt_idx" ON "TryOnEvent"("shop", "eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "TryOnEvent_shop_productId_eventType_idx" ON "TryOnEvent"("shop", "productId", "eventType");
