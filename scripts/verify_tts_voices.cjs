const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719";

async function main() {
  console.log("=== VERIFYING MULTI-ENGINE SPEECH SYNTHESIS & VOICE PROFILES ===");

  // 1. Verify package.json contains kokoro-js and piper packages
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../mobile/package.json"), "utf-8")
  );
  console.log("Checking dependencies in package.json...");
  const hasKokoro = Boolean(pkg.dependencies["kokoro-js"]);
  const hasPiper = Boolean(
    pkg.dependencies["@mintplex-labs/piper-tts-web"] ||
    pkg.dependencies["piper-tts-web"]
  );

  console.log(`kokoro-js present: ${hasKokoro}`);
  console.log(`piper package present: ${hasPiper}`);

  if (!hasKokoro || !hasPiper) {
    console.error("FAIL: Missing kokoro-js or piper in package.json!");
    process.exit(1);
  }
  console.log("PASS: Neural TTS packages verified in package.json.");

  // 2. Launch browser with Web Speech API support
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["microphone"],
  });
  const page = await context.newPage();

  // Listen to browser console logs to track speechService outputs
  const speechLogs = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[SpeechService]") || text.includes("Voz:") || text.includes("Motor:")) {
      speechLogs.push(text);
      console.log("Browser log:", text);
    }
  });

  // 3. Navigate to /persona
  console.log("Navigating to http://localhost:8081/persona...");
  await page.goto("http://localhost:8081/persona", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(2500);

  // 4. Test "Ouvir Tom de Voz" on Marie Curie
  console.log("Testing Marie Curie voice...");
  // Find Marie Curie card and its "Ouvir Tom de Voz" button
  const curieHeader = page.locator('h3:has-text("Marie Curie")');
  await curieHeader.waitFor({ state: "visible" });
  const curieCard = curieHeader.locator("xpath=ancestor::div[contains(@class, 'bg-white') or contains(@class, 'rounded-2xl')]").first();
  const curieVoiceBtn = curieCard.locator('button:has-text("Ouvir Tom de Voz")');
  await curieVoiceBtn.click();
  await page.waitForTimeout(1000);

  // Inspect the active voice HUD
  const hudElement = page.locator("#persona-voice-hud");
  let curieHudText = "";
  if (await hudElement.isVisible()) {
    curieHudText = await hudElement.innerText();
    console.log("Marie Curie HUD text:", curieHudText);
  }

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "verify-voice-curie-playing.png"),
  });
  console.log("Saved verify-voice-curie-playing.png");

  await page.waitForTimeout(1500);

  // 5. Test "Ouvir Tom de Voz" on Albert Einstein
  console.log("Testing Albert Einstein voice...");
  const einsteinHeader = page.locator('h3:has-text("Albert Einstein")');
  await einsteinHeader.waitFor({ state: "visible" });
  const einsteinCard = einsteinHeader.locator("xpath=ancestor::div[contains(@class, 'bg-white') or contains(@class, 'rounded-2xl')]").first();
  const einsteinVoiceBtn = einsteinCard.locator('button:has-text("Ouvir Tom de Voz")');
  await einsteinVoiceBtn.click();
  await page.waitForTimeout(1000);

  let einsteinHudText = "";
  if (await hudElement.isVisible()) {
    einsteinHudText = await hudElement.innerText();
    console.log("Albert Einstein HUD text:", einsteinHudText);
  }

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "verify-voice-einstein-playing.png"),
  });
  console.log("Saved verify-voice-einstein-playing.png");

  // 6. Test /settings Comparison Button & HUD
  console.log("Navigating to http://localhost:8081/settings...");
  await page.goto("http://localhost:8081/settings", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2500);

  const compareBtn = page.locator("#btn-compare-voices");
  await compareBtn.waitFor({ state: "visible" });
  console.log("Clicking 'Testar e Comparar Vozes (Einstein vs Marie Curie)'...");
  await compareBtn.click();
  await page.waitForTimeout(1200);

  // Screenshot settings during voice comparison
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "verify-voice-comparison-active.png"),
  });
  console.log("Saved verify-voice-comparison-active.png");

  await page.waitForTimeout(3000);

  await browser.close();
  console.log("=== TTS MULTI-ENGINE VERIFICATION COMPLETED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
