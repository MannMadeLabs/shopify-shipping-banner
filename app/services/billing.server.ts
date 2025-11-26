/**
 * Shopify Billing API Integration
 * Handles subscription creation, updates, and cancellations
 */

import { BILLING_PLANS } from "../config/billing";

export interface BillingConfig {
  shop: string;
  plan: "PRO" | "PLUS";
  returnUrl: string;
}

/**
 * Check if we're in test/development mode
 * In production, this should be false to process real payments
 */
function isTestMode(): boolean {
  // Use test mode in development, real mode in production
  const nodeEnv = process.env.NODE_ENV || "development";
  const forceTestMode = process.env.SHOPIFY_BILLING_TEST_MODE === "true";
  
  // Default: test mode in development, production mode otherwise
  return nodeEnv === "development" || forceTestMode;
}

/**
 * Create a billing subscription using Shopify's Billing API
 * This creates an App Subscription for recurring charges
 */
export async function createSubscription(
  admin: any, // Shopify admin API client
  config: BillingConfig
): Promise<{ confirmationUrl: string; subscriptionId: string }> {
  const planConfig = BILLING_PLANS[config.plan];
  const testMode = isTestMode();
  
  console.log(`[Billing] Creating ${testMode ? "TEST" : "LIVE"} subscription for ${config.shop} - Plan: ${config.plan}`);

  const response = await admin.graphql(
    `#graphql
      mutation CreateAppSubscription($name: String!, $price: Decimal!, $returnUrl: URL!, $test: Boolean!) {
        appSubscriptionCreate(
          name: $name
          test: $test
          lineItems: [
            {
              plan: {
                appRecurringPricingDetails: {
                  price: { amount: $price, currencyCode: USD }
                  interval: EVERY_30_DAYS
                }
              }
            }
          ]
          returnUrl: $returnUrl
        ) {
          appSubscription {
            id
            status
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        name: `${planConfig.name} Plan`,
        price: planConfig.price.toString(),
        returnUrl: config.returnUrl,
        test: testMode,
      },
    }
  );

  const data = await response.json();

  if (data.data?.appSubscriptionCreate?.userErrors?.length > 0) {
    throw new Error(
      `Billing error: ${data.data.appSubscriptionCreate.userErrors[0].message}`
    );
  }

  return {
    confirmationUrl: data.data.appSubscriptionCreate.confirmationUrl,
    subscriptionId: data.data.appSubscriptionCreate.appSubscription.id,
  };
}

/**
 * Cancel an existing subscription
 */
export async function cancelSubscription(
  admin: any,
  subscriptionId: string
): Promise<boolean> {
  const response = await admin.graphql(
    `#graphql
      mutation CancelAppSubscription($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        id: subscriptionId,
      },
    }
  );

  const data = await response.json();

  if (data.data?.appSubscriptionCancel?.userErrors?.length > 0) {
    throw new Error(
      `Cancellation error: ${data.data.appSubscriptionCancel.userErrors[0].message}`
    );
  }

  return data.data?.appSubscriptionCancel?.appSubscription?.status === "CANCELLED";
}

/**
 * Get the current active subscription
 */
export async function getActiveSubscription(
  admin: any
): Promise<{ id: string; name: string; status: string; price: number } | null> {
  const response = await admin.graphql(
    `#graphql
      query GetActiveSubscription {
        currentAppInstallation {
          activeSubscriptions {
            id
            name
            status
            lineItems {
              plan {
                pricingDetails {
                  ... on AppRecurringPricing {
                    price {
                      amount
                    }
                  }
                }
              }
            }
          }
        }
      }`
  );

  const data = await response.json();
  const subscriptions = data.data?.currentAppInstallation?.activeSubscriptions || [];

  if (subscriptions.length === 0) {
    return null;
  }

  const subscription = subscriptions[0];
  const price = subscription.lineItems[0]?.plan?.pricingDetails?.price?.amount || 0;

  return {
    id: subscription.id,
    name: subscription.name,
    status: subscription.status,
    price: parseFloat(price),
  };
}

/**
 * Check if a subscription is active
 */
export async function hasActiveSubscription(admin: any): Promise<boolean> {
  const subscription = await getActiveSubscription(admin);
  return subscription !== null && subscription.status === "ACTIVE";
}

/**
 * Map subscription price to plan tier
 */
export function getPlanFromPrice(price: number): "FREE" | "PRO" | "PLUS" {
  if (price >= BILLING_PLANS.PLUS.price) {
    return "PLUS";
  } else if (price >= BILLING_PLANS.PRO.price) {
    return "PRO";
  }
  return "FREE";
}

