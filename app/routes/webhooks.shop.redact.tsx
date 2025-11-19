/**
 * GDPR Webhook: Shop Data Deletion
 * Triggered 48 hours after a shop uninstalls the app
 * Must delete ALL shop data
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log("🏪 Shop data deletion request received", {
    shop,
    shopId: payload.shop_id,
    shopDomain: payload.shop_domain,
  });

  try {
    // Delete ALL data associated with this shop
    
    // 1. Delete analytics events
    const deletedEvents = await prisma.analyticsEvent.deleteMany({
      where: { shop },
    });

    // 2. Delete app settings
    const deletedSettings = await prisma.appSettings.deleteMany({
      where: { shop },
    });

    // 3. Delete sessions
    const deletedSessions = await prisma.session.deleteMany({
      where: { shop },
    });

    console.log("✅ Shop data deletion completed", {
      shop,
      deletedEvents: deletedEvents.count,
      deletedSettings: deletedSettings.count,
      deletedSessions: deletedSessions.count,
    });

    // Log for compliance audit trail
    console.log("📊 GDPR Compliance: All shop data deleted", {
      shop,
      timestamp: new Date().toISOString(),
      totalRecordsDeleted: deletedEvents.count + deletedSettings.count + deletedSessions.count,
    });

    return new Response("Shop data deletion completed", { status: 200 });
  } catch (error) {
    console.error("❌ Error deleting shop data:", error);
    
    // IMPORTANT: Even if deletion fails, return 200
    // Shopify will retry if we return an error
    // Log the error for manual cleanup
    console.error("⚠️ MANUAL CLEANUP REQUIRED", {
      shop,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    return new Response("Shop data deletion acknowledged", { status: 200 });
  }
};

