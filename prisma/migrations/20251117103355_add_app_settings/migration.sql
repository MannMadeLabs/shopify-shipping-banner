-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "freeShippingThreshold" REAL NOT NULL DEFAULT 50.0,
    "progressColor" TEXT NOT NULL DEFAULT '#10b981',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f9fafb',
    "textColor" TEXT NOT NULL DEFAULT '#111827',
    "showUpsell" BOOLEAN NOT NULL DEFAULT true,
    "upsellProductCount" INTEGER NOT NULL DEFAULT 2,
    "belowThresholdMessage" TEXT NOT NULL DEFAULT 'Add {amount} more for free shipping!',
    "qualifiedMessage" TEXT NOT NULL DEFAULT '🎉 You qualify for free shipping!',
    "upsellTitle" TEXT NOT NULL DEFAULT 'Add these to reach free shipping:',
    "enableAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");
