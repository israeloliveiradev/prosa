import pkg from 'file:///C:/WORKSPACE/prosa/mobile/node_modules/@playwright/test/index.js';
const { chromium } = pkg;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto('http://localhost:8081/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click on "Segurança & Dados" tab
  const dataTab = page.locator('button', { hasText: 'Segurança & Dados' }).first();
  await dataTab.click();
  await page.waitForTimeout(500);

  // Scroll down to see the actions
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);

  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-settings-soberania.png' });
  console.log('Settings Soberania & Dados captured!');
  await browser.close();
}

run().catch(console.error);
