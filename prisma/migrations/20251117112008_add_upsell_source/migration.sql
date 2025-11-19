-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "freeShippingThreshold" REAL NOT NULL DEFAULT 50.0,
    "progressColor" TEXT NOT NULL DEFAULT '#10b981',
    "backgroundColor" TEXT NOT NULL DEFAULT '#f9fafb',
    "textColor" TEXT NOT NULL DEFAULT '#111827',
    "showUpsell" BOOLEAN NOT NULL DEFAULT true,
    "upsellProductCount" INTEGER NOT NULL DEFAULT 2,
    "upsellSource" TEXT NOT NULL DEFAULT 'recommendations',
    "curatedProductIds" TEXT NOT NULL DEFAULT '',
    "belowThresholdMessage" TEXT NOT NULL DEFAULT 'Add {amount} more for free shipping!',
    "qualifiedMessage" TEXT NOT NULL DEFAULT '🎉 You qualify for free shipping!',
    "upsellTitle" TEXT NOT NULL DEFAULT 'Add these to reach free shipping:',
    "enableAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSettings" ("backgroundColor", "belowThresholdMessage", "createdAt", "enableAnalytics", "freeShippingThreshold", "id", "progressColor", "qualifiedMessage", "shop", "showUpsell", "textColor", "updatedAt", "upsellProductCount", "upsellTitle") SELECT "backgroundColor", "belowThresholdMessage", "createdAt", "enableAnalytics", "freeShippingThreshold", "id", "progressColor", "qualifiedMessage", "shop", "showUpsell", "textColor", "updatedAt", "upsellProductCount", "upsellTitle" FROM "AppSettings";
DROP TABLE "AppSettings";
ALTER TABLE "new_AppSettings" RENAME TO "AppSettings";
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
