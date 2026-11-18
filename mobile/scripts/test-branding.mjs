import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  console.log("Navigating to http://localhost:8081/ ...");
  await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const title = await page.title();
  console.log("Page Title:", title);

  const faviconHref = await page.$eval('link[rel="icon"]', (el) => el.getAttribute("href")).catch(() => null);
  console.log("Favicon Href:", faviconHref);

  const themeColor = await page.$eval('meta[name="theme-color"]', (el) => el.getAttribute("content")).catch(() => null);
  console.log("Theme Color:", themeColor);

  const manifestHref = await page.$eval('link[rel="manifest"]', (el) => el.getAttribute("href")).catch(() => null);
  console.log("Manifest Href:", manifestHref);

  // Take screenshot of Sidebar with new ProsaLogo
  await page.screenshot({ path: "mobile/dist-qa/branding-sidebar.png" });

  // Test /account (Login screen)
  console.log("\nNavigating to http://localhost:8081/account ...");
  await page.goto("http://localhost:8081/account", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "mobile/dist-qa/branding-login.png" });

  // Test /reset (Magic link / OTP screen)
  console.log("\nNavigating to http://localhost:8081/reset ...");
  await page.goto("http://localhost:8081/reset", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "mobile/dist-qa/branding-reset.png" });

  console.log("\nTotal Console Errors:", errors.length);
  if (errors.length > 0) {
    console.log("Errors:", errors);
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
