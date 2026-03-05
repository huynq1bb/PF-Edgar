-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CrossSellRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL DEFAULT 'product',
    "triggerValue" TEXT NOT NULL,
    "suggestedProductId1" TEXT,
    "suggestedProductId2" TEXT,
    "suggestedProductId3" TEXT,
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
INSERT INTO "new_CrossSellRule" ("createdAt", "enabled", "filterCollectionId", "filterPriceMax", "filterPriceMin", "filterTags", "id", "maxRecommendations", "name", "priority", "shop", "triggerType", "triggerValue", "updatedAt") SELECT "createdAt", "enabled", "filterCollectionId", "filterPriceMax", "filterPriceMin", "filterTags", "id", "maxRecommendations", "name", "priority", "shop", "triggerType", "triggerValue", "updatedAt" FROM "CrossSellRule";
DROP TABLE "CrossSellRule";
ALTER TABLE "new_CrossSellRule" RENAME TO "CrossSellRule";
CREATE INDEX "CrossSellRule_shop_enabled_idx" ON "CrossSellRule"("shop", "enabled");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
