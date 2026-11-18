import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719";

async function run() {
  console.log("=== INITIATING COMPREHENSIVE E2E QA VALIDATION ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[BROWSER CONSOLE ERROR]: ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    console.log(`[PAGE ERROR]: ${err.message}`);
    consoleErrors.push(err.message);
  });

  // 1. Clear local storage / KV to simulate fresh user
  await page.goto("http://localhost:8081/start");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await page.waitForTimeout(1500);

  console.log("1. Starting Onboarding from scratch...");
  // Step 1: Welcome Step
  const beginBtn = page.getByTestId("onboarding-begin");
  await beginBtn.waitFor({ state: "visible", timeout: 8000 });
  await beginBtn.click();
  await page.waitForTimeout(800);

  // Step 2: Pair Picker - Select English (en)
  console.log("2. Selecting English (en) target language...");
  const enBtn = page.getByTestId("target-lang-en");
  await enBtn.waitFor({ state: "visible", timeout: 5000 });
  await enBtn.click();
  await page.waitForTimeout(500);

  const nextPairBtn = page.getByTestId("onboarding-pair-next");
  await nextPairBtn.click();
  await page.waitForTimeout(800);

  // Step 3: Interests - Select interests
  console.log("3. Selecting Interests...");
  const firstTheme = page.locator('[data-testid^="theme-"]').first();
  await firstTheme.waitFor({ state: "visible", timeout: 5000 });
  await firstTheme.click();
  await page.waitForTimeout(300);

  const secondTheme = page.locator('[data-testid^="theme-"]').nth(1);
  await secondTheme.click();
  await page.waitForTimeout(300);

  const interestSubmitBtn = page.getByTestId("onboarding-interest-submit");
  await interestSubmitBtn.click();
  await page.waitForTimeout(800);

  // Step 4: Level Choice
  console.log("4. Selecting Level Choice (Manual Level B1)...");
  const pickLevelBtn = page.getByTestId("level-choice-btn-pick");
  await pickLevelBtn.waitFor({ state: "visible", timeout: 5000 });
  await pickLevelBtn.click();
  await page.waitForTimeout(600);

  const b1Option = page.getByTestId("level-option-B1");
  await b1Option.waitFor({ state: "visible", timeout: 5000 });
  await b1Option.click();
  await page.waitForTimeout(500);

  const confirmLevelBtn = page.getByTestId("level-choice-confirm");
  await confirmLevelBtn.click();
  await page.waitForTimeout(800);

  // Step 5: Ready Step
  console.log("5. Checking ReadyStep with Einstein and 4 Pillars...");
  await page.waitForSelector('text="Trilha Personalizada Pronta"', { timeout: 8000 });
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "qa-ready-step.png") });

  const startProseBtn = page.getByTestId("onboarding-open-prose");
  await startProseBtn.click();
  await page.waitForTimeout(2500);

  // Assert URL is /daily and NOT bounced back to /start
  const currentUrl = page.url();
  console.log(`URL after finishing onboarding: ${currentUrl}`);
  if (currentUrl.includes("/start")) {
    throw new Error(`CRITICAL BUG: Bounced back to /start! URL: ${currentUrl}`);
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, "qa-daily-english.png") });

  // Verify Daily Screen content
  console.log("6. Verifying /daily screen content...");
  const hasEnglishText = await page.locator('text=/Knowledge speaks/i').count();
  console.log(`Knowledge speaks count: ${hasEnglishText}`);
  const hasEnglishTarget = await page.locator('text=/FRASE ALVO \\(INGLÊS\\)/i').count();
  console.log(`FRASE ALVO (INGLÊS) count: ${hasEnglishTarget}`);

  // 7. Test clicking all main routes from navigation
  const routesToTest = [
    { name: "Home / Adventure Trail", path: "/" },
    { name: "Combat Arena / Duel", path: "/duel" },
    { name: "Acoustic Phonetics / Commute", path: "/commute" },
    { name: "Syntax Workshop / Practice", path: "/practice" },
    { name: "Memory Palace / SRS", path: "/memory" },
    { name: "Bilingual News", path: "/news" },
    { name: "Mentors / Persona", path: "/persona" },
    { name: "Level Exam", path: "/exam" },
    { name: "Cognitive Dossier", path: "/dossier" },
    { name: "Diamond League / Score", path: "/score" },
    { name: "User Profile", path: "/profile" },
    { name: "Settings", path: "/settings" },
    { name: "Paywall Pro", path: "/paywall" },
  ];

  console.log("7. Testing all routes for navigation stability (no /start bounces)...");
  for (const r of routesToTest) {
    console.log(`Navigating to ${r.name} (${r.path})...`);
    await page.goto(`http://localhost:8081${r.path}`);
    await page.waitForTimeout(1500);

    const activeUrl = page.url();
    console.log(`   -> Current URL: ${activeUrl}`);
    if (activeUrl.includes("/start")) {
      throw new Error(`CRITICAL BUG: Route ${r.path} bounced back to /start!`);
    }

    // Take screenshot for important screens
    if (r.path === "/") {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "qa-route-home.png") });
    } else if (r.path === "/duel") {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "qa-route-duel.png") });
    } else if (r.path === "/commute") {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "qa-route-commute.png") });
    } else if (r.path === "/practice") {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "qa-route-practice.png") });
    } else if (r.path === "/score") {
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "qa-route-score.png") });
    }
  }

  console.log("=== ALL ROUTES AND ONBOARDING VERIFIED SUCCESSFULLY ===");
  console.log(`Total console errors captured: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log("Errors logged:", consoleErrors);
  }

  await browser.close();
}

run().catch((err) => {
  console.error("FATAL QA TEST FAILURE:", err);
  process.exit(1);
});
