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
  console.log('Launching browser for Batch 2...');
  const browser = await chromium.launch({ headless: true });

  const results = {};

  // Tela 4: Resumo Pós-Sessão
  results['screen4-summary'] = await testRoute(
    browser,
    'screen4-summary',
    'http://localhost:8081/summary',
    [
      'SESSÃO DIÁRIA CONCLUÍDA',
      '20 Minutos de',
      'Palácio da Memória: 4 Termos Ancorados',
      'Diálogo dos Mentores Polímatas',
      'Ir para o Palácio da Memória FSRS',
    ]
  );

  // Tela 5: Teste de Nivelamento CEFR
  results['screen5-placement'] = await testRoute(
    browser,
    'screen5-placement',
    'http://localhost:8081/placement',
    [
      'Calibração Adaptativa',
      'Questão 4 de 10',
      'Leonardo da Vinci',
      'Estruture a Oração Causal',
      'Verificar Resposta',
    ]
  );

  // Tela 6: Arena de Duelo 120s
  results['screen6-duel'] = await testRoute(
    browser,
    'screen6-duel',
    'http://localhost:8081/duel',
    [
      'Duelo Relâmpago 120s',
      'Gabriel Santos',
      'Elena Rostova',
      'die Herausforderung',
      'O Desafio',
    ]
  );

  // Tela 7: Palácio da Memória & FSRS
  results['screen7-memory'] = await testRoute(
    browser,
    'screen7-memory',
    'http://localhost:8081/memory',
    [
      'Palácio da Memória',
      'Marie Curie',
      'Iniciar Revisão Diária FSRS',
      'der Schmetterling',
      'Matriz Ativa de Retenção Lexical',
    ]
  );

  await browser.close();

  console.log('\n========================================');
  console.log('BATCH 2 SUMMARY:');
  console.log(results);
  const allPassed = Object.values(results).every(r => r);
  console.log(allPassed ? '>>> ALL 4 SCREENS PASSED <<<' : '>>> SOME SCREENS FAILED <<<');
  process.exit(allPassed ? 0 : 1);
}

run().catch(err => {
  console.error('Fatal error in QA script:', err);
  process.exit(1);
});

