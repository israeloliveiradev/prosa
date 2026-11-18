const { chromium } = require('C:/WORKSPACE/prosa/mobile/node_modules/@playwright/test');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719';
const QA_DIR = path.join(__dirname, '../dist-qa');

if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(30000);

  console.log('--- 1. Testing /daily (English by default or set via localStorage) ---');
  await page.goto('http://localhost:8081/daily');
  await page.waitForTimeout(1500);

  // Set targetLang to 'en' in localStorage and reload
  await page.evaluate(() => {
    localStorage.setItem('prosa_target_lang', 'en');
    localStorage.setItem('prosa_xp', '2450');
    localStorage.setItem('prosa_streak', '14');
  });
  await page.reload();
  await page.waitForTimeout(1500);

  const dailyShot = path.join(ARTIFACT_DIR, 'final-qa-daily.png');
  await page.screenshot({ path: dailyShot, fullPage: false });
  console.log('Saved daily screenshot to', dailyShot);

  console.log('--- 2. Testing /commute ---');
  await page.goto('http://localhost:8081/commute');
  await page.waitForTimeout(1500);
  const commuteShot = path.join(ARTIFACT_DIR, 'final-qa-commute.png');
  await page.screenshot({ path: commuteShot, fullPage: false });
  console.log('Saved commute screenshot to', commuteShot);

  console.log('--- 3. Testing /practice ---');
  await page.goto('http://localhost:8081/practice');
  await page.waitForTimeout(1500);
  const practiceShot = path.join(ARTIFACT_DIR, 'final-qa-practice.png');
  await page.screenshot({ path: practiceShot, fullPage: false });
  console.log('Saved practice screenshot to', practiceShot);

  console.log('--- 4. Testing /news with non-overflowing tooltip ---');
  await page.goto('http://localhost:8081/news');
  await page.waitForTimeout(1500);

  // Click on interactive word to open tooltip
  const wordEl = page.locator('span:has-text("predominates")').first();
  if (await wordEl.isVisible()) {
    await wordEl.click();
    await page.waitForTimeout(600);
  }
  const newsShot = path.join(ARTIFACT_DIR, 'final-qa-news.png');
  await page.screenshot({ path: newsShot, fullPage: false });
  console.log('Saved news screenshot to', newsShot);

  console.log('--- 5. Testing /score (Ligas & Corte de Polímatas) ---');
  await page.goto('http://localhost:8081/score');
  await page.waitForTimeout(1500);
  const scoreShot = path.join(ARTIFACT_DIR, 'final-qa-score.png');
  await page.screenshot({ path: scoreShot, fullPage: false });
  console.log('Saved score screenshot to', scoreShot);

  console.log('--- 6. Testing /memory ---');
  await page.goto('http://localhost:8081/memory');
  await page.waitForTimeout(1500);
  const memoryShot = path.join(ARTIFACT_DIR, 'final-qa-memory.png');
  await page.screenshot({ path: memoryShot, fullPage: false });
  console.log('Saved memory screenshot to', memoryShot);

  console.log('--- 7. Testing /dossier ---');
  await page.goto('http://localhost:8081/dossier');
  await page.waitForTimeout(1500);
  const dossierShot = path.join(ARTIFACT_DIR, 'final-qa-dossier.png');
  await page.screenshot({ path: dossierShot, fullPage: false });
  console.log('Saved dossier screenshot to', dossierShot);

  await browser.close();
  console.log('=== All visual QA tests completed successfully! ===');
}

run().catch((err) => {
  console.error('QA Test Error:', err);
  process.exit(1);
});
