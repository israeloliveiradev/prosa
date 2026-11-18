import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:8081/reset", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "mobile/dist-qa/check-reset-page.png" });
  console.log("Saved check-reset-page.png");

  // Inspect the image on reset page
  const imgInfo = await page.evaluate(() => {
    const img = document.querySelector('img[alt*="Einstein"]');
    return img ? {
      src: img.src,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      visible: img.getBoundingClientRect()
    } : null;
  });
  console.log("Image Info:", imgInfo);

  await browser.close();
}

run();
