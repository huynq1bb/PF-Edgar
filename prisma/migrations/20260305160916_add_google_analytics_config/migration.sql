-- CreateTable
CREATE TABLE "GoogleAnalyticsConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "measurementId" TEXT NOT NULL,
    "propertyName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleAnalyticsConfig_shop_key" ON "GoogleAnalyticsConfig"("shop");
