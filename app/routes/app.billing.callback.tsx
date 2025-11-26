/**
 * Billing Callback Route
 * 
 * Handles the return from Shopify's subscription confirmation page.
 * Updates the shop's plan based on the subscription status.
 */

import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { getActiveSubscription, getPlanFromPrice } from "../services/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  try {
    // Get the active subscription from Shopify
    const subscription = await getActiveSubscription(admin);
    
    if (subscription && subscription.status === "ACTIVE") {
      // Determine plan based on subscription price
      const plan = getPlanFromPrice(subscription.price);
      
      // Update database with new plan
      await prisma.appSettings.upsert({
        where: { shop: session.shop },
        update: {
          plan,
          subscriptionId: subscription.id,
          subscriptionStatus: "active",
          // Reset order count on upgrade (give them a fresh start)
          ordersThisMonth: 0,
          billingCycleStart: new Date(),
        },
        create: {
          shop: session.shop,
          plan,
          subscriptionId: subscription.id,
          subscriptionStatus: "active",
          ordersThisMonth: 0,
          billingCycleStart: new Date(),
        },
      });
      
      console.log(`[Billing] Shop ${session.shop} upgraded to ${plan} plan`);
      
      // Redirect to dashboard with success message
      return redirect("/app?billing=success");
    } else {
      // No active subscription - user cancelled or declined
      console.log(`[Billing] Shop ${session.shop} subscription cancelled or declined`);
      
      // Update status if there was a pending subscription
      await prisma.appSettings.updateMany({
        where: { 
          shop: session.shop,
          subscriptionStatus: "pending",
        },
        data: {
          subscriptionStatus: "cancelled",
          subscriptionId: null,
        },
      });
      
      return redirect("/app?billing=cancelled");
    }
  } catch (error) {
    console.error("[Billing] Error processing callback:", error);
    return redirect("/app?billing=error");
  }
};

export default function BillingCallback() {
  // This component shouldn't render as the loader always redirects
  return (
    <s-page heading="Processing...">
      <s-section>
        <s-paragraph>
          Processing your subscription. Please wait...
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

