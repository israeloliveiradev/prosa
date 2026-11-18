import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('mobile/dist-qa');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function runQA() {
  console.log('Launching browser for Screen 2 (Trilha de Aventura)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const errors = [];
  const warnings = [];

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

  console.log('Navigating to http://localhost:8081/ ...');
  await page.goto('http://localhost:8081/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for React hydration
  console.log('Waiting for trail header...');
  await page.waitForSelector('text=Sessão de Imersão: 20 Minutos', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Verificações Visuais de Conteúdo
  const hasImmersion = await page.locator('text=Sessão de Imersão: 20 Minutos').count();
  const hasModule = await page.locator('text=Mente Quântica & Filosofia Natural').count();
  const hasNode1 = await page.locator('text=1. Causalidade & Grund').count();
  const hasNode2 = await page.locator('text=2. Relatividade Léxica').count();
  const hasNode3 = await page.locator('text=Lição 7 • Partículas & Conexões').count();
  const hasBoss = await page.locator('text=Duelo de Síntese: Leonardo da Vinci').count();
  const hasMentor = await page.locator('text=Albert Einstein').count();
  const hasQuests = await page.locator('text=Missões de Hoje').count();
  const hasLeague = await page.locator('text=Liga Diamante').count();
  const hasHelena = await page.locator('text=Helena Meyer').count();

  console.log(`Verifications:
- Sessão de Imersão 20m: ${hasImmersion > 0 ? 'Found' : 'Missing'}
- Módulo Mente Quântica: ${hasModule > 0 ? 'Found' : 'Missing'}
- Node 1 (Causalidade): ${hasNode1 > 0 ? 'Found' : 'Missing'}
- Node 2 (Relatividade): ${hasNode2 > 0 ? 'Found' : 'Missing'}
- Node 3 (Lição 7 Active): ${hasNode3 > 0 ? 'Found' : 'Missing'}
- Boss Battle (Da Vinci): ${hasBoss > 0 ? 'Found' : 'Missing'}
- Mentor Ativo (Einstein): ${hasMentor > 0 ? 'Found' : 'Missing'}
- Missões de Hoje: ${hasQuests > 0 ? 'Found' : 'Missing'}
- Liga Diamante: ${hasLeague > 0 ? 'Found' : 'Missing'}
- Helena Meyer (Top 1): ${hasHelena > 0 ? 'Found' : 'Missing'}
  `);

  // Capture initial pristine screenshot
  const screenshotPath = path.join(outDir, 'screen2-trilha.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved screenshot to ${screenshotPath}`);

  // Test Interactivity: Claim 25 Gems button
  const claimBtn = page.locator('text=Coletar 25');
  if (await claimBtn.count() > 0) {
    console.log('Testing Claim Gems interactive button...');
    await claimBtn.click();
    await page.waitForTimeout(500);
    const claimedCount = await page.locator('text=Coletado ✓').count();
    console.log(`Claim Gems status: ${claimedCount > 0 ? 'SUCCESS (Changed to Coletado ✓)' : 'PENDING'}`);
  }

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

  const success =
    errors.length === 0 &&
    hasImmersion > 0 &&
    hasModule > 0 &&
    hasNode3 > 0 &&
    hasLeague > 0;

  console.log(success ? '>>> QA VALIDATION FOR SCREEN 2 PASSED <<<' : '>>> QA VALIDATION FAILED <<<');
  process.exit(success ? 0 : 1);
}

runQA().catch(err => {
  console.error('QA script failed:', err);
  process.exit(1);
});
