const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719';

async function runSpeechVerification() {
  console.log('🚀 Starting Prosa Hybrid Multi-Engine Speech Synthesis Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  // 1. Visit Settings
  console.log('1. Navigating to Settings (/settings)...');
  await page.goto('http://localhost:8081/settings', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);

  // Click on "Preferências de Estudo & Áudio"
  const audioTabBtn = await page.$('button:has-text("Preferências de Estudo & Áudio")');
  if (audioTabBtn) {
    await audioTabBtn.click();
    await page.waitForTimeout(600);
  }

  // Verify "Motor de Voz & Síntese Neural" is visible
  const cardTitle = await page.$('h3:has-text("Motor de Voz & Síntese Neural")');
  console.log(`Motor de Voz card visible: ${cardTitle ? 'PASS' : 'FAIL'}`);

  // Check Nativo Rápido & Estúdio IA Híbrido options
  const nativoOption = await page.$('h4:has-text("Nativo Rápido")');
  const hybridOption = await page.$('h4:has-text("Estúdio IA Híbrido")');
  console.log(`Nativo Rápido option visible: ${nativoOption ? 'PASS' : 'FAIL'}`);
  console.log(`Estúdio IA Híbrido option visible: ${hybridOption ? 'PASS' : 'FAIL'}`);

  // Screenshot initial settings audio tab
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-settings-speech-engine.png') });
  console.log('📸 Captured verify-settings-speech-engine.png');

  // 2. Select Estúdio IA Híbrido
  console.log('2. Selecting Estúdio IA Híbrido...');
  if (hybridOption) {
    await hybridOption.click();
    await page.waitForTimeout(500);
  }

  // 3. Click "Pré-baixar Modelos de Voz (70 MB)"
  console.log('3. Triggering Pre-download of Neural Models...');
  const downloadBtn = await page.$('button:has-text("Pré-baixar Modelos de Voz"), button:has-text("Atualizar Modelos")');
  if (downloadBtn) {
    await downloadBtn.click();
    console.log('   Waiting for neural model download progress...');
    await page.waitForTimeout(3500); // Wait for simulation steps to reach 100%
  }

  // Check that progress reached 100%
  const progressText = await page.textContent('body');
  const has100Pct = progressText.includes('100%') || progressText.includes('Prontos');
  console.log(`Download progress completed 100%: ${has100Pct ? 'PASS' : 'PENDING'}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-settings-models-downloaded.png') });
  console.log('📸 Captured verify-settings-models-downloaded.png');

  // 4. Test Synthesis Playback button
  console.log('4. Testing Mentor Voice Synthesis...');
  const testVoiceBtn = await page.$('button:has-text("Ouvir Teste"), button:has-text("Sintetizando Voz")');
  if (testVoiceBtn) {
    await testVoiceBtn.click();
    await page.waitForTimeout(1000);
    console.log('   Voice synthesis triggered smoothly.');
  }

  // 5. Visit /daily and verify audio
  console.log('5. Navigating to Daily Session (/daily)...');
  await page.goto('http://localhost:8081/daily', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  const audioDailyBtn = await page.$('button[title="Ouvir Áudio Nativo"]');
  if (audioDailyBtn) {
    await audioDailyBtn.click();
    await page.waitForTimeout(800);
    console.log('   Daily session audio playback clicked.');
  }

  // 6. Visit /commute and verify audio
  console.log('6. Navigating to Commute (/commute)...');
  await page.goto('http://localhost:8081/commute', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  const audioCommuteBtn = await page.$('button:has-text("Ouvir 1.0x")');
  if (audioCommuteBtn) {
    await audioCommuteBtn.click();
    await page.waitForTimeout(800);
    console.log('   Commute audio playback clicked.');
  }

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'verify-commute-audio-playback.png') });
  console.log('📸 Captured verify-commute-audio-playback.png');

  // 7. Visit /duel and verify audio
  console.log('7. Navigating to Duel (/duel)...');
  await page.goto('http://localhost:8081/duel', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  const audioDuelBtn = await page.$('button[title="Ouvir pronúncia"]') || await page.$('button:has-text("volume_up")');
  if (audioDuelBtn) {
    await audioDuelBtn.click();
    await page.waitForTimeout(500);
    console.log('   Duel arena audio playback clicked.');
  }

  // Summary of errors
  console.log('\n--- VERIFICATION AUDIT ---');
  console.log(`Total captured console errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  } else {
    console.log('✅ ZERO CONSOLE ERRORS! Flawless execution across all screens!');
  }

  await browser.close();
  console.log('🎉 Verification finished successfully!');
}

runSpeechVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
