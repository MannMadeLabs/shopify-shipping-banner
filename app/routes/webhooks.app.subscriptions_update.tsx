/**
 * App Subscriptions Update Webhook Handler
 * 
 * Handles subscription status changes (activated, cancelled, expired, etc.)
 * This ensures the plan is always in sync with Shopify's billing state.
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { BILLING_PLANS } from "../config/billing";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[Webhook] Received ${topic} webhook for ${shop}`);

  try {
    const subscription = payload as {
      app_subscription: {
        id: string;
        name: string;
        status: string;
        admin_graphql_api_id: string;
      };
    };

    const { id, name, status } = subscription.app_subscription;
    
    console.log(`[Webhook] Subscription update for ${shop}: ${name} - Status: ${status}`);

    // Determine the plan from the subscription name
    let plan: "FREE" | "PRO" | "PLUS" = "FREE";
    
    if (name.toLowerCase().includes("plus")) {
      plan = "PLUS";
    } else if (name.toLowerCase().includes("pro")) {
      plan = "PRO";
    }

    // Handle different subscription statuses
    switch (status.toUpperCase()) {
      case "ACTIVE":
        // Subscription is active - update plan
        await db.appSettings.upsert({
          where: { shop },
          update: {
            plan,
            subscriptionId: id,
            subscriptionStatus: "active",
          },
          create: {
            shop,
            plan,
            subscriptionId: id,
            subscriptionStatus: "active",
            billingCycleStart: new Date(),
          },
        });
        console.log(`[Webhook] Activated ${plan} plan for ${shop}`);
        break;

      case "CANCELLED":
      case "EXPIRED":
      case "DECLINED":
        // Subscription ended - revert to free plan
        await db.appSettings.updateMany({
          where: { shop },
          data: {
            plan: "FREE",
            subscriptionStatus: status.toLowerCase(),
            subscriptionId: null,
          },
        });
        console.log(`[Webhook] Reverted ${shop} to FREE plan (${status})`);
        break;

      case "FROZEN":
        // Payment failed - keep plan but mark as frozen
        await db.appSettings.updateMany({
          where: { shop },
          data: {
            subscriptionStatus: "frozen",
          },
        });
        console.log(`[Webhook] Subscription frozen for ${shop}`);
        break;

      case "PENDING":
        // Awaiting approval - no action needed
        console.log(`[Webhook] Subscription pending for ${shop}`);
        break;

      default:
        console.log(`[Webhook] Unknown subscription status: ${status}`);
    }

  } catch (error) {
    console.error(`[Webhook] Error processing subscription update for ${shop}:`, error);
    // Still return 200 to acknowledge the webhook
  }

  return new Response();
};

