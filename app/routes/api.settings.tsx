import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db.server";
import { isOrderLimitExceeded, getOrderLimit } from "../config/billing";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Get shop domain from the request
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  
  if (!shop) {
    return new Response(JSON.stringify({ error: "Shop parameter required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // Fetch settings for this shop
  let settings = await prisma.appSettings.findUnique({
    where: { shop },
  });
  
  // If no settings exist, return defaults
  if (!settings) {
    settings = {
      id: "",
      shop,
      freeShippingThreshold: 50.0,
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  
  // Check order limit
  const plan = (settings as any).plan || "FREE";
  const ordersThisMonth = (settings as any).ordersThisMonth || 0;
  const limitExceeded = isOrderLimitExceeded(plan, ordersThisMonth);
  
  // Return public settings (exclude internal fields)
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
      plan, // Include plan for branding badge
      limitExceeded, // Include limit status
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    }
  );
};

