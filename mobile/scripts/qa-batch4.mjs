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
  await page.waitForTimeout(3000);

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

  // Screen 12: /score
  results.push(await testRoute(
    browser,
    'screen12_score_qa',
    'http://localhost:8081/score',
    ['Ligas & Ranking Semanal', 'DIVISÃO ALEXANDER VON HUMBOLDT', 'Helena Becker', 'Gabriel Santos']
  ));

  // Screen 13: /org
  results.push(await testRoute(
    browser,
    'screen13_org_qa',
    'http://localhost:8081/org',
    ['Mercado Oficial Polímata', 'Mercado de Artefatos & Relíquias', 'Preservação de Hábito', 'Congelamento de Ofensiva']
  ));

  // Screen 14: /paywall
  results.push(await testRoute(
    browser,
    'screen14_paywall_qa',
    'http://localhost:8081/paywall',
    ['VIP PASS', '16 Maiores Mentes', 'PROSA PRO', 'Plano Anual']
  ));

  // Screen 15: /settings
  results.push(await testRoute(
    browser,
    'screen15_settings_qa',
    'http://localhost:8081/settings',
    ['Configurações do Sistema', 'Sensibilidade do Microfone', 'Velocidade de Reprodução Padrão', 'Prosa Pro Poliglota']
  ));

  // Screen 16: /account
  results.push(await testRoute(
    browser,
    'screen16_account_qa',
    'http://localhost:8081/account',
    ['Entrar no Prosa', 'Albert Einstein', 'E = mc²', 'Continuar com Google']
  ));

  // Screen 17: /reset
  results.push(await testRoute(
    browser,
    'screen17_reset_qa',
    'http://localhost:8081/reset',
    ['Entrar sem senha no Prosa', 'Sem senhas para esquecer', 'Receber Código de Acesso', 'Continuar com Google']
  ));

  await browser.close();

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${results.filter(Boolean).length} / ${results.length} PASSED`);
  console.log(`========================================\n`);

  if (!results.every(Boolean)) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Fatal QA error:", err);
  process.exit(1);
});

