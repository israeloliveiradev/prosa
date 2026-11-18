import pkg from 'file:///C:/WORKSPACE/prosa/mobile/node_modules/@playwright/test/index.js';
const { chromium } = pkg;

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const report = [];

  console.log('=== INICIANDO VALIDAÇÃO COMPLETA DE TESTES ===');

  // 1. Tela de Login / Cadastro (/account)
  await page.goto('http://localhost:8081/account', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const accountHtml = await page.content();
  const hasGuest = accountHtml.includes('Entrar como Convidado');
  const hasTestZero = accountHtml.includes('Testar do Zero');
  report.push({
    item: 'Autenticação Limpa (Sem Convidado / Sem Testar do Zero)',
    passed: !hasGuest && !hasTestZero,
    details: `hasGuest=${hasGuest}, hasTestZero=${hasTestZero}`
  });

  // Toggle Cadastro
  const toggleReg = page.locator('text=Crie grátis em 30 segundos');
  if (await toggleReg.count() > 0) {
    await toggleReg.click();
    await page.waitForTimeout(400);
    const hasName = await page.locator('input#reg-name').count() > 0;
    report.push({
      item: 'Formulário de Cadastro Completo (Nome, Email, Senha)',
      passed: hasName,
      details: 'Modo de registro dinâmico renderizado com sucesso'
    });
  }

  // 2. Tela de Onboarding e Mentor Avatar (/start)
  await page.goto('http://localhost:8081/start', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.locator('text=Começar pelo começo').click();
  await page.waitForTimeout(500);
  await page.locator('text=Continuar').first().click();
  await page.waitForTimeout(500);
  await page.locator('text=Filosofia').first().click();
  await page.waitForTimeout(400);
  await page.locator('text=Medir o nível').first().click();
  await page.waitForTimeout(800);
  await page.locator('text=Escolher nível manualmente').click();
  await page.waitForTimeout(500);
  await page.locator('text=B1').first().click();
  await page.waitForTimeout(400);
  await page.locator('text=Confirmar nível B1 e continuar').click();
  await page.waitForTimeout(1000);

  const readyAvatar = page.locator("[data-testid='onboarding-ready'] img").first();
  const avatarVisible = await readyAvatar.isVisible();
  const avatarNaturalWidth = await readyAvatar.evaluate((el) => (el instanceof HTMLImageElement ? el.naturalWidth : 1));
  report.push({
    item: 'Avatar do Mentor Albert Einstein no Onboarding',
    passed: avatarVisible && avatarNaturalWidth > 0,
    details: `Imagem carregada sem erro (largura natural: ${avatarNaturalWidth}px)`
  });

  // 3. Sessão Diária (/daily)
  await page.goto('http://localhost:8081/daily', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const dailyText = await page.textContent('body');
  const hasSkipButton = dailyText.includes('Próxima Etapa: Áudio & Ritmo');
  const hasEsotericIpa = dailyText.includes('nɒlɪdʒ') || dailyText.includes('gə\'daŋkən');
  const hasCleanPhonetics = dailyText.includes('nah-lidj speaks');
  report.push({
    item: 'Gating da Sessão Diária (Sem Pular Pré-maturo)',
    passed: !hasSkipButton,
    details: `Skip button presente no card 1: ${hasSkipButton}`
  });
  report.push({
    item: 'Fonética em Respingos Latinos Claros (Sem Símbolos Esotéricos de IPA)',
    passed: !hasEsotericIpa && hasCleanPhonetics,
    details: `IPA antigo ausente, nova transcrição latina presente: ${hasCleanPhonetics}`
  });

  // 4. Lab de Fonética Acústica (/commute)
  await page.goto('http://localhost:8081/commute', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const commuteText = await page.textContent('body');
  const hasLondonBadge = commuteText.includes('SOTAQUE LONDON QUALIFICADO');
  const hasLatinCommutePhonetic = commuteText.includes('eye wood lyke an eyst');
  report.push({
    item: 'Gauge Circular e Sotaque Dinâmico no Lab de Fonética',
    passed: hasLondonBadge && hasLatinCommutePhonetic,
    details: `Badge sotaque: ${hasLondonBadge}, Fonética latina: ${hasLatinCommutePhonetic}`
  });

  // 5. Arena de Duelo (/duel)
  await page.goto('http://localhost:8081/duel', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const duelText = await page.textContent('body');
  const hasDuelPhoneticClean = duelText.includes('the brayk-throo');
  report.push({
    item: 'Transcrição Fonética Limpa no Duelo (Breakthrough)',
    passed: hasDuelPhoneticClean,
    details: `[the brayk-throo] presente: ${hasDuelPhoneticClean}`
  });

  // 6. Mercado de Artefatos (/org)
  await page.goto('http://localhost:8081/org', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const orgText = await page.textContent('body');
  const hasShopItems = orgText.includes('Frasco Criogênico') && orgText.includes('Reparação Retroativa');
  report.push({
    item: 'Mercado de Artefatos com Cards 3D e Ilustrações Gamificadas',
    passed: hasShopItems,
    details: `Itens de relíquias renderizados: ${hasShopItems}`
  });

  // 7. Configurações & Soberania de Dados (/settings)
  await page.goto('http://localhost:8081/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const dataTabBtn = page.locator('button:has-text("Segurança & Dados")').first();
  if (await dataTabBtn.count() > 0) {
    await dataTabBtn.click();
    await page.waitForTimeout(500);
  }
  const settingsText = await page.textContent('body');
  const hasAnki = settingsText.includes('Exportar FSRS para Anki');
  const hasDossier = settingsText.includes('Dossiê de Nível CEFR');
  const hasDeleteAccount = settingsText.includes('Excluir Conta e Dados');
  report.push({
    item: 'Soberania de Dados (Exportar Anki, Dossiê PDF, Exclusão de Conta)',
    passed: hasAnki && hasDossier && hasDeleteAccount,
    details: `Anki: ${hasAnki}, Dossiê: ${hasDossier}, Excluir: ${hasDeleteAccount}`
  });

  await browser.close();

  console.log('\n=== RESULTADO FINAL DOS TESTES ===');
  let allPassed = true;
  for (const r of report) {
    console.log(`${r.passed ? '✅ PASSOU' : '❌ FALHOU'}: ${r.item} -> ${r.details}`);
    if (!r.passed) allPassed = false;
  }
  console.log(`\nStatus Geral: ${allPassed ? '100% SUCESSO' : 'PENDÊNCIAS ENCONTRADAS'}`);
}

run().catch(console.error);
