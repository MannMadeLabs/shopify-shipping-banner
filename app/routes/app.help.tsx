/**
 * Help & Support Page
 * Provides documentation and support links for merchants
 */

export default function HelpPage() {
  return (
    <s-page heading="Help & Support" subtitle="Get the most out of your free shipping progress bar">
      
      <s-section heading="Getting Started">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <strong>Step 1:</strong> Go to your Shopify admin → Online Store → Themes → Customize
          </s-paragraph>
          <s-paragraph>
            <strong>Step 2:</strong> Navigate to your Cart page or Cart drawer section
          </s-paragraph>
          <s-paragraph>
            <strong>Step 3:</strong> Click "Add block" and search for "Shipping Progress"
          </s-paragraph>
          <s-paragraph>
            <strong>Step 4:</strong> Configure the settings in the theme editor, or use the Dashboard for advanced options
          </s-paragraph>
        </s-stack>
      </s-section>
      
      <s-section heading="Settings Reference">
        <s-stack direction="block" gap="large">
          <div>
            <s-paragraph>
              <strong>Free Shipping Threshold:</strong> The minimum cart value customers need to qualify for free shipping. Make sure this matches your shipping settings.
            </s-paragraph>
          </div>
          <div>
            <s-paragraph>
              <strong>Messages:</strong> Customize the text shown below and at the threshold. Use {"{amount}"} as a placeholder for the remaining amount.
            </s-paragraph>
          </div>
          <div>
            <s-paragraph>
              <strong>Colors:</strong> Match your brand by customizing the progress bar, background, and text colors.
            </s-paragraph>
          </div>
          <div>
            <s-paragraph>
              <strong>Upsells:</strong> Show recommended products to help customers reach the threshold. Smart recommendations are based on cart contents.
            </s-paragraph>
          </div>
        </s-stack>
      </s-section>
      
      <s-section heading="Frequently Asked Questions">
        <s-stack direction="block" gap="large">
          <div>
            <s-paragraph>
              <strong>Why isn't the progress bar showing?</strong>
            </s-paragraph>
            <s-paragraph>
              Make sure you've added the block to your theme and it's enabled. Go to Theme Customize → Cart page → Add block → Shipping Progress.
            </s-paragraph>
          </div>
          <div>
            <s-paragraph>
              <strong>Why don't the colors update immediately?</strong>
            </s-paragraph>
            <s-paragraph>
              Settings are cached for 5 minutes for performance. Clear your browser cache or wait a few minutes for changes to appear.
            </s-paragraph>
          </div>
          <div>
            <s-paragraph>
              <strong>What counts towards my order limit (Free plan)?</strong>
            </s-paragraph>
            <s-paragraph>
              Only completed orders count. Cart views and abandoned carts don't affect your limit. The count resets every 30 days.
            </s-paragraph>
          </div>
          <div>
            <s-paragraph>
              <strong>Does this work with cart drawers?</strong>
            </s-paragraph>
            <s-paragraph>
              Yes! Add the block to your cart drawer section in the theme editor. It works with most Shopify themes including Dawn.
            </s-paragraph>
          </div>
        </s-stack>
      </s-section>
      
      <s-section heading="Contact Support">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Need help? We're here for you!
          </s-paragraph>
          <s-paragraph>
            📧 Email: <s-link href="mailto:support@mannmadelabs.com">support@mannmadelabs.com</s-link>
          </s-paragraph>
          <s-paragraph>
            🌐 Website: <s-link href="https://mannmadelabs.com" target="_blank">mannmadelabs.com</s-link>
          </s-paragraph>
          <s-paragraph>
            💬 Response time: We typically respond within 24 hours on business days.
          </s-paragraph>
        </s-stack>
      </s-section>
      
      <s-section slot="aside" heading="Quick Links">
        <s-unordered-list>
          <s-list-item>
            <s-link href="/app">Dashboard & Settings</s-link>
          </s-list-item>
          <s-list-item>
            <s-link 
              href="https://help.shopify.com/en/manual/online-store/themes/theme-structure/extend/apps#add-app-blocks-to-themes" 
              target="_blank"
            >
              How to add app blocks
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link 
              href="https://help.shopify.com/en/manual/shipping/setting-up-and-managing-your-shipping/free-shipping" 
              target="_blank"
            >
              Set up free shipping in Shopify
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

