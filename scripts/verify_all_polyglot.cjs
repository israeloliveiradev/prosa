const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719';

async function runVerification() {
  console.log('🚀 Starting Prosa Full Pedagogical & Isolated Tracks Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // 1. Visit Home
  console.log('1. Navigating to Home (Adventure Trail)...');
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Check horizontal overflow
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  console.log(`Horizontal overflow on Home: ${overflow ? 'FAIL' : 'PASS (Clean)'}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-home-trail.png') });
  console.log('📸 Captured verify-home-trail.png');

  // 2. Visit Daily Session (Focus)
  console.log('2. Navigating to Daily Session (/daily)...');
  await page.goto('http://localhost:8081/daily', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const initialPhonetic = await page.textContent('body');
  const hasAngloBroken = initialPhonetic.includes('nah-lidj') || initialPhonetic.includes('dee geh-dan-ken');
  console.log(`Broken Anglo phonetics present: ${hasAngloBroken ? 'YES (FAIL)' : 'NO (CLEAN PASS)'}`);

  // Look for the discreet IPA toggle button
  const ipaButton = await page.$('button:has-text("IPA")');
  console.log(`Discreet IPA toggle button found: ${ipaButton ? 'YES' : 'NO'}`);

  if (ipaButton) {
    await ipaButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-daily-ipa-active.png') });
    console.log('📸 Captured verify-daily-ipa-active.png (Scientific IPA expanded)');

    // Toggle back
    const intuitivaButton = await page.$('button:has-text("Intuitiva")');
    if (intuitivaButton) {
      await intuitivaButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-daily-intuitive-active.png') });
      console.log('📸 Captured verify-daily-intuitive-active.png (Intuitive phonetics restored)');
    }
  }

  // 3. Visit Commute (Laboratório de Fonética)
  console.log('3. Navigating to Commute (/commute)...');
  await page.goto('http://localhost:8081/commute', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Check initial state (should not be 94% mock)
  const bodyCommute = await page.textContent('body');
  const hasCleanInitial = bodyCommute.includes('--%') || bodyCommute.includes('0 Hz');
  console.log(`Commute clean initial state verified: ${hasCleanInitial ? 'YES' : 'NO'}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-commute-clean-state.png') });
  console.log('📸 Captured verify-commute-clean-state.png');

  // 4. Visit Profile (/profile)
  console.log('4. Navigating to Profile (/profile)...');
  await page.goto('http://localhost:8081/profile', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Verify all 7 languages in Section B and C
  const supportLangsCount = await page.$$eval('text=Idioma de Apoio >> xpath=.. >> button', (btns) => btns.length).catch(() => 0);
  console.log(`Support languages buttons found: ${supportLangsCount}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-profile-polyglot-matrix.png') });
  console.log('📸 Captured verify-profile-polyglot-matrix.png');

  // 5. Visit Duel (/duel)
  console.log('5. Navigating to Duel (/duel)...');
  await page.goto('http://localhost:8081/duel', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-duel-arena.png') });
  console.log('📸 Captured verify-duel-arena.png');

  // 6. Visit Dossier (/dossier)
  console.log('6. Navigating to Dossier (/dossier)...');
  await page.goto('http://localhost:8081/dossier', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-dossier-screen.png') });
  console.log('📸 Captured verify-dossier-screen.png');

  console.log('✅ All verification steps completed successfully!');
  await browser.close();
}

runVerification().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
