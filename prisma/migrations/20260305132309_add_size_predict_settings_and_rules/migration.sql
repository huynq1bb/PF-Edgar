-- CreateTable
CREATE TABLE "SizePredictSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "widgetEnabled" BOOLEAN NOT NULL DEFAULT true,
    "buttonLabel" TEXT NOT NULL DEFAULT 'Find my size',
    "helperText" TEXT NOT NULL DEFAULT 'Let AI suggest the best size for you',
    "heightUnit" TEXT NOT NULL DEFAULT 'cm',
    "weightUnit" TEXT NOT NULL DEFAULT 'kg',
    "autoSelectSize" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SizePredictRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopeType" TEXT NOT NULL,
    "scopeValue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SizePredictRuleMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "sizeName" TEXT NOT NULL,
    "heightMin" REAL NOT NULL,
    "heightMax" REAL NOT NULL,
    "weightMin" REAL NOT NULL,
    "weightMax" REAL NOT NULL,
    CONSTRAINT "SizePredictRuleMapping_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SizePredictRule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SizePredictSettings_shop_key" ON "SizePredictSettings"("shop");

-- CreateIndex
CREATE INDEX "SizePredictRule_shop_idx" ON "SizePredictRule"("shop");

-- CreateIndex
CREATE INDEX "SizePredictRuleMapping_ruleId_idx" ON "SizePredictRuleMapping"("ruleId");
