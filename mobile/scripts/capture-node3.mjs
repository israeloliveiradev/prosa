import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const node3 = page.locator("text=Lição 7").first();
  await node3.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "mobile/dist-qa/fix-trail-node3-close.png" });
  await browser.close();
  console.log("Captured!");
}

run();
