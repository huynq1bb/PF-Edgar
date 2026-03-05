-- CreateTable
CREATE TABLE "CrossSellRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerValue" TEXT NOT NULL,
    "filterCollectionId" TEXT,
    "filterPriceMin" REAL,
    "filterPriceMax" REAL,
    "filterTags" TEXT,
    "maxRecommendations" INTEGER NOT NULL DEFAULT 3,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "CrossSellRule_shop_enabled_idx" ON "CrossSellRule"("shop", "enabled");
