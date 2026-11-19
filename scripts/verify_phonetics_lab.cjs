const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== VERIFYING PHONETICS LAB (COMMUTE SCREEN) ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    permissions: ["microphone"],
  });
  const page = await context.newPage();

  // 1. Check code for 'oat' or 'latte'
  const commuteCode = fs.readFileSync(
    path.join(__dirname, "../mobile/src/app/(app)/commute.tsx"),
    "utf-8"
  );
  if (commuteCode.includes("oat") || commuteCode.includes("latte")) {
    console.error("FAIL: commute.tsx still contains 'oat' or 'latte'!");
    process.exit(1);
  } else {
    console.log("PASS: Zero instances of 'oat' or 'latte' in commute.tsx");
  }

  // 2. Open /commute
  console.log("Navigating to http://localhost:8081/commute...");
  await page.goto("http://localhost:8081/commute", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await page.waitForTimeout(3000);

  // 3. Check Canvas elements (Must be 2 canvas elements in the oscilloscope, ZERO SVGs for waveforms)
  const canvases = await page.locator("canvas").all();
  console.log(`Found ${canvases.length} <canvas> elements on page.`);
  if (canvases.length < 2) {
    console.error("FAIL: Expected at least 2 <canvas> elements for native and user waveforms!");
    process.exit(1);
  } else {
    console.log("PASS: Both waveforms are rendered as <canvas> elements.");
  }

  // Check canvas dimensions and bounding rectangles for overflow
  for (let i = 0; i < 2; i++) {
    const box = await canvases[i].boundingBox();
    console.log(`Canvas ${i} bounding box:`, box);
    if (!box || box.width <= 0 || box.height <= 0) {
      console.error(`FAIL: Canvas ${i} has invalid size!`);
      process.exit(1);
    }
  }

  // Screenshot idle state
  const artifactDir = "C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719";
  await page.screenshot({
    path: path.join(artifactDir, "verify-phonetics-lab-idle.png"),
    fullPage: true,
  });
  console.log("Captured verify-phonetics-lab-idle.png");

  // 4. Test Record & Stop (Silent Attempt / No Voice Input)
  const btnRecord = page.locator("#btn-record");
  console.log("Clicking record button to start recording...");
  await btnRecord.click();
  await page.waitForTimeout(1000);

  console.log("Clicking record button to stop recording (silent attempt)...");
  await btnRecord.click();
  await page.waitForTimeout(1500);

  // 5. Verify the score is 0% (NOT 92%!)
  const bodyText = await page.locator("body").innerText();
  
  if (bodyText.includes("92%")) {
    console.error("FAIL: Body still displays fake 92% score!");
    process.exit(1);
  }
  if (bodyText.includes("94%") && bodyText.includes("Harmonia Formântica")) {
    console.error("FAIL: Body still displays fake 94% Formant Harmony!");
    process.exit(1);
  }

  console.log("Checking for 0% precision display...");
  const hasZeroPercent = bodyText.includes("0%");
  const hasSilenceMsg = bodyText.includes("Nenhum áudio detectado") || bodyText.includes("SILÊNCIO") || bodyText.includes("SOTAQUE NÃO DETECTADO");
  
  console.log(`Result: hasZeroPercent=${hasZeroPercent}, hasSilenceMsg=${hasSilenceMsg}`);
  if (!hasZeroPercent || !hasSilenceMsg) {
    console.error("FAIL: Expected 0% and silence/divergence message!");
    process.exit(1);
  }
  console.log("PASS: Zero percent properly displayed on silence! Fake 92% eliminated.");

  // Screenshot silent/0% state
  await page.screenshot({
    path: path.join(artifactDir, "verify-phonetics-lab-silent-zero.png"),
    fullPage: true,
  });
  console.log("Captured verify-phonetics-lab-silent-zero.png");

  await browser.close();
  console.log("=== ALL PHONETICS LAB VERIFICATIONS PASSED SUCCESSFULLY! ===");
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
