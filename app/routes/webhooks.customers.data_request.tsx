/**
 * GDPR Webhook: Customer Data Request
 * Triggered when a customer requests their personal data
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log("📋 Customer data request received", {
    shop,
    customerId: payload.customer?.id,
    email: payload.customer?.email,
  });

  try {
    // Find all analytics events for this customer
    // Note: We're using sessionId as a proxy for customer tracking
    // In production, you'd want to store customer IDs directly
    
    const customerEmail = payload.customer?.email;
    const customerId = payload.customer?.id;

    // Query analytics events
    const events = await prisma.analyticsEvent.findMany({
      where: {
        shop,
        // Add customer email/ID filtering if you're storing it
      },
      select: {
        eventType: true,
        cartValue: true,
        createdAt: true,
        productId: true,
      },
    });

    // In production, you would:
    // 1. Compile all customer data into a report
    // 2. Send it to the customer via email or Shopify API
    // 3. Log the request for compliance
    
    console.log("✅ Customer data request processed", {
      shop,
      customerId,
      eventCount: events.length,
    });

    // For now, just log it. In production, send the data to customer.
    // You have 30 days to fulfill GDPR data requests.

    return new Response("Customer data request processed", { status: 200 });
  } catch (error) {
    console.error("❌ Error processing customer data request:", error);
    return new Response("Error processing request", { status: 500 });
  }
};

