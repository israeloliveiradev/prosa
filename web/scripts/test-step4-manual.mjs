import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto("http://localhost:8081/start");
  await page.waitForTimeout(1000);
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
  await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-manual-levels.png" });

  const b1 = page.locator("text=B1").first();
  if (await b1.count() > 0) {
    await b1.click();
    await page.waitForTimeout(500);
    await page.locator("text=Confirmar nível B1 e continuar").click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/verify-ready-final.png" });
    console.log("Ready step screenshot saved!");
  }

  await browser.close();
}

main().catch(console.error);
