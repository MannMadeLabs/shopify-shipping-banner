/**
 * Storefront Request Authentication
 * 
 * Validates requests from the storefront using HMAC signatures
 * and shop domain verification.
 */

import crypto from "crypto";
import prisma from "../db.server";

/**
 * Generate a shop-specific token for storefront requests
 * This is stored with the shop settings and sent to the Liquid block
 */
export function generateShopToken(shop: string): string {
  const secret = process.env.SHOPIFY_API_SECRET || "";
  return crypto
    .createHmac("sha256", secret)
    .update(shop)
    .digest("hex")
    .substring(0, 32);
}

/**
 * Validate a storefront request
 * Checks that the shop exists in our database and the token matches
 */
export async function validateStorefrontRequest(
  shop: string | null,
  token: string | null
): Promise<{ valid: boolean; error?: string }> {
  if (!shop) {
    return { valid: false, error: "Shop parameter required" };
  }

  // Validate shop domain format
  if (!isValidShopDomain(shop)) {
    return { valid: false, error: "Invalid shop domain" };
  }

  // Check if shop exists in our database (has installed the app)
  const settings = await prisma.appSettings.findUnique({
    where: { shop },
    select: { shop: true },
  });

  if (!settings) {
    // Shop hasn't installed the app or was uninstalled
    return { valid: false, error: "Shop not found" };
  }

  // For analytics/settings endpoints, we validate the token
  if (token) {
    const expectedToken = generateShopToken(shop);
    if (token !== expectedToken) {
      return { valid: false, error: "Invalid token" };
    }
  }

  return { valid: true };
}

/**
 * Validate that a domain is a valid Shopify shop domain
 */
export function isValidShopDomain(shop: string): boolean {
  // Must end with .myshopify.com or be a valid custom domain
  const shopifyDomainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  
  // Also allow shop permanent domains that might not have .myshopify.com
  // These should still be validated against our database
  if (shopifyDomainPattern.test(shop)) {
    return true;
  }
  
  // For custom domains, just ensure it looks like a valid domain
  const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z0-9][a-zA-Z0-9-]*)+$/;
  return domainPattern.test(shop);
}

/**
 * Rate limiting helper - basic in-memory rate limiting
 * In production, use Redis or similar
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count };
}

/**
 * Clean up old rate limit entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);

