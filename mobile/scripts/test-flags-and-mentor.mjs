import { chromium } from "playwright";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    consoleErrors.push(err.message);
  });

  console.log("=== 1. LOGGING IN ===");
  await page.goto("http://localhost:8081/account", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.click('button:has-text("ENTRAR NO PROSA")');
  await page.waitForTimeout(1000);

  console.log("=== 2. VERIFYING HOME SCREEN LEADERBOARD FLAGS ===");
  const leaderboard = page.locator('text="Liga Diamante"').first();
  await leaderboard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Take screenshot of the Diamond League leaderboard with flags
  const leagueBox = await page.locator('div:has-text("Liga Diamante")').first().boundingBox();
  await page.screenshot({ path: "mobile/dist-qa/verify-league-flags.png" });
  console.log("Screenshot saved: verify-league-flags.png");

  console.log("=== 3. TESTING 'CONVERSAR EM ALEMÃO COM ALBERT' BUTTON ===");
  const mentorCard = page.locator('text="Mentor Ativo"').first();
  await mentorCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const talkButton = page.locator('button:has-text("Conversar em Alemão com Albert")');
  console.log("Clicking Conversar em Alemão com Albert...");
  await talkButton.click();
  await page.waitForTimeout(1200);

  console.log("Current URL after click:", page.url());
  await page.screenshot({ path: "mobile/dist-qa/verify-persona-screen.png" });
  console.log("Screenshot saved: verify-persona-screen.png");

  console.log("=== 4. VERIFYING SCORE / RANKING PAGE FLAGS ===");
  await page.goto("http://localhost:8081/score", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "mobile/dist-qa/verify-score-flags.png" });
  console.log("Screenshot saved: verify-score-flags.png");

  console.log("=== 5. VERIFYING COMMUTE SCREEN (NO TEXT NODE CRASH) ===");
  await page.goto("http://localhost:8081/commute", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "mobile/dist-qa/verify-commute-screen.png" });
  console.log("Screenshot saved: verify-commute-screen.png");

  console.log("\n--- CONSOLE ERRORS SUMMARY ---");
  const filteredErrors = consoleErrors.filter(e => !e.includes("net::ERR_CONNECTION_REFUSED"));
  console.log("Total Critical Console Errors:", filteredErrors.length);
  if (filteredErrors.length > 0) {
    console.error("Critical Errors:", filteredErrors);
  } else {
    console.log("SUCCESS: 0 console errors during all navigation flows!");
  }

  await browser.close();
}

run().catch((err) => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
