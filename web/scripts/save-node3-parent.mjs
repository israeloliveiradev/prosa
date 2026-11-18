import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:8081/account", { waitUntil: "networkidle" });
  await page.click('button:has-text("ENTRAR NO PROSA")');
  await page.waitForTimeout(1000);

  const startBtn = page.locator('button:has-text("START!")');
  await startBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Take screenshot of the button and 100px around it
  const box = await startBtn.boundingBox();
  console.log("Box:", box);

  await page.screenshot({
    path: "mobile/dist-qa/node3-clean-crop.png",
    clip: {
      x: box.x - 80,
      y: box.y - 80,
      width: box.width + 160,
      height: box.height + 160,
    }
  });

  console.log("Clean crop saved!");
  await browser.close();
}

run();
