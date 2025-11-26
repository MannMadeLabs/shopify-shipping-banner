import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { isOrderLimitExceeded } from "../config/billing";
import { 
  validateStorefrontRequest, 
  generateShopToken,
  checkRateLimit 
} from "../utils/storefront-auth";

/**
 * Public Settings API for Storefront
 * 
 * Security measures:
 * 1. Validates shop exists in our database (has installed app)
 * 2. Rate limiting per shop (100 requests/minute)
 * 3. Only returns public settings (no sensitive data)
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const token = url.searchParams.get("token");
  
  // Validate the request
  const validation = await validateStorefrontRequest(shop, token);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
  
  // Rate limiting - 100 requests per minute per shop
  const rateLimit = checkRateLimit(`settings:${shop}`, 100, 60000);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded" }),
      {
        status: 429,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Retry-After": "60",
        },
      }
    );
  }
  
  // Fetch settings for this shop
  const settings = await prisma.appSettings.findUnique({
    where: { shop: shop! },
  });
  
  // If no settings exist, return defaults
  if (!settings) {
    return new Response(
      JSON.stringify({
        threshold: 50.0,
        progressColor: "#10b981",
        backgroundColor: "#f9fafb",
        textColor: "#111827",
        showUpsell: true,
        upsellProductCount: 2,
        upsellSource: "recommendations",
        curatedProductIds: "",
        belowThresholdMessage: "Add {amount} more for free shipping!",
        qualifiedMessage: "🎉 You qualify for free shipping!",
        upsellTitle: "Add these to reach free shipping:",
        enableAnalytics: true,
        plan: "FREE",
        limitExceeded: false,
        shopToken: generateShopToken(shop!),
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  }
  
  // Check billing cycle and reset if needed
  const now = new Date();
  const cycleStart = settings.billingCycleStart || settings.createdAt;
  const daysSinceCycleStart = (now.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24);
  
  let ordersThisMonth = settings.ordersThisMonth;
  
  // Reset order count if billing cycle has passed (30 days)
  if (daysSinceCycleStart >= 30) {
    await prisma.appSettings.update({
      where: { shop: shop! },
      data: {
        ordersThisMonth: 0,
        billingCycleStart: now,
      },
    });
    ordersThisMonth = 0;
  }
  
  const plan = settings.plan || "FREE";
  const limitExceeded = isOrderLimitExceeded(plan, ordersThisMonth);
  
  // Return public settings (exclude internal fields like subscriptionId)
  return new Response(
    JSON.stringify({
      threshold: settings.freeShippingThreshold,
      progressColor: settings.progressColor,
      backgroundColor: settings.backgroundColor,
      textColor: settings.textColor,
      showUpsell: settings.showUpsell,
      upsellProductCount: settings.upsellProductCount,
      upsellSource: settings.upsellSource,
      curatedProductIds: settings.curatedProductIds,
      belowThresholdMessage: settings.belowThresholdMessage,
      qualifiedMessage: settings.qualifiedMessage,
      upsellTitle: settings.upsellTitle,
      enableAnalytics: settings.enableAnalytics,
      plan,
      limitExceeded,
      // Include shop token for analytics requests
      shopToken: generateShopToken(shop!),
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    }
  );
};

