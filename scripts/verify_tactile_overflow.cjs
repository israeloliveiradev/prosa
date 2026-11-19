const { chromium } = require("playwright");
const path = require("path");

const ARTIFACTS_DIR = "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719";

async function main() {
  console.log("=== VERIFYING TACTILE 3D BUTTONS & FILTER PILLS OVERFLOW ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("Navigating to http://localhost:8081/persona...");
  await page.goto("http://localhost:8081/persona", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  // 1. Sidebar: Scroll nav to bottom to fully expose Prosa Pro VIP button
  console.log("Locating Prosa Pro VIP button in sidebar...");
  const navElement = page.locator("aside nav");
  await navElement.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(500);

  const proButton = page.locator('aside nav button:has-text("Prosa Pro VIP")');
  await proButton.waitFor({ state: "visible" });

  // Take focused screenshot of Prosa Pro VIP button
  console.log("Capturing focused screenshot of Prosa Pro VIP button...");
  await proButton.screenshot({
    path: path.join(ARTIFACTS_DIR, "verify-tactile-pro-button.png"),
  });
  console.log("Saved verify-tactile-pro-button.png");

  // Also capture the sidebar area showing the button and surrounding space
  const sidebarNavBox = await navElement.boundingBox();
  if (sidebarNavBox) {
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "verify-tactile-sidebar-nav.png"),
      clip: {
        x: sidebarNavBox.x - 10,
        y: Math.max(0, sidebarNavBox.y + sidebarNavBox.height - 200),
        width: sidebarNavBox.width + 20,
        height: 210,
      },
    });
    console.log("Saved verify-tactile-sidebar-nav.png");
  }

  // 2. Persona Category Filter Pills
  console.log("Locating Category Filter Pills in /persona...");
  const filterPillAll = page.locator('button:has-text("Todos os Mentores")');
  await filterPillAll.waitFor({ state: "visible" });

  const filterContainer = filterPillAll.locator("..");
  const filterBox = await filterContainer.boundingBox();
  console.log("Category filter bar bounding box:", filterBox);

  // Take focused screenshot of the category filter pills
  console.log("Capturing focused screenshot of Persona Category Filter Pills...");
  if (filterBox) {
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, "verify-tactile-persona-pills.png"),
      clip: {
        x: Math.max(0, filterBox.x - 10),
        y: Math.max(0, filterBox.y - 10),
        width: filterBox.width + 20,
        height: filterBox.height + 25,
      },
    });
    console.log("Saved verify-tactile-persona-pills.png");
  }

  // Also full page screenshot
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "verify-persona-full-view.png"),
  });
  console.log("Saved verify-persona-full-view.png");

  await browser.close();
  console.log("=== VERIFICATION COMPLETED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
