import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:8081/account", { waitUntil: "networkidle" });
  await page.click('button:has-text("ENTRAR NO PROSA")');
  await page.waitForTimeout(1000);

  const node3 = page.locator(".relative.z-20").first();
  await node3.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  await node3.screenshot({ path: "mobile/dist-qa/node3-exact-crop.png" });
  console.log("Cropped screenshot taken!");

  await browser.close();
}

run();
