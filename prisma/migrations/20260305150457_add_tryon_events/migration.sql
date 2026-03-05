-- CreateTable
CREATE TABLE "TryOnEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "productId" TEXT,
    "productTitle" TEXT,
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TryOnEvent_shop_eventType_createdAt_idx" ON "TryOnEvent"("shop", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "TryOnEvent_shop_productId_eventType_idx" ON "TryOnEvent"("shop", "productId", "eventType");
