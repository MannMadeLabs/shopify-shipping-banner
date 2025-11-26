import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`[Webhook] Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the session may have been deleted previously.
  
  try {
    // Delete session data
    if (session) {
      await db.session.deleteMany({ where: { shop } });
      console.log(`[Webhook] Deleted sessions for ${shop}`);
    }
    
    // Delete app settings for this shop
    await db.appSettings.deleteMany({ where: { shop } });
    console.log(`[Webhook] Deleted app settings for ${shop}`);
    
    // Delete analytics events for GDPR compliance
    // Keep data for 30 days for dispute resolution, then delete
    // For immediate deletion (stricter compliance):
    await db.analyticsEvent.deleteMany({ where: { shop } });
    console.log(`[Webhook] Deleted analytics events for ${shop}`);
    
    console.log(`[Webhook] Successfully cleaned up all data for ${shop}`);
  } catch (error) {
    console.error(`[Webhook] Error cleaning up data for ${shop}:`, error);
    // Still return 200 to acknowledge the webhook
    // Shopify will retry if we return an error
  }

  return new Response();
};
