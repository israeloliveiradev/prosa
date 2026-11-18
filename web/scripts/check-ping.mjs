import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const pingBox = await page.locator(".animate-ping").first().boundingBox();
  const btn = page.locator('button:has-text("START!")');
  const btnBox = await btn.boundingBox();
  console.log("pingBox:", pingBox);
  console.log("btnBox:", btnBox);

  const pingHtml = await page.evaluate(() => {
    const el = document.querySelector(".animate-ping");
    return el ? {
      outerHTML: el.outerHTML,
      parentHTML: el.parentElement ? el.parentElement.outerHTML.slice(0, 300) : null,
      parentBox: el.parentElement ? el.parentElement.getBoundingClientRect() : null,
      elBox: el.getBoundingClientRect()
    } : null;
  });
  console.log("pingHtml:", JSON.stringify(pingHtml, null, 2));

  await browser.close();
}

run();
