/**
 * Orders Create Webhook Handler
 * 
 * Tracks actual orders placed for billing limit enforcement.
 * This replaces the incorrect threshold_met tracking.
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[Webhook] Received ${topic} webhook for ${shop}`);

  try {
    // Get order details from payload
    const order = payload as {
      id: number;
      order_number: number;
      total_price: string;
      currency: string;
      created_at: string;
    };

    console.log(`[Webhook] Order #${order.order_number} created for ${shop} - Total: ${order.total_price} ${order.currency}`);

    // Increment order count for this shop
    const result = await db.appSettings.updateMany({
      where: { shop },
      data: {
        ordersThisMonth: { increment: 1 },
      },
    });

    if (result.count === 0) {
      // Shop doesn't have settings yet - this shouldn't happen normally
      // but handle gracefully
      console.warn(`[Webhook] No settings found for ${shop} - creating with order count 1`);
      await db.appSettings.create({
        data: {
          shop,
          ordersThisMonth: 1,
          billingCycleStart: new Date(),
        },
      });
    }

    // Log analytics event for the order
    await db.analyticsEvent.create({
      data: {
        shop,
        eventType: "order_created",
        cartValue: parseFloat(order.total_price),
        productId: String(order.id),
        sessionId: `order_${order.order_number}`,
      },
    });

    console.log(`[Webhook] Successfully processed order for ${shop}`);
  } catch (error) {
    console.error(`[Webhook] Error processing order for ${shop}:`, error);
    // Still return 200 to acknowledge the webhook
  }

  return new Response();
};

