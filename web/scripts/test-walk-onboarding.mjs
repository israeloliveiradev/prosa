import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on("console", (msg) => console.log(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  console.log("Navigating to http://localhost:8081/start...");
  await page.goto("http://localhost:8081/start");
  await page.waitForTimeout(2000);

  // Step 1: Click "Começar pelo começo"
  console.log("Clicking 'Começar pelo começo'...");
  await page.locator("text=Começar pelo começo").click();
  await page.waitForTimeout(1500);

  // Take screenshot of step 2 (PairPicker)
  await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-step2-pair.png" });
  console.log("Screenshot saved: verify-step2-pair.png");

  // Step 2: Click Next on PairPicker
  const continueBtn = page.locator("button:has-text('Continuar'), [role='button']:has-text('Continuar')").first();
  if (await continueBtn.count() > 0) {
    await continueBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-step3-interests.png" });
    console.log("Screenshot saved: verify-step3-interests.png");
  }

  // Step 3: Select an interest and continue
  const interestBtn = page.locator("text=Filosofia").first();
  if (await interestBtn.count() > 0) {
    await interestBtn.click();
    await page.waitForTimeout(500);
  }
  const saveInterestsBtn = page.locator("button:has-text('Continuar'), [role='button']:has-text('Continuar')").first();
  if (await saveInterestsBtn.count() > 0) {
    await saveInterestsBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-step4-place.png" });
    console.log("Screenshot saved: verify-step4-place.png");
  }

  await browser.close();
}

main().catch(console.error);
