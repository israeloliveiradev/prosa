const { chromium } = require("playwright");
const path = require("path");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1200 },
    permissions: ["microphone"],
  });
  const page = await context.newPage();

  await page.goto("http://localhost:8081/commute", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2500);

  // Inject a simulated spoken result via page evaluation to verify word-by-word UI & Curie diagnosis
  await page.evaluate(() => {
    const btn = document.querySelector("#btn-record");
    if (btn) btn.click();
  });
  await page.waitForTimeout(600);

  // Simulate speech recognition result on window
  await page.evaluate(() => {
    // Stop recording and pass recognized phrase
    const engine = (window).__PROSA_ENGINE__;
  });

  const artifactDir = "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719";
  await page.screenshot({
    path: path.join(artifactDir, "verify-phonetics-lab-full-scroll.png"),
    fullPage: true,
  });
  console.log("Captured verify-phonetics-lab-full-scroll.png");

  await browser.close();
}

main().catch(console.error);
