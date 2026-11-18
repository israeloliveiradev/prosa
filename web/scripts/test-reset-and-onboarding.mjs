import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  console.log("1. Opening http://localhost:8081/ and clearing localStorage...");
  await page.goto("http://localhost:8081/");
  await page.waitForTimeout(1000);

  // Clear all localStorage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  console.log("2. Reloading page after clearing storage...");
  await page.goto("http://localhost:8081/");
  await page.waitForTimeout(3000);

  console.log("URL after storage clear:", page.url());

  // Screenshot of the fresh start
  await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-fresh-start.png", fullPage: true });
  console.log("Screenshot saved: verify-fresh-start.png");

  // Check if it redirected to /start or is showing onboarding
  const content = await page.content();
  const hasOnboarding = content.includes("Começar") || content.includes("onboarding") || content.includes("Prosa");
  console.log("Has onboarding content:", hasOnboarding);

  if (pageErrors.length > 0) {
    console.error("Page errors detected:", pageErrors);
  } else {
    console.log("Zero page errors!");
  }

  await browser.close();
}

main().catch(console.error);
