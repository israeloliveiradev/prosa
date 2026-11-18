import pkg from 'file:///C:/WORKSPACE/prosa/mobile/node_modules/@playwright/test/index.js';
const { chromium } = pkg;
import fs from 'fs';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('1. Testing /account screen...');
  await page.goto('http://localhost:8081/account', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check no guest or test zero buttons
  const bodyText = await page.textContent('body');
  const hasGuest = bodyText.includes('Entrar como Convidado');
  const hasTestZero = bodyText.includes('Testar do Zero');
  console.log('Has "Entrar como Convidado":', hasGuest, '(should be false)');
  console.log('Has "Testar do Zero":', hasTestZero, '(should be false)');

  // Take screenshot of account screen
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-account-clean.png' });

  // Test registration mode toggle
  const createAccountBtn = page.locator('text=Crie grátis em 30 segundos');
  if (await createAccountBtn.count() > 0) {
    await createAccountBtn.click();
    await page.waitForTimeout(500);
    const hasNameInput = await page.locator('input#reg-name').count() > 0;
    console.log('Registration mode active (has reg-name input):', hasNameInput);
    await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-account-register.png' });
  }

  // 2. Testing /org (Shop / Artifacts)
  console.log('2. Testing /org (Artifacts)...');
  await page.goto('http://localhost:8081/org', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-org-artifacts.png' });

  // 3. Testing /commute
  console.log('3. Testing /commute...');
  await page.goto('http://localhost:8081/commute', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-commute-clean.png' });

  // 4. Testing /settings
  console.log('4. Testing /settings...');
  await page.goto('http://localhost:8081/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // Switch to data tab if available
  const dataTab = page.locator('button:has-text("Soberania"), button:has-text("Dados"), button:has-text("FSRS")').first();
  if (await dataTab.count() > 0) {
    await dataTab.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-settings-clean.png' });

  // 5. Testing /daily
  console.log('5. Testing /daily (Progression & Gating)...');
  await page.goto('http://localhost:8081/daily', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const dailyText = await page.textContent('body');
  const hasSkipBtn = dailyText.includes('Próxima Etapa: Áudio & Ritmo');
  console.log('Has premature skip button on card 1:', hasSkipBtn, '(should be false)');
  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-daily-gated.png' });

  await browser.close();
  console.log('QA completed successfully!');
}

run().catch(console.error);
