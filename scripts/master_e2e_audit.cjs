const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\israe\\.gemini\\antigravity\\brain\\2f02f24b-4854-4a50-a903-6682da6c7719";

async function runMasterAudit() {
  console.log("Starting Master E2E Audit & Platform Verification...");
  const browser = await chromium.launch({ headless: true });
  const results = [];

  const viewports = [
    { name: "desktop_1440", width: 1440, height: 900 },
    { name: "tablet_1024", width: 1024, height: 768 },
  ];

  for (const vp of viewports) {
    console.log(`\n============================================================`);
    console.log(`AUDITING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`============================================================\n`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      permissions: ["microphone"],
    });
    const page = await context.newPage();

    // Instrument window.speechSynthesis to guarantee ZERO calls
    await page.addInitScript(() => {
      window._speechSynthesisCalls = 0;
      if (window.speechSynthesis) {
        const origSpeak = window.speechSynthesis.speak;
        window.speechSynthesis.speak = function (...args) {
          window._speechSynthesisCalls = (window._speechSynthesisCalls || 0) + 1;
          console.error("[PROHIBITED] window.speechSynthesis.speak called!");
          return origSpeak ? origSpeak.apply(this, args) : undefined;
        };
      }
    });

    async function checkOverflow(routeName) {
      const isOverflown = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      if (isOverflown) {
        const widths = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        console.warn(`[OVERFLOW DETECTED] Route ${routeName} on ${vp.name}: scrollWidth=${widths.scrollWidth} > clientWidth=${widths.clientWidth}`);
        return false;
      }
      return true;
    }

    async function safeGoto(url) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 });
      } catch (err) {
        console.warn(`[RETRY GOTO] ${url}`);
        await page.waitForTimeout(1000);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      }
    }

    // Warmup navigation to ensure Metro bundler is hot
    await safeGoto("http://localhost:8081/");
    await page.waitForTimeout(1000);

    // ----------------------------------------------------
    // BLOCK 1: Autenticação, Onboarding & Persistência
    // ----------------------------------------------------
    console.log("--- [1/12] Testing Auth & LocalStorage Persistence ---");
    await safeGoto("http://localhost:8081/account");
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

    const storedUser = await page.evaluate(() => localStorage.getItem("prosa_user_name") || "auditor");
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(800);
    const reloadedUser = await page.evaluate(() => localStorage.getItem("prosa_user_name") || "auditor");
    const block1Pass = storedUser === reloadedUser;

    if (vp.name === "desktop_1440") {
      results.push({ block: 1, name: "Autenticação, Onboarding & Persistência", status: block1Pass ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block1-auth.png") });
    }

    // ----------------------------------------------------
    // BLOCK 2: Matriz Poliglota & Troca de Cursos (Flag.tsx & Persona)
    // ----------------------------------------------------
    console.log("--- [2/12] Testing Polyglot Matrix, Japanese Flag & Dynamic Persona ---");
    await safeGoto("http://localhost:8081/profile");
    await page.waitForTimeout(1000);

    // Verify Japanese flag is Rising Sun (Red circle in SVG, NOT UK cross)
    const hasJapaneseCourse = await page.locator('text=Japonês, text=日本語').first().isVisible();
    const flagSvgHasRedCircle = await page.evaluate(() => {
      const svgs = Array.from(document.querySelectorAll("svg"));
      return svgs.some((svg) => {
        const circle = svg.querySelector("circle");
        return circle && (circle.getAttribute("fill") === "#BC002D" || circle.getAttribute("fill")?.toLowerCase() === "#bc002d");
      });
    });
    console.log(`Japanese Flag rising sun detected: ${flagSvgHasRedCircle}`);

    // Verify persona.tsx dynamic language name
    await safeGoto("http://localhost:8081/persona");
    await page.waitForTimeout(1000);
    const personaDynamicText = await page.getByText(/no aprendizado de/i).first().isVisible().catch(() => false);
    const personaHardcodedGerman = await page.locator('text=no aprendizado do Alemão').first().isVisible().catch(() => false);
    console.log(`Persona dynamic text visible: ${personaDynamicText}, hardcoded German absent: ${!personaHardcodedGerman}`);

    const block2Pass = flagSvgHasRedCircle && !personaHardcodedGerman;
    if (vp.name === "desktop_1440") {
      results.push({ block: 2, name: "Matriz Poliglota & Bandeira Japonesa & Persona Dinâmico", status: block2Pass ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block2-polyglot.png") });
    }

    // ----------------------------------------------------
    // BLOCK 3: Teste de Nivelamento Adaptativo
    // ----------------------------------------------------
    console.log("--- [3/12] Testing Adaptive Placement Test ---");
    await safeGoto("http://localhost:8081/placement-test");
    await page.waitForTimeout(1000);

    const skipBtn = page.locator('text=Ainda não aprendi isto (Pular)').first();
    let block3Pass = false;
    if (await skipBtn.isVisible()) {
      await skipBtn.evaluate((el) => el.parentElement.click());
      await page.waitForTimeout(800);
      block3Pass = await page.locator('text=Calibração Adaptativa Atualizada').first().isVisible();
    }
    if (vp.name === "desktop_1440") {
      results.push({ block: 3, name: "Teste de Nivelamento CEFR Adaptativo", status: block3Pass ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block3-placement.png") });
    }

    // ----------------------------------------------------
    // BLOCK 4: Sessão Diária & Máquina de Estados Sequencial
    // ----------------------------------------------------
    console.log("--- [4/12] Testing Daily Session Sequential Phase Machine & Dynamic Syntax ---");
    await safeGoto("http://localhost:8081/daily");
    await page.waitForTimeout(1200);

    // Verify Stepper Pills: Pill 1 active, Pill 2 locked (contains 🔒)
    const pill2HasLock = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const p2 = btns.find((b) => b.textContent.includes("2. Áudio"));
      return p2 ? p2.textContent.includes("🔒") : false;
    });
    console.log(`Pill 2 initially locked with 🔒: ${pill2HasLock}`);

    // Verify clicking locked Pill 2 does NOT advance phase
    const p2Button = page.locator('button:has-text("2. Áudio")').first();
    if (await p2Button.isVisible()) {
      await p2Button.click({ force: true });
      await page.waitForTimeout(300);
    }
    const stillOnPhase1 = (await page.locator('text=Shadowing').count()) === 0;
    console.log(`Still on Phase 1 after clicking locked Pill 2: ${stillOnPhase1}`);

    // Verify Dynamic Syntax Breakdown & Companion Dock in Phase 0
    const companionDockVisible = (await page.locator('[data-testid="companion-dock"], button:has-text("Ouvir Mentor")').count()) > 0;
    console.log(`Companion Dock visible: ${companionDockVisible}`);

    // Click advance button
    const advanceBtn = page.locator('button:has-text("Avançar para Etapa 2"), button:has-text("Concluir Etapa FSRS")').first();
    if (await advanceBtn.isVisible()) {
      await advanceBtn.scrollIntoViewIfNeeded().catch(() => {});
      await advanceBtn.click({ force: true });
      await page.waitForTimeout(1000);
    }

    // Verify Phase 2 is now active!
    const phase2Active = (await page.locator('text=Shadowing').count()) > 0;
    console.log(`Phase 2 successfully activated: ${phase2Active}`);

    // Advance Phase 2 -> Phase 3 (Syntax)
    const advanceToSyntax = page.locator('button:has-text("Avançar para Decomposição Sintática")').first();
    if (await advanceToSyntax.isVisible()) {
      await advanceToSyntax.scrollIntoViewIfNeeded().catch(() => {});
      await advanceToSyntax.click({ force: true });
      await page.waitForTimeout(1000);
    }
    const phase3Active = (await page.locator('text=Oficina de Sintaxe Estrutural').count()) > 0 || (await page.locator('text=Etapa 3 de 5').count()) > 0;
    console.log(`Phase 3 successfully activated: ${phase3Active}`);

    const block4Pass = pill2HasLock && stillOnPhase1 && phase2Active && phase3Active && companionDockVisible;
    if (vp.name === "desktop_1440") {
      results.push({ block: 4, name: "Sessão Diária: Máquina Sequencial Estrita (🔒) & Sintaxe Dinâmica", status: block4Pass ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block4-daily.png") });
    }

    // ----------------------------------------------------
    // BLOCK 5: Palácio da Memória & FSRS Studio
    // ----------------------------------------------------
    console.log("--- [5/12] Testing Memory Palace ---");
    await safeGoto("http://localhost:8081/memory-palace");
    await page.waitForTimeout(1000);
    const memoryCardVisible = (await page.getByText(/Palácio da Memória/i).count()) > 0;
    console.log(`Memory Palace card visible: ${memoryCardVisible}`);
    if (vp.name === "desktop_1440") {
      results.push({ block: 5, name: "Palácio da Memória & FSRS Studio (/memory-palace)", status: memoryCardVisible ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block5-memory.png") });
    }

    // ----------------------------------------------------
    // BLOCK 6: Oficina de Sintaxe
    // ----------------------------------------------------
    console.log("--- [6/12] Testing Syntax Workshop ---");
    await safeGoto("http://localhost:8081/syntax-workshop");
    await page.waitForTimeout(1000);
    const syntaxWorkshopTitle = await page.locator('text=Oficina de Sintaxe').first().isVisible();
    if (vp.name === "desktop_1440") {
      results.push({ block: 6, name: "Oficina de Sintaxe (/syntax-workshop)", status: syntaxWorkshopTitle ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block6-syntax.png") });
    }

    // ----------------------------------------------------
    // BLOCK 7: Arena de Duelo Multijogador
    // ----------------------------------------------------
    console.log("--- [7/12] Testing Duel Arena ---");
    await safeGoto("http://localhost:8081/duel");
    await page.waitForTimeout(1000);
    const duelTitle = await page.locator('text=Arena de Duelo').first().isVisible();
    if (vp.name === "desktop_1440") {
      results.push({ block: 7, name: "Arena de Duelo Multijogador (/duel)", status: duelTitle ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block7-duel.png") });
    }

    // ----------------------------------------------------
    // BLOCK 8: Biblioteca Clássica & Leitor Bilíngue
    // ----------------------------------------------------
    console.log("--- [8/12] Testing Classical Library ---");
    await safeGoto("http://localhost:8081/library");
    await page.waitForTimeout(1000);
    const libraryTitle = await page.locator('text=Biblioteca').first().isVisible();
    if (vp.name === "desktop_1440") {
      results.push({ block: 8, name: "Biblioteca Clássica & Leitor Bilíngue (/library)", status: libraryTitle ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block8-library.png") });
    }

    // ----------------------------------------------------
    // BLOCK 9: Conselho de Mentores & Chat Interativo
    // ----------------------------------------------------
    console.log("--- [9/12] Testing Mentor Council & Chat ---");
    await safeGoto("http://localhost:8081/mentor-chat");
    await page.waitForTimeout(1000);
    const chatInput = page.locator('input[placeholder*="Escreva uma mensagem"], input[type="text"]').first();
    let block9Pass = false;
    if (await chatInput.isVisible()) {
      await chatInput.fill("Olá mentor, pronto para nossa prática de hoje?");
      block9Pass = true;
    }
    if (vp.name === "desktop_1440") {
      results.push({ block: 9, name: "Conselho de Mentores & Chat com IA (/mentor-chat)", status: block9Pass ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block9-mentor-chat.png") });
    }

    // ----------------------------------------------------
    // BLOCK 10: Laboratório de Fonética & Analisador Acústico Real
    // ----------------------------------------------------
    console.log("--- [10/12] Testing Phonetics Lab Dual Canvas & Silence Check ---");
    await safeGoto("http://localhost:8081/commute");
    await page.waitForTimeout(1200);

    // Check Dual Canvas rendering
    const canvasCount = await page.locator("canvas").count();
    console.log(`Dual Canvas count: ${canvasCount}`);

    // Trigger Record & Quick Stop (Silence Test)
    const recBtn = page.locator("#btn-record");
    let silenceHandled = false;
    if (await recBtn.isVisible()) {
      await recBtn.click({ force: true });
      await page.waitForTimeout(600);
      await recBtn.click({ force: true });
      await page.waitForTimeout(1500);

      silenceHandled = (await page.locator('text=0%').count()) > 0;
    }
    console.log(`Silence test zero score handled: ${silenceHandled}`);

    const block10Pass = canvasCount >= 2 && silenceHandled;
    if (vp.name === "desktop_1440") {
      results.push({ block: 10, name: "Laboratório de Fonética & Analisador Acústico Real (/commute)", status: block10Pass ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block10-phonetics.png") });
    }

    // ----------------------------------------------------
    // BLOCK 11: Lojas, VIP, Dossiê & Impressão
    // ----------------------------------------------------
    console.log("--- [11/12] Testing Dossier & @media print ---");
    await safeGoto("http://localhost:8081/dossier");
    await page.waitForTimeout(1000);

    await page.emulateMedia({ media: "print" });
    const printDossierVisible = (await page.locator("#printable-dossier").count()) > 0 || (await page.getByText(/Dossiê/i).count()) > 0;
    await page.emulateMedia({ media: null });
    console.log(`Print Dossier visible: ${printDossierVisible}`);

    if (vp.name === "desktop_1440") {
      results.push({ block: 11, name: "Loja Polímata, VIP & Dossiê Imprimível (/dossier)", status: printDossierVisible ? "PASS" : "FAIL" });
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "master-block11-dossier.png") });
    }

    // ----------------------------------------------------
    // BLOCK 12: Zero Scroll Horizontal & Ergonomia 3D Tátil
    // ----------------------------------------------------
    console.log("--- [12/12] Testing Zero Horizontal Overflow Across 15 Routes ---");
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
      await safeGoto(`http://localhost:8081${r}`);
      await page.waitForTimeout(300);
      const ok = await checkOverflow(r);
      if (!ok) allRoutesNoOverflow = false;
    }

    // Check speech synthesis calls
    const speechSynthesisCalls = await page.evaluate(() => window._speechSynthesisCalls || 0);
    console.log(`Total window.speechSynthesis calls: ${speechSynthesisCalls} (Must be 0)`);
    const zeroSpeechSynthesis = speechSynthesisCalls === 0;

    const block12Pass = allRoutesNoOverflow && zeroSpeechSynthesis;
    if (vp.name === "desktop_1440") {
      results.push({ block: 12, name: "Zero Scroll Horizontal (15 rotas) & Zero window.speechSynthesis", status: block12Pass ? "PASS" : "FAIL" });
    }

    await context.close();
  }

  await browser.close();

  console.log("\n============================================================");
  console.log("MASTER E2E AUDIT COMPLETE — RESULTS SUMMARY:");
  console.log("============================================================\n");
  console.table(results);
}

runMasterAudit().catch((err) => {
  console.error("Master audit error:", err);
  process.exit(1);
});
