import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('mobile/dist-qa');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runQA() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const errors = [];
  const warnings = [];

  page.on('requestfailed', req => {
    console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText);
  });

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push(`[${type}] ${text}`);
    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      if (!text.includes('DeprecationWarning') && !text.includes('Unknown at rule')) {
        warnings.push(text);
      }
    }
  });

  page.on('pageerror', err => {
    errors.push(err.toString());
  });

  console.log('Navigating to http://localhost:8081/profile ...');
  try {
    await page.goto('http://localhost:8081/profile', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('Fallback waiting on domcontentloaded...');
    await page.goto('http://localhost:8081/profile', { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  await page.waitForTimeout(3000);

  console.log('Current URL:', page.url());
  const screenshotPath = path.join(outDir, 'screen1-profile.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved screenshot to ${screenshotPath}`);

  const title = await page.title();
  console.log(`Page title: ${title}`);

  const hasGabriel = await page.locator('text=Gabriel Santos').count();
  const hasAlemão = await page.locator('text=Alemão').count();
  const hasEinstein = await page.locator('text=Albert Einstein').count();
  const hasB2 = await page.locator('text=Nível B2').count();

  console.log(`Verifications:
- User Gabriel Santos: ${hasGabriel > 0 ? 'Found' : 'Missing'}
- Language Alemão: ${hasAlemão > 0 ? 'Found' : 'Missing'}
- Mentor Albert Einstein: ${hasEinstein > 0 ? 'Found' : 'Missing'}
- CEFR Level B2: ${hasB2 > 0 ? 'Found' : 'Missing'}
  `);

  console.log(`Total console logs: ${consoleLogs.length}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.error('Errors found:');
    errors.forEach(e => console.error('  - ', e));
  }
  console.log(`Warnings: ${warnings.length}`);
  if (warnings.length > 0) {
    console.warn('Warnings found:');
    warnings.forEach(w => console.warn('  - ', w));
  }

  await browser.close();

  const success = errors.length === 0 && hasGabriel > 0 && hasAlemão > 0;
  console.log(success ? '>>> QA VALIDATION PASSED <<<' : '>>> QA VALIDATION FAILED <<<');
  process.exit(success ? 0 : 1);
}

runQA().catch(err => {
  console.error('QA script failed:', err);
  process.exit(1);
});
