import pkg from 'file:///C:/WORKSPACE/prosa/mobile/node_modules/@playwright/test/index.js';
const { chromium } = pkg;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:8081/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Tab 1 (Audio)
  let content = await page.textContent('body');
  console.log('Audio tab active, has Calibração de Áudio:', content.includes('Calibração de Áudio'));
  console.log('Audio tab active, has Ritmo Circadiano:', content.includes('Ritmo Circadiano'));

  // Click Tab 2 (Rhythm)
  await page.locator('button:has-text("Notificações")').click();
  await page.waitForTimeout(400);
  content = await page.textContent('body');
  console.log('Rhythm tab active, has Ritmo Circadiano:', content.includes('Ritmo Circadiano'));
  console.log('Rhythm tab active, has Calibração de Áudio:', content.includes('Calibração de Áudio'));

  // Click Tab 3 (Subscription)
  await page.locator('button:has-text("Assinatura")').click();
  await page.waitForTimeout(400);
  content = await page.textContent('body');
  console.log('Sub tab active, has Gestão de Assinatura:', content.includes('Gestão de Assinatura'));

  // Click Tab 4 (Data)
  await page.locator('button:has-text("Segurança")').click();
  await page.waitForTimeout(400);
  content = await page.textContent('body');
  console.log('Data tab active, has Exportação de Dados:', content.includes('Exportação de Dados'));

  await page.screenshot({ path: 'C:/Users/israe/.gemini/antigravity/brain/2f02f24b-4854-4a50-a903-6682da6c7719/qa-settings-tabs-working.png' });
  await browser.close();
  console.log('Tabs QA finished successfully!');
}

run().catch(console.error);
