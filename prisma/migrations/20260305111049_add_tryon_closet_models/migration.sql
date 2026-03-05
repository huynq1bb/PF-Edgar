-- CreateTable
CREATE TABLE "TryOnSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopperId" TEXT,
    "anonymousId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device" TEXT,
    "source" TEXT,
    "modeFirst" TEXT,
    "modeLast" TEXT,
    "completedStage" TEXT
);

-- CreateTable
CREATE TABLE "TryOnEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" TEXT NOT NULL,
    "productId" TEXT,
    "mode" TEXT,
    "stage" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TryOnEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TryOnSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClosetItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopperId" TEXT,
    "anonymousId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "category" TEXT,
    "title" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ClosetLook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopperId" TEXT,
    "anonymousId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedToCartAt" DATETIME,
    "purchasedAt" DATETIME
);

-- CreateTable
CREATE TABLE "ClosetLookItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lookId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ClosetLookItem_lookId_fkey" FOREIGN KEY ("lookId") REFERENCES "ClosetLook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TryOnConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "defaultMode" TEXT NOT NULL DEFAULT 'portrait',
    "enabledCollections" TEXT,
    "enabledProductIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TryOnOverlayAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "mode" TEXT NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TryOnConfig_shop_key" ON "TryOnConfig"("shop");
