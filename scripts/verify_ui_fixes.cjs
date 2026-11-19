const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const artifactDir = "C:\\Users\\israe\\.gemini\\antigravity\\brain\\2f02f24b-4854-4a50-a903-6682da6c7719";

  console.log("Navigating to Phonetics Lab (/commute)...");
  await page.goto("http://localhost:8081/commute", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Take screenshot of phonetics lab gauge and workspace
  await page.screenshot({
    path: path.join(artifactDir, "verify-fix-phonetics-gauge.png"),
    fullPage: false,
  });
  console.log("Saved verify-fix-phonetics-gauge.png");

  // Click record button to test score and gauge rendering
  const recordBtn = page.locator("#btn-record");
  if (await recordBtn.isVisible()) {
    console.log("Clicking start record...");
    await recordBtn.click();
    await page.waitForTimeout(1000);
    console.log("Clicking stop record...");
    await recordBtn.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(artifactDir, "verify-fix-phonetics-gauge-recorded.png"),
      fullPage: false,
    });
    console.log("Saved verify-fix-phonetics-gauge-recorded.png");
  }

  // Navigate to Settings
  console.log("Navigating to Settings (/settings)...");
  await page.goto("http://localhost:8081/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: path.join(artifactDir, "verify-fix-settings-tabs.png"),
    fullPage: false,
  });
  console.log("Saved verify-fix-settings-tabs.png");

  // Navigate to Home
  console.log("Navigating to Home (/)...");
  await page.goto("http://localhost:8081/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: path.join(artifactDir, "verify-fix-home-mentor-card.png"),
    fullPage: false,
  });
  console.log("Saved verify-fix-home-mentor-card.png");

  await browser.close();
  console.log("All UI verification screenshots captured successfully!");
})();
