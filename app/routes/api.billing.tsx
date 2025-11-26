/**
 * Billing API Endpoint
 * Handles subscription creation, cancellation, and status checks
 */

import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { createSubscription, cancelSubscription, getActiveSubscription } from "../services/billing.server";
import prisma from "../db.server";

/**
 * GET /api/billing - Check subscription status
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  try {
    // Get active subscription from Shopify
    const subscription = await getActiveSubscription(admin);

    // Get app settings to see current plan
    const settings = await prisma.appSettings.findUnique({
      where: { shop: session.shop },
    });

    return new Response(
      JSON.stringify({
        success: true,
        subscription,
        currentPlan: settings?.plan || "FREE",
        ordersThisMonth: settings?.ordersThisMonth || 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error checking billing status:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * POST /api/billing - Create or cancel subscription
 */
export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);

  try {
    const formData = await request.formData();
    const action = formData.get("action");
    const plan = formData.get("plan") as "PRO" | "PLUS";

    if (action === "create") {
      // Create new subscription
      if (!plan || (plan !== "PRO" && plan !== "PLUS")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid plan specified",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Return URL points to our billing callback route
      // Shopify will redirect here after merchant approves/declines subscription
      const appHandle = process.env.SHOPIFY_APP_HANDLE || "shipping-progress-banner";
      const returnUrl = `https://${session.shop}/admin/apps/${appHandle}/app/billing/callback`;

      const { confirmationUrl, subscriptionId } = await createSubscription(admin, {
        shop: session.shop,
        plan,
        returnUrl,
      });

      // Store pending subscription info
      await prisma.appSettings.upsert({
        where: { shop: session.shop },
        update: {
          subscriptionId,
          subscriptionStatus: "pending",
        },
        create: {
          shop: session.shop,
          subscriptionId,
          subscriptionStatus: "pending",
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          confirmationUrl,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else if (action === "cancel") {
      // Cancel existing subscription
      const settings = await prisma.appSettings.findUnique({
        where: { shop: session.shop },
      });

      if (!settings?.subscriptionId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "No active subscription found",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      await cancelSubscription(admin, settings.subscriptionId);

      // Update database
      await prisma.appSettings.update({
        where: { shop: session.shop },
        data: {
          plan: "FREE",
          subscriptionStatus: "cancelled",
          subscriptionId: null,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Subscription cancelled successfully",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Invalid action",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error handling billing action:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

