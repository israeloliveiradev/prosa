import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on("console", (msg) => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  console.log("1. Navigating to http://localhost:8081/start...");
  await page.goto("http://localhost:8081/start");
  await page.waitForTimeout(2000);

  // Take screenshot of step 1
  await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-start-step1.png" });
  console.log("Screenshot step 1 saved!");

  // Now simulate having a ready step and verify Einstein image
  console.log("2. Navigating through to Ready step...");
  await page.locator("text=Começar pelo começo").click();
  await page.waitForTimeout(800);
  await page.locator("text=Continuar").first().click();
  await page.waitForTimeout(800);
  await page.locator("text=Filosofia").first().click();
  await page.waitForTimeout(500);
  await page.locator("text=Medir o nível").first().click();
  await page.waitForTimeout(1000);
  await page.locator("text=Escolher nível manualmente").click();
  await page.waitForTimeout(800);
  await page.locator("text=B1").first().click();
  await page.waitForTimeout(500);
  await page.locator("text=Confirmar nível B1 e continuar").click();
  await page.waitForTimeout(1500);

  // Take screenshot of Ready step
  await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-ready-fixed-image.png" });
  console.log("Screenshot ready step saved!");

  // Check if image rendered or failed
  const imgHandle = await page.locator("[data-testid='onboarding-ready'] img, [data-testid='onboarding-ready'] [role='img']").first();
  console.log("Image handle found:", await imgHandle.count());

  // Test the restart button on Ready step
  console.log("3. Testing 'Refazer escolhas ou trocar idioma'...");
  await page.locator("text=Refazer escolhas ou trocar idioma").click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-after-restart.png" });
  console.log("Screenshot after restart saved! (Should be Step 1)");

  await browser.close();
}

main().catch(console.error);
