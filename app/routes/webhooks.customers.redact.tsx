/**
 * GDPR Webhook: Customer Data Deletion
 * Triggered when a customer requests deletion of their personal data
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log("🗑️ Customer data deletion request received", {
    shop,
    customerId: payload.customer?.id,
    email: payload.customer?.email,
  });

  try {
    const customerEmail = payload.customer?.email;
    const customerId = payload.customer?.id;

    // Delete all analytics events associated with this customer
    // Since we're using sessionId (not directly tied to customer),
    // we can't easily delete specific customer data
    
    // In production with customer IDs stored:
    // await prisma.analyticsEvent.deleteMany({
    //   where: {
    //     shop,
    //     customerId: customerId,
    //   },
    // });

    // For now, we're not storing PII (personally identifiable information)
    // Our analytics only track cart values and product IDs, no customer data
    
    console.log("✅ Customer data deletion processed", {
      shop,
      customerId,
      note: "No PII stored in analytics events",
    });

    // You have 30 days to fulfill GDPR deletion requests
    return new Response("Customer data deletion processed", { status: 200 });
  } catch (error) {
    console.error("❌ Error processing customer data deletion:", error);
    return new Response("Error processing deletion", { status: 500 });
  }
};

