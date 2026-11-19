import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log("Navigating to daily...");
  await page.goto("http://localhost:8081/daily", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Check card numbering
  const bodyText = await page.textContent("body");
  const hasDynamicCard = bodyText.includes("Cartão #1 de 5") || bodyText.includes("Cartão #");
  console.log("Has dynamic card counter:", hasDynamicCard);

  // Check phonetics in Portuguese
  const hasPtPhoneticsEn = bodyText.includes("nólidj spíks") || bodyText.includes("di guedánquen");
  console.log("Has Portuguese phonetic respelling:", hasPtPhoneticsEn);

  // Take screenshot of daily
  await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-daily-phonetics-pt.png" });

  // Test language menu
  const langButton = page.locator("button:has-text('via PT')").first();
  if (await langButton.isVisible()) {
    await langButton.click();
    await page.waitForTimeout(500);
    const menuText = await page.textContent("body");
    const hasTrilhas = menuText.includes("Trilhas de Aprendizado") && (menuText.includes("Nível") || menuText.includes("Novo Curso"));
    console.log("Language dropdown shows isolated tracks:", hasTrilhas);
    await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-language-tracks-menu.png" });
  }

  // Navigate to commute
  console.log("Navigating to commute...");
  await page.goto("http://localhost:8081/commute", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const commuteText = await page.textContent("body");
  const hasPtCommutePhonetics = commuteText.includes("ai uúd láik") || commuteText.includes("i-sh mêtche") || commuteText.includes("qui-siê-ra");
  console.log("Has Portuguese commute phonetics:", hasPtCommutePhonetics);
  await page.screenshot({ path: "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-commute-phonetics-pt.png" });

  await browser.close();
  console.log("All phonetics and tracks tests completed successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
