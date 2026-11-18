import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));

  console.log("Navigating to http://localhost:8081/start...");
  await page.goto("http://localhost:8081/start");
  await page.waitForTimeout(1000);

  // Step 1: Click "Começar pelo começo"
  await page.locator("text=Começar pelo começo").click();
  await page.waitForTimeout(1000);

  // Step 2: Choose German + Continue
  const germanBtn = page.locator("text=Alemão").first();
  if (await germanBtn.count() > 0) {
    await germanBtn.click();
    await page.waitForTimeout(300);
  }
  await page.locator("button:has-text('Continuar'), [role='button']:has-text('Continuar')").first().click();
  await page.waitForTimeout(1000);

  // Step 3: Select Filosofia and Ciência
  const filoBtn = page.locator("text=Filosofia").first();
  if (await filoBtn.count() > 0) await filoBtn.click();
  const cienciaBtn = page.locator("text=Ciência").first();
  if (await cienciaBtn.count() > 0) await cienciaBtn.click();
  await page.waitForTimeout(300);

  // Click "Medir o nível"
  await page.locator("text=Medir o nível").first().click();
  await page.waitForTimeout(1500);

  // Screenshot Step 4
  await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-step4-choice.png" });
  console.log("Screenshot saved: verify-step4-choice.png");

  // In LevelChoice, select "Já estudei antes" or "Começar do zero"
  const startZero = page.locator("text=Começar do zero").first();
  if (await startZero.count() > 0) {
    await startZero.click();
    await page.waitForTimeout(1500);
    // Screenshot Step 5 (ReadyStep)
    await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-step5-ready.png" });
    console.log("Screenshot saved: verify-step5-ready.png");
  }

  await browser.close();
}

main().catch(console.error);
