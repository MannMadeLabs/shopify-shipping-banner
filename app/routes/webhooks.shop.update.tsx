/**
 * Shop Update Webhook Handler
 * 
 * Handles shop updates like currency changes, plan changes, etc.
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`[Webhook] Received ${topic} webhook for ${shop}`);

  try {
    const shopData = payload as {
      id: number;
      name: string;
      email: string;
      currency: string;
      money_format: string;
      money_with_currency_format: string;
      plan_name: string;
      plan_display_name: string;
    };

    console.log(`[Webhook] Shop update for ${shop}:`);
    console.log(`  - Currency: ${shopData.currency}`);
    console.log(`  - Shopify Plan: ${shopData.plan_display_name}`);

    // You could store currency info if needed for multi-currency support
    // For now, we just log the update
    
    // Future enhancement: Update settings with shop currency
    // await db.appSettings.updateMany({
    //   where: { shop },
    //   data: {
    //     shopCurrency: shopData.currency,
    //   },
    // });

  } catch (error) {
    console.error(`[Webhook] Error processing shop update for ${shop}:`, error);
  }

  return new Response();
};

