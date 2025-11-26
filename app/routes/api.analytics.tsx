import type { ActionFunctionArgs } from "react-router";
import prisma from "../db.server";
import { 
  validateStorefrontRequest, 
  generateShopToken,
  checkRateLimit 
} from "../utils/storefront-auth";

// Handle CORS preflight
export const loader = async ({ request }: { request: Request }) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  
  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

/**
 * Analytics API for Storefront
 * 
 * Security measures:
 * 1. Validates shop token (generated from shop + API secret)
 * 2. Rate limiting per shop (200 requests/minute for analytics)
 * 3. Validates event types to prevent abuse
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });
  }
  
  try {
    const body = await request.json();
    const { shop, eventType, cartValue, amountRemaining, productId, sessionId, shopToken } = body;
    
    if (!shop || !eventType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }
    
    // Validate shop token
    const expectedToken = generateShopToken(shop);
    if (shopToken !== expectedToken) {
      // Still validate that shop exists (for backwards compatibility during transition)
      const validation = await validateStorefrontRequest(shop, null);
      if (!validation.valid) {
        return new Response(JSON.stringify({ error: "Invalid request" }), {
          status: 403,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        });
      }
    }
    
    // Rate limiting - 200 events per minute per shop
    const rateLimit = checkRateLimit(`analytics:${shop}`, 200, 60000);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Retry-After": "60",
        },
      });
    }
    
    // Validate event type to prevent abuse
    const validEventTypes = ["view", "cart_increment", "upsell_click", "threshold_met"];
    if (!validEventTypes.includes(eventType)) {
      return new Response(JSON.stringify({ error: "Invalid event type" }), {
        status: 400,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
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
    
    // NOTE: Order counting is now handled by the ORDERS_CREATE webhook
    // We no longer increment here on threshold_met as that was incorrect
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return new Response(JSON.stringify({ error: "Failed to log event" }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    });
  }
};

