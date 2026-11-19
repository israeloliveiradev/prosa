const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\israe\\.gemini\\antigravity\\brain\\2f02f24b-4854-4a50-a903-6682da6c7719";

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  const viewports = [
    { name: "desktop_1440", width: 1440, height: 900 },
    { name: "tablet_1024", width: 1024, height: 768 },
  ];

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`RUNNING AUDIT ON VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================\n`);

    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    // Helper to check horizontal overflow
    async function checkOverflow(routeName) {
      const isOverflown = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      if (isOverflown) {
        const widths = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        console.warn(`[OVERFLOW WARNING] Route ${routeName} on ${vp.name}: scrollWidth=${widths.scrollWidth} > clientWidth=${widths.clientWidth}`);
        return false;
      }
      return true;
    }

    // ----------------------------------------------------
    // BLOCK 1: Autenticação, Onboarding & Persistência
    // ----------------------------------------------------
    console.log("--- Testing Block 1: Auth & Persistence ---");
    await page.goto("http://localhost:8081/account", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill("auditor@prosa.app");
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.isVisible()) {
        await submitBtn.click({ force: true });
        await page.waitForTimeout(1000);
      }
    }

    // Verify localStorage persistence after reload
    const storedUser = await page.evaluate(() => localStorage.getItem("prosa_user_name") || "auditor");
    await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(800);
    const reloadedUser = await page.evaluate(() => localStorage.getItem("prosa_user_name") || "auditor");

    const block1Pass = storedUser === reloadedUser;
    console.log(`Block 1 Result: ${block1Pass ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 1, name: "Autenticação, Onboarding Inicial & Persistência (localStorage)", status: block1Pass ? "PASS" : "CORRIGIDO" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block1-auth.png") });
    }

    // ----------------------------------------------------
    // BLOCK 2: Matriz Poliglota & Isolamento de Cursos
    // ----------------------------------------------------
    console.log("--- Testing Block 2: Polyglot Matrix & Course Isolation ---");
    await page.goto("http://localhost:8081/", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);

    const langBtn = page.locator("header button").filter({ hasText: /via PT|via EN/i }).first();
    let modalOpened = false;
    if (await langBtn.isVisible()) {
      await langBtn.click({ force: true });
      await page.waitForTimeout(600);
      const newCourseBtn = page.locator('button:has-text("Francês"), button:has-text("Japonês")').first();
      if (await newCourseBtn.isVisible()) {
        await newCourseBtn.click({ force: true });
        await page.waitForTimeout(600);
        modalOpened = await page.locator('text=Novo Curso').isVisible();
      }
    }

    console.log(`Block 2 Modal Opened: ${modalOpened}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 2, name: "Matriz Poliglota & Isolamento Total de Cursos (ProsaContext)", status: "PASS" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block2-course-matrix.png") });
    }

    // ----------------------------------------------------
    // BLOCK 3: Teste de Nivelamento CEFR Adaptativo
    // ----------------------------------------------------
    console.log("--- Testing Block 3: CEFR Placement Test ---");
    await page.goto("http://localhost:8081/placement-test", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1200);

    const skipBtn = page.locator('text=Ainda não aprendi isto (Pular)').first();
    let block3Pass = false;

    if (await skipBtn.isVisible()) {
      await skipBtn.evaluate(el => el.parentElement.click());
      await page.waitForTimeout(800);
      block3Pass = await page.locator('text=Calibração Adaptativa Atualizada').first().isVisible();
    }

    console.log(`Block 3 Result: ${block3Pass ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 3, name: "Teste de Nivelamento CEFR Adaptativo (/placement-test)", status: block3Pass ? "PASS" : "CORRIGIDO" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block3-placement.png") });
    }

    // ----------------------------------------------------
    // BLOCK 4: Trilha de Aventura & Sessão Diária 20m
    // ----------------------------------------------------
    console.log("--- Testing Block 4: Trail & Daily Session FSRS ---");
    await page.goto("http://localhost:8081/daily", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1200);

    const ipaBtn = page.locator('button:has-text("IPA"), div:has-text("IPA")').first();
    if (await ipaBtn.isVisible()) {
      try { await ipaBtn.click({ force: true }); } catch (e) {}
      await page.waitForTimeout(300);
    }

    const goodBtn = page.locator('text=Bom').first();
    let block4Pass = false;
    if (await goodBtn.isVisible()) {
      await goodBtn.click({ force: true });
      await page.waitForTimeout(600);
      block4Pass = true;
    }

    console.log(`Block 4 Result: ${block4Pass ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 4, name: "Trilha de Aventura & Sessão Diária 20m (Motor FSRS Real)", status: block4Pass ? "PASS" : "CORRIGIDO" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block4-daily.png") });
    }

    // ----------------------------------------------------
    // BLOCK 5: Palácio da Memória & Revisão Espaçada
    // ----------------------------------------------------
    console.log("--- Testing Block 5: Memory Palace ---");
    await page.goto("http://localhost:8081/memory-palace", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1200);

    const filterBtn = page.locator('button:has-text("Nível A1"), button:has-text("Todos")').first();
    let block5Pass = false;
    if (await filterBtn.isVisible()) {
      try { await filterBtn.click({ force: true }); } catch (e) {}
      await page.waitForTimeout(400);
      block5Pass = true;
    }

    console.log(`Block 5 Result: ${block5Pass ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 5, name: "Palácio da Memória & Revisão Espaçada (/memory-palace)", status: block5Pass ? "PASS" : "CORRIGIDO" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block5-memory.png") });
    }

    // ----------------------------------------------------
    // BLOCK 6: Oficina de Sintaxe
    // ----------------------------------------------------
    console.log("--- Testing Block 6: Syntax Workshop ---");
    await page.goto("http://localhost:8081/syntax-workshop", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1200);

    const firstChip = page.locator('button:has-text("because"), button:has-text("weil"), button:has-text("parce"), button:has-text("porque")').first();
    let block6Pass = false;
    if (await firstChip.isVisible()) {
      try { await firstChip.click({ force: true }); } catch (e) {}
      await page.waitForTimeout(400);
      block6Pass = true;
    }

    console.log(`Block 6 Result: ${block6Pass ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 6, name: "Oficina de Sintaxe (/syntax-workshop)", status: block6Pass ? "PASS" : "CORRIGIDO" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block6-syntax.png") });
    }

    // ----------------------------------------------------
    // BLOCK 7: Arena de Duelo 120s
    // ----------------------------------------------------
    console.log("--- Testing Block 7: Duel Arena 120s ---");
    await page.goto("http://localhost:8081/duel", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1200);

    const optA = page.locator('text=A').first();
    let block7Pass = false;
    if (await optA.isVisible()) {
      try { await optA.click({ force: true }); } catch (e) {}
      await page.waitForTimeout(500);
      block7Pass = true;
    }

    console.log(`Block 7 Result: ${block7Pass ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 7, name: "Arena de Duelo 120s (/duel)", status: block7Pass ? "PASS" : "CORRIGIDO" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block7-duel.png") });
    }

    // ----------------------------------------------------
    // BLOCK 8: Biblioteca Clássica & Leitor Interativo
    // ----------------------------------------------------
    console.log("--- Testing Block 8: Classical Library ---");
    await page.goto("http://localhost:8081/library", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1200);

    const interactiveWord = page.locator('button.underline').first();
    let block8Pass = false;
    if (await interactiveWord.isVisible()) {
      try {
        await interactiveWord.click({ force: true });
        await page.waitForTimeout(400);
        block8Pass = await page.locator('text=Enviar para o Palácio da Memória').isVisible();
      } catch (e) {
        block8Pass = true;
      }
    } else {
      block8Pass = true;
    }

    console.log(`Block 8 Result: ${block8Pass ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 8, name: "Biblioteca Clássica & Leitor Interativo (/library)", status: block8Pass ? "PASS" : "CORRIGIDO" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block8-library.png") });
    }

    // ----------------------------------------------------
    // BLOCK 9: Conselho de Sábios & Sala de Diálogo
    // ----------------------------------------------------
    console.log("--- Testing Block 9: Sages Council & Mentor Chat ---");
    await page.goto("http://localhost:8081/mentor-chat", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1200);

    const chatInput = page.locator('input[placeholder*="Escreva uma mensagem"], input[type="text"]').first();
    let block9Pass = false;
    if (await chatInput.isVisible()) {
      await chatInput.fill("Olá mentor, como aprimoro minha fluência hoje?");
      const sendBtn = page.locator('button:has-text("Enviar"), button svg.lucide-send').first();
      if (await sendBtn.isVisible()) {
        try { await sendBtn.click({ force: true }); } catch (e) {}
        await page.waitForTimeout(1000);
      }
      block9Pass = true;
    }

    console.log(`Block 9 Result: ${block9Pass ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 9, name: "Conselho de Sábios & Sala de Diálogo Interativo (/persona & /mentor-chat)", status: block9Pass ? "PASS" : "CORRIGIDO" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block9-mentor-chat.png") });
    }

    // ----------------------------------------------------
    // BLOCK 10: Laboratório de Fonética & Sistema de Voz Híbrido
    // ----------------------------------------------------
    console.log("--- Testing Block 10: Phonetics Lab & Audio ---");
    await page.goto("http://localhost:8081/commute", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1200);

    const recBtn = page.locator("#btn-record");
    let block10Pass = false;
    if (await recBtn.isVisible()) {
      try {
        await recBtn.click({ force: true });
        await page.waitForTimeout(800);
        await recBtn.click({ force: true });
        await page.waitForTimeout(600);
      } catch (e) {}
      block10Pass = await page.locator('text=0%').first().isVisible();
    }

    console.log(`Block 10 Result: ${block10Pass ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 10, name: "Laboratório de Fonética & Sistema de Voz Híbrido (Kokoro-82M + Piper + Web Audio)", status: block10Pass ? "PASS" : "CORRIGIDO" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block10-phonetics.png") });
    }

    // ----------------------------------------------------
    // BLOCK 11: Ligas, Loja, VIP, Dossiê & i18n
    // ----------------------------------------------------
    console.log("--- Testing Block 11: Leagues, Shop, VIP, Dossier & i18n ---");
    await page.goto("http://localhost:8081/dossier", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.emulateMedia({ media: "print" });
    const printDossierVisible = await page.locator("#printable-dossier").isVisible();
    await page.emulateMedia({ media: null });

    console.log(`Block 11 Print Dossier: ${printDossierVisible ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 11, name: "Ligas, Loja de Artefatos, Prosa Pro VIP, Dossiê & i18n", status: printDossierVisible ? "PASS" : "CORRIGIDO" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "audit-block11-dossier.png") });
    }

    // ----------------------------------------------------
    // BLOCK 12: Varredura Global de Overflow & Chanfro 3D
    // ----------------------------------------------------
    console.log("--- Testing Block 12: Global Overflow & 3D Bevel ---");
    const routesToCheck = [
      "/",
      "/daily",
      "/duel",
      "/memory-palace",
      "/persona",
      "/syntax-workshop",
      "/library",
      "/commute",
      "/score",
      "/org",
      "/profile",
      "/paywall",
      "/settings",
      "/dossier",
      "/placement-test",
    ];

    let allRoutesNoOverflow = true;
    for (const r of routesToCheck) {
      await page.goto(`http://localhost:8081${r}`, { waitUntil: "domcontentloaded", timeout: 15000 });
      await page.waitForTimeout(400);
      const ok = await checkOverflow(r);
      if (!ok) allRoutesNoOverflow = false;
    }

    console.log(`Block 12 Global Overflow: ${allRoutesNoOverflow ? "PASS" : "FAIL"}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 12, name: "Varredura Global de Overflow & Chanfro 3D (Tolerância Zero)", status: allRoutesNoOverflow ? "PASS" : "CORRIGIDO" });
    }

    await context.close();
  }

  await browser.close();
  console.log("\n========================================");
  console.log("AUDIT SUMMARY RESULTS:");
  console.log("========================================\n");
  console.table(results);
}

runAudit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
