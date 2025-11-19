/**
 * Feature Gating Utilities
 * Check if features are available for a given plan
 */

import { hasFeature, type PlanFeatures } from "../config/billing";

/**
 * Check if a feature is available for the current settings
 */
export function canUseFeature(
  settings: { plan?: string },
  feature: keyof PlanFeatures
): boolean {
  const plan = settings.plan || "FREE";
  return hasFeature(plan, feature);
}

/**
 * Get features that should be locked/disabled in UI
 */
export function getLockedFeatures(plan: string): Partial<PlanFeatures> {
  const locked: Partial<PlanFeatures> = {};
  
  const featureKeys: (keyof PlanFeatures)[] = [
    "smartUpsells",
    "abTesting",
    "customCSS",
    "multiCurrency",
    "removeBranding",
    "smartThreshold",
    "geolocation",
    "webhooks",
    "apiAccess",
  ];
  
  featureKeys.forEach(key => {
    locked[key] = hasFeature(plan, key);
  });
  
  return locked;
}

/**
 * Get upgrade prompt message for a locked feature
 */
export function getUpgradeMessage(feature: keyof PlanFeatures): string {
  const messages: Record<keyof PlanFeatures, string> = {
    smartUpsells: "Upgrade to Pro to unlock smart product recommendations with learning",
    abTesting: "Upgrade to Pro to unlock A/B testing for your messages",
    customCSS: "Upgrade to Pro to add custom CSS styling",
    multiCurrency: "Upgrade to Pro for multi-currency support",
    removeBranding: "Upgrade to Pro to remove the 'Powered by' badge",
    smartThreshold: "Upgrade to Plus for AI-powered threshold optimization",
    geolocation: "Upgrade to Plus for geolocation-based rules",
    webhooks: "Upgrade to Plus for webhook integrations",
    apiAccess: "Upgrade to Plus for API access",
    analyticsHistoryDays: "Upgrade for longer analytics history",
    maxMessageVariants: "Upgrade to test more message variants",
    prioritySupport: "Upgrade for priority support",
  };
  
  return messages[feature] || "Upgrade to unlock this feature";
}

