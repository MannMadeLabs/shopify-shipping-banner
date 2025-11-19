-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "freeShippingThreshold" DOUBLE PRECISION NOT NULL DEFAULT 50,
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
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "ordersThisMonth" INTEGER NOT NULL DEFAULT 0,
    "billingCycleStart" TIMESTAMP(3),
    "subscriptionId" TEXT,
    "subscriptionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "cartValue" DOUBLE PRECISION,
    "amountRemaining" DOUBLE PRECISION,
    "productId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_shop_createdAt_idx" ON "AnalyticsEvent"("shop", "createdAt");

