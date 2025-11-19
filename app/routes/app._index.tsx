import { useState, useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { getAllPlans, getOrderLimit, isOrderLimitExceeded } from "../config/billing";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Fetch settings
  let settings = await prisma.appSettings.findUnique({
    where: { shop: session.shop },
  });
  
  if (!settings) {
    settings = await prisma.appSettings.create({
      data: { shop: session.shop },
    });
  }
  
  // Fetch analytics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const events = await prisma.analyticsEvent.findMany({
    where: {
      shop: session.shop,
      createdAt: { gte: thirtyDaysAgo },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  
  // Calculate metrics
  const totalViews = events.filter(e => e.eventType === "view").length;
  const totalClicks = events.filter(e => e.eventType === "upsell_click").length;
  const thresholdsMet = events.filter(e => e.eventType === "threshold_met").length;
  const clickThroughRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;
  
  const recentEvents = events.slice(0, 5);
  
  // Get plan info
  const currentPlan = settings.plan || "FREE";
  const orderLimit = getOrderLimit(currentPlan);
  const ordersThisMonth = settings.ordersThisMonth;
  const limitExceeded = isOrderLimitExceeded(currentPlan, ordersThisMonth);
  const plans = getAllPlans();
  
  return { 
    settings,
    analytics: {
      totalViews,
      totalClicks,
      thresholdsMet,
      clickThroughRate,
      recentEvents,
    },
    billing: {
      currentPlan,
      orderLimit,
      ordersThisMonth,
      limitExceeded,
      plans,
    }
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const data = {
    freeShippingThreshold: parseFloat(formData.get("freeShippingThreshold") as string),
    progressColor: formData.get("progressColor") as string,
    backgroundColor: formData.get("backgroundColor") as string,
    textColor: formData.get("textColor") as string,
    showUpsell: formData.get("showUpsell") === "true",
    upsellProductCount: parseInt(formData.get("upsellProductCount") as string),
    upsellSource: formData.get("upsellSource") as string,
    curatedProductIds: formData.get("curatedProductIds") as string,
    belowThresholdMessage: formData.get("belowThresholdMessage") as string,
    qualifiedMessage: formData.get("qualifiedMessage") as string,
    upsellTitle: formData.get("upsellTitle") as string,
    enableAnalytics: formData.get("enableAnalytics") === "true",
  };
  
  const settings = await prisma.appSettings.upsert({
    where: { shop: session.shop },
    create: { shop: session.shop, ...data },
    update: data,
  });
  
  return { settings, success: true };
};

export default function Dashboard() {
  const { settings, analytics, billing } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const billingFetcher = useFetcher();
  
  const [formData, setFormData] = useState({
    freeShippingThreshold: settings.freeShippingThreshold,
    progressColor: settings.progressColor,
    backgroundColor: settings.backgroundColor,
    textColor: settings.textColor,
    showUpsell: settings.showUpsell,
    upsellProductCount: settings.upsellProductCount,
    upsellSource: settings.upsellSource || "recommendations",
    curatedProductIds: settings.curatedProductIds || "",
    belowThresholdMessage: settings.belowThresholdMessage,
    qualifiedMessage: settings.qualifiedMessage,
    upsellTitle: settings.upsellTitle,
    enableAnalytics: settings.enableAnalytics,
  });
  
  const isLoading = fetcher.state === "submitting";
  const isDirty = JSON.stringify(formData) !== JSON.stringify({
    freeShippingThreshold: settings.freeShippingThreshold,
    progressColor: settings.progressColor,
    backgroundColor: settings.backgroundColor,
    textColor: settings.textColor,
    showUpsell: settings.showUpsell,
    upsellProductCount: settings.upsellProductCount,
    upsellSource: settings.upsellSource || "recommendations",
    curatedProductIds: settings.curatedProductIds || "",
    belowThresholdMessage: settings.belowThresholdMessage,
    qualifiedMessage: settings.qualifiedMessage,
    upsellTitle: settings.upsellTitle,
    enableAnalytics: settings.enableAnalytics,
  });
  
  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved successfully");
    }
  }, [fetcher.data?.success, shopify]);
  
  const handleSubmit = () => {
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, String(value));
    });
    fetcher.submit(data, { method: "POST" });
  };
  
  const handleUpgrade = async (planId: string) => {
    const formData = new FormData();
    formData.append("action", "create");
    formData.append("plan", planId);
    
    billingFetcher.submit(formData, {
      method: "POST",
      action: "/api/billing",
    });
  };
  
  // Handle billing redirect
  useEffect(() => {
    if (billingFetcher.data?.confirmationUrl) {
      window.top!.location.href = billingFetcher.data.confirmationUrl;
    }
  }, [billingFetcher.data]);
  
  // Show billing status toasts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const billingStatus = params.get("billing");
    
    if (billingStatus === "success") {
      shopify.toast.show("Subscription activated successfully!");
    } else if (billingStatus === "cancelled") {
      shopify.toast.show("Subscription was cancelled");
    } else if (billingStatus === "failed" || billingStatus === "error") {
      shopify.toast.show("There was an error processing your subscription", { isError: true });
    }
  }, [shopify]);
  
  return (
    <s-page heading="Dashboard" subtitle="Manage your free shipping progress bar">
      <s-button
        slot="primary-action"
        onClick={handleSubmit}
        {...(isLoading ? { loading: true } : {})}
        {...(!isDirty ? { disabled: true } : {})}
      >
        Save Settings
      </s-button>
      
      {/* Quick Stats */}
      <s-stack direction="inline" gap="large">
        <s-section>
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>
              {analytics.totalViews.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
              Total Views
            </div>
          </div>
        </s-section>
        
        <s-section>
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#3b82f6" }}>
              {analytics.totalClicks.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
              Upsell Clicks
            </div>
          </div>
        </s-section>
        
        <s-section>
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#f59e0b" }}>
              {analytics.clickThroughRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
              Click-Through Rate
            </div>
          </div>
        </s-section>
        
        <s-section>
          <div style={{ textAlign: "center", padding: "1rem" }}>
            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#8b5cf6" }}>
              {analytics.thresholdsMet.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
              Thresholds Met
            </div>
          </div>
        </s-section>
      </s-stack>
      
      {/* Billing / Plan Section */}
      <s-section heading="Your Plan">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Current Plan Status */}
          <div style={{ padding: "1rem", backgroundColor: billing.currentPlan === "FREE" ? "#fef3c7" : "#d1fae5", borderRadius: "8px", border: `2px solid ${billing.currentPlan === "FREE" ? "#fbbf24" : "#10b981"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
                  {billing.plans.find(p => p.id === billing.currentPlan)?.name || "Starter"} Plan
                  {billing.currentPlan !== "FREE" && <span style={{ marginLeft: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                    ${billing.plans.find(p => p.id === billing.currentPlan)?.price || 0}/month
                  </span>}
                </h3>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
                  {billing.currentPlan === "FREE" && billing.orderLimit ? (
                    <>
                      {billing.ordersThisMonth} / {billing.orderLimit} orders this month
                      {billing.limitExceeded && <span style={{ marginLeft: "0.5rem", color: "#ef4444", fontWeight: 600 }}>
                        (Limit reached - Please upgrade)
                      </span>}
                    </>
                  ) : (
                    "Unlimited orders"
                  )}
                </p>
              </div>
              {billing.currentPlan === "FREE" && (
                <div>
                  <span style={{ fontSize: "0.875rem", color: "#6b7280", marginRight: "0.5rem" }}>
                    Free Forever
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Upgrade Options (show only if on FREE or PRO) */}
          {billing.currentPlan !== "PLUS" && (
            <div style={{ display: "grid", gridTemplateColumns: billing.currentPlan === "FREE" ? "1fr 1fr" : "1fr", gap: "1rem" }}>
              {billing.currentPlan === "FREE" && (
                <div style={{ padding: "1.5rem", border: "2px solid #e5e7eb", borderRadius: "8px" }}>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: 600 }}>
                    Pro Plan
                  </h4>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.5rem 0" }}>
                    $19.99<span style={{ fontSize: "0.875rem", fontWeight: 400, color: "#6b7280" }}>/month</span>
                  </div>
                  <ul style={{ margin: "1rem 0", padding: "0 0 0 1.25rem", fontSize: "0.875rem", color: "#374151" }}>
                    <li>Unlimited orders</li>
                    <li>Smart upsells with learning</li>
                    <li>A/B testing (5 variants)</li>
                    <li>Multi-currency support</li>
                    <li>Custom CSS editor</li>
                    <li>Remove branding</li>
                    <li>90-day analytics</li>
                  </ul>
                  <s-button
                    onClick={() => handleUpgrade("PRO")}
                    variant="primary"
                    fullWidth
                    {...(billingFetcher.state === "submitting" ? { loading: true } : {})}
                  >
                    Upgrade to Pro
                  </s-button>
                </div>
              )}
              
              {(billing.currentPlan === "FREE" || billing.currentPlan === "PRO") && (
                <div style={{ padding: "1.5rem", border: "2px solid #8b5cf6", borderRadius: "8px", backgroundColor: "#faf5ff" }}>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: 600 }}>
                    Plus Plan
                    <span style={{ marginLeft: "0.5rem", padding: "0.25rem 0.5rem", backgroundColor: "#8b5cf6", color: "white", borderRadius: "4px", fontSize: "0.75rem" }}>
                      POPULAR
                    </span>
                  </h4>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0.5rem 0" }}>
                    $49.99<span style={{ fontSize: "0.875rem", fontWeight: 400, color: "#6b7280" }}>/month</span>
                  </div>
                  <ul style={{ margin: "1rem 0", padding: "0 0 0 1.25rem", fontSize: "0.875rem", color: "#374151" }}>
                    <li>Everything in Pro</li>
                    <li>Smart threshold optimization</li>
                    <li>Advanced A/B testing (10 variants)</li>
                    <li>Geolocation rules</li>
                    <li>Multi-goal tiers</li>
                    <li>Webhook integrations</li>
                    <li>API access</li>
                    <li>White label</li>
                  </ul>
                  <s-button
                    onClick={() => handleUpgrade("PLUS")}
                    variant="primary"
                    fullWidth
                    {...(billingFetcher.state === "submitting" ? { loading: true } : {})}
                  >
                    Upgrade to Plus
                  </s-button>
                </div>
              )}
            </div>
          )}
        </div>
      </s-section>
      
      {/* Main Content - Two Columns */}
      <s-stack direction="inline" gap="large" style={{ alignItems: "flex-start" }}>
        {/* Left Column - Settings */}
        <div style={{ flex: "1 1 60%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <s-section heading="Threshold Configuration">
            <s-text-field
              label="Free Shipping Threshold"
              type="number"
              value={String(formData.freeShippingThreshold)}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  freeShippingThreshold: parseFloat((e.target as HTMLInputElement).value),
                })
              }
              suffix="USD"
              helpText="Minimum cart value for free shipping"
            />
          </s-section>
          
          <s-section heading="Messages">
            <s-stack direction="block" gap="large">
              <s-text-field
                label="Below Threshold Message"
                value={formData.belowThresholdMessage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    belowThresholdMessage: (e.target as HTMLInputElement).value,
                  })
                }
                helpText="Use {amount} as placeholder for remaining amount"
              />
              
              <s-text-field
                label="Qualified Message"
                value={formData.qualifiedMessage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    qualifiedMessage: (e.target as HTMLInputElement).value,
                  })
                }
                helpText="Message shown when threshold is met"
              />
            </s-stack>
          </s-section>
          
          <s-section heading="Colors">
            <s-stack direction="inline" gap="large">
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                  Progress Bar Color
                </label>
                <input
                  type="color"
                  value={formData.progressColor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      progressColor: e.target.value,
                    })
                  }
                  style={{ width: "60px", height: "40px", cursor: "pointer", border: "1px solid #e5e7eb", borderRadius: "4px" }}
                />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                  Background Color
                </label>
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      backgroundColor: e.target.value,
                    })
                  }
                  style={{ width: "60px", height: "40px", cursor: "pointer", border: "1px solid #e5e7eb", borderRadius: "4px" }}
                />
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                  Text Color
                </label>
                <input
                  type="color"
                  value={formData.textColor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      textColor: e.target.value,
                    })
                  }
                  style={{ width: "60px", height: "40px", cursor: "pointer", border: "1px solid #e5e7eb", borderRadius: "4px" }}
                />
              </div>
            </s-stack>
          </s-section>
          
          <s-section heading="Upsell Settings">
            <s-stack direction="block" gap="large">
              <s-checkbox
                checked={formData.showUpsell}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    showUpsell: (e.target as HTMLInputElement).checked,
                  })
                }
              >
                Show product upsells below threshold
              </s-checkbox>
              
              {formData.showUpsell && (
                <>
                  <s-text-field
                    label="Upsell Section Title"
                    value={formData.upsellTitle}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        upsellTitle: (e.target as HTMLInputElement).value,
                      })
                    }
                  />
                  
                  <s-text-field
                    label="Number of Upsell Products"
                    type="number"
                    value={String(formData.upsellProductCount)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        upsellProductCount: parseInt((e.target as HTMLInputElement).value),
                      })
                    }
                    min="1"
                    max="4"
                  />
                  
                  <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                      Upsell Source
                    </label>
                    <select
                      value={formData.upsellSource}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          upsellSource: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                        fontSize: "0.875rem"
                      }}
                    >
                      <option value="recommendations">Smart Recommendations (Based on cart)</option>
                      <option value="curated">Curated Products (Manual selection)</option>
                    </select>
                  </div>
                  
                  {formData.upsellSource === "curated" && (
                    <s-text-field
                      label="Product IDs"
                      value={formData.curatedProductIds}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          curatedProductIds: (e.target as HTMLInputElement).value,
                        })
                      }
                      helpText="Comma-separated product IDs (e.g., 123456789,987654321)"
                      multiline={2}
                    />
                  )}
                </>
              )}
            </s-stack>
          </s-section>
        </div>
        
        {/* Right Column - Analytics & Preview */}
        <div style={{ flex: "1 1 40%", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <s-section heading="Live Preview">
            <s-box
              padding="large"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <div
                style={{
                  backgroundColor: formData.backgroundColor,
                  padding: "1rem",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    color: formData.textColor,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    marginBottom: "0.5rem",
                    textAlign: "center",
                  }}
                >
                  {formData.belowThresholdMessage.replace("{amount}", "$25.00")}
                </div>
                <div
                  style={{
                    height: "8px",
                    background: "#e5e7eb",
                    borderRadius: "9999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: formData.progressColor,
                      width: "50%",
                      borderRadius: "9999px",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </s-box>
          </s-section>
          
          <s-section heading="Recent Activity">
            {analytics.recentEvents.length === 0 ? (
              <s-paragraph>No activity yet. Add the progress bar to your cart to start tracking!</s-paragraph>
            ) : (
              <s-stack direction="block" gap="small">
                {analytics.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      padding: "0.75rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
                      {event.eventType === "view" && "📊 Progress bar viewed"}
                      {event.eventType === "upsell_click" && "🛍️ Upsell clicked"}
                      {event.eventType === "threshold_met" && "🎉 Threshold met"}
                      {event.eventType === "cart_increment" && "📈 Cart increased"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {new Date(event.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </s-stack>
            )}
          </s-section>
          
          <s-section heading="Analytics">
            <s-stack direction="block" gap="base">
              <s-checkbox
                checked={formData.enableAnalytics}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    enableAnalytics: (e.target as HTMLInputElement).checked,
                  })
                }
              >
                Enable analytics tracking
              </s-checkbox>
              <s-paragraph>
                Track bar views, cart increments, and upsell clicks to measure performance.
              </s-paragraph>
            </s-stack>
          </s-section>
        </div>
      </s-stack>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
