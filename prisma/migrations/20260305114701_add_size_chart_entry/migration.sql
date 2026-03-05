-- CreateTable
CREATE TABLE "SizeChartEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sizeName" TEXT NOT NULL,
    "heightMin" REAL NOT NULL,
    "heightMax" REAL NOT NULL,
    "weightMin" REAL NOT NULL,
    "weightMax" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SizeChartEntry_shop_idx" ON "SizeChartEntry"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "SizeChartEntry_shop_sizeName_key" ON "SizeChartEntry"("shop", "sizeName");
