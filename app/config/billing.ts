/**
 * Billing Plans Configuration
 * Defines pricing tiers, features, and limits for the app
 */

export interface PlanFeatures {
  smartUpsells: boolean;
  abTesting: boolean;
  customCSS: boolean;
  multiCurrency: boolean;
  removeBranding: boolean;
  smartThreshold: boolean;
  geolocation: boolean;
  webhooks: boolean;
  apiAccess: boolean;
  analyticsHistoryDays: number;
  maxMessageVariants: number;
  prioritySupport: boolean;
}

export interface BillingPlan {
  id: "FREE" | "PRO" | "PLUS";
  name: string;
  price: number; // Monthly price in USD
  orderLimit: number | null; // null = unlimited
  features: PlanFeatures;
  description: string;
  cta: string;
}

export const BILLING_PLANS: Record<string, BillingPlan> = {
  FREE: {
    id: "FREE",
    name: "Starter",
    price: 0,
    orderLimit: 100,
    features: {
      smartUpsells: false,
      abTesting: false,
      customCSS: false,
      multiCurrency: false,
      removeBranding: false,
      smartThreshold: false,
      geolocation: false,
      webhooks: false,
      apiAccess: false,
      analyticsHistoryDays: 7,
      maxMessageVariants: 1,
      prioritySupport: false,
    },
    description: "Perfect for testing and small stores",
    cta: "Get Started Free",
  },
  
  PRO: {
    id: "PRO",
    name: "Pro",
    price: 19.99,
    orderLimit: null, // unlimited
    features: {
      smartUpsells: true,
      abTesting: true,
      customCSS: true,
      multiCurrency: true,
      removeBranding: true,
      smartThreshold: false,
      geolocation: false,
      webhooks: false,
      apiAccess: false,
      analyticsHistoryDays: 90,
      maxMessageVariants: 5,
      prioritySupport: true,
    },
    description: "Smart features that optimize conversions",
    cta: "Upgrade to Pro",
  },
  
  PLUS: {
    id: "PLUS",
    name: "Plus",
    price: 49.99,
    orderLimit: null,
    features: {
      smartUpsells: true,
      abTesting: true,
      customCSS: true,
      multiCurrency: true,
      removeBranding: true,
      smartThreshold: true,
      geolocation: true,
      webhooks: true,
      apiAccess: true,
      analyticsHistoryDays: 365,
      maxMessageVariants: 10,
      prioritySupport: true,
    },
    description: "Enterprise features for scaling brands",
    cta: "Upgrade to Plus",
  },
};

/**
 * Check if a feature is available for a given plan
 */
export function hasFeature(plan: string, feature: keyof PlanFeatures): boolean {
  const planConfig = BILLING_PLANS[plan] || BILLING_PLANS.FREE;
  return planConfig.features[feature];
}

/**
 * Get the order limit for a given plan
 */
export function getOrderLimit(plan: string): number | null {
  const planConfig = BILLING_PLANS[plan] || BILLING_PLANS.FREE;
  return planConfig.orderLimit;
}

/**
 * Check if order limit is exceeded
 */
export function isOrderLimitExceeded(plan: string, ordersThisMonth: number): boolean {
  const limit = getOrderLimit(plan);
  if (limit === null) return false; // unlimited
  return ordersThisMonth >= limit;
}

/**
 * Get plan details
 */
export function getPlanDetails(plan: string): BillingPlan {
  return BILLING_PLANS[plan] || BILLING_PLANS.FREE;
}

/**
 * Get all plans (for pricing table)
 */
export function getAllPlans(): BillingPlan[] {
  return [BILLING_PLANS.FREE, BILLING_PLANS.PRO, BILLING_PLANS.PLUS];
}

