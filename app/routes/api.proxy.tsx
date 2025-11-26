/**
 * App Proxy Handler
 * 
 * This handles requests that come through Shopify's App Proxy.
 * Requests to /apps/shipping-bar/* are proxied to this endpoint.
 * 
 * App Proxy automatically includes shop domain and HMAC signature
 * in the request, making it secure by default.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import prisma from "../db.server";
import crypto from "crypto";
import { isOrderLimitExceeded } from "../config/billing";
import { generateShopToken } from "../utils/storefront-auth";

/**
 * Verify that the request came through Shopify's App Proxy
 */
function verifyAppProxyRequest(request: Request): { valid: boolean; shop: string | null } {
  const url = new URL(request.url);
  
  // Get parameters that Shopify sends
  const shop = url.searchParams.get("shop");
  const signature = url.searchParams.get("signature");
  const timestamp = url.searchParams.get("timestamp");
  const pathPrefix = url.searchParams.get("path_prefix");
  
  if (!shop || !signature) {
    return { valid: false, shop: null };
  }
  
  // Build the query string for verification (alphabetically sorted, excluding signature)
  const params = Array.from(url.searchParams.entries())
    .filter(([key]) => key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("");
  
  // Calculate expected signature
  const secret = process.env.SHOPIFY_API_SECRET || "";
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(params)
    .digest("hex");
  
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
  
  return { valid, shop: valid ? shop : null };
}

/**
 * GET /api/proxy - Serve settings through App Proxy
 * This is the secure way for the storefront to get settings
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "settings";
  
  // Verify the request came through App Proxy
  const { valid, shop } = verifyAppProxyRequest(request);
  
  if (!valid || !shop) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  
  if (action === "settings") {
    return getSettings(shop);
  }
  
  return new Response(
    JSON.stringify({ error: "Unknown action" }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
};

/**
 * POST /api/proxy - Handle analytics through App Proxy
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  // Verify the request came through App Proxy
  const { valid, shop } = verifyAppProxyRequest(request);
  
  if (!valid || !shop) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  
  try {
    const body = await request.json();
    const { eventType, cartValue, amountRemaining, productId, sessionId } = body;
    
    if (!eventType) {
      return new Response(
        JSON.stringify({ error: "Missing eventType" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Validate event type
    const validEventTypes = ["view", "cart_increment", "upsell_click", "threshold_met"];
    if (!validEventTypes.includes(eventType)) {
      return new Response(
        JSON.stringify({ error: "Invalid event type" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Create analytics event
    await prisma.analyticsEvent.create({
      data: {
        shop,
        eventType,
        cartValue: cartValue ? parseFloat(String(cartValue)) : null,
        amountRemaining: amountRemaining ? parseFloat(String(amountRemaining)) : null,
        productId: productId ? String(productId) : null,
        sessionId: sessionId ? String(sessionId) : null,
      },
    });
    
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[Proxy] Analytics error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to log event" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * Get settings for a shop
 */
async function getSettings(shop: string) {
  const settings = await prisma.appSettings.findUnique({
    where: { shop },
  });
  
  // Default settings if none exist
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
      }),
      {
        headers: {
          "Content-Type": "application/json",
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
      where: { shop },
      data: {
        ordersThisMonth: 0,
        billingCycleStart: now,
      },
    });
    ordersThisMonth = 0;
  }
  
  const plan = settings.plan || "FREE";
  const limitExceeded = isOrderLimitExceeded(plan, ordersThisMonth);
  
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
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}

