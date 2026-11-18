import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('mobile/dist-qa');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function testRoute(browser, name, url, requiredSelectors) {
  console.log(`\n========================================`);
  console.log(`TESTING ${name} (${url})`);
  console.log(`========================================`);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    const text = msg.text();
    const type = msg.type();
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

  console.log(`Navigating to ${url} ...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  const verificationResults = {};
  for (const sel of requiredSelectors) {
    const count = await page.locator(`text=${sel}`).count();
    verificationResults[sel] = count > 0;
    console.log(`- Checking "${sel}": ${count > 0 ? 'FOUND' : 'MISSING'}`);
  }

  const screenshotPath = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved screenshot to ${screenshotPath}`);

  console.log(`Console Errors: ${errors.length}`);
  if (errors.length > 0) {
    errors.forEach(e => console.error('  ERROR:', e));
  }

  await page.close();

  const allFound = Object.values(verificationResults).every(v => v);
  const passed = errors.length === 0 && allFound;
  console.log(`RESULT FOR ${name}: ${passed ? '>>> PASSED <<<' : '>>> FAILED <<<'}`);
  return passed;
}

async function run() {
  const browser = await chromium.launch();
  const results = [];

  // Screen 8: /persona
  results.push(await testRoute(
    browser,
    'screen8_persona_qa',
    'http://localhost:8081/persona',
    ['Conselho de Sábios', '16 Polímatas Calibrados', 'Sinergia Sináptica', 'Marie Curie']
  ));

  // Screen 9: /commute
  results.push(await testRoute(
    browser,
    'screen9_commute_qa',
    'http://localhost:8081/commute',
    ['LAB DE FONÉTICA ACÚSTICA', 'ESPECTROGRAMA EM TEMPO REAL', 'Analisador Acústico Duplo', 'Decomposição Fonema por Fonema']
  ));

  // Screen 10: /practice
  results.push(await testRoute(
    browser,
    'screen10_practice_qa',
    'http://localhost:8081/practice',
    ['Oficina de Sintaxe', 'Leonardo da Vinci', 'Kausalsätze', 'Bancada de Montagem']
  ));

  // Screen 11: /news
  results.push(await testRoute(
    browser,
    'screen11_news_qa',
    'http://localhost:8081/news',
    ['Leitor Imersivo Polímata', 'Franz Kafka', 'Erster Abschnitt', 'ungeheuren']
  ));

  await browser.close();

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${results.filter(Boolean).length} / ${results.length} PASSED`);
  console.log(`========================================`);

  if (!results.every(Boolean)) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});

