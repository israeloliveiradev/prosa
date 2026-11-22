import { test, expect, createAccount, seedSession, assertLayout, api, sql, readStore } from "./fixtures";
import { tid, press, utcDate, localDate, speechWav, micFileArgs } from "./helpers-a";
import { installNeuralProbe } from "./helpers-neural";
import { SESSION_COPY } from "@/lib/copy/session";
import { MESSAGES } from "@/lib/messages";
import { PATH_COPY } from "@/lib/copy/path";

/** Bloco 6: a sessão diária inteira, da revisão ao fecho, com efeitos conferidos no servidor. */

type P = import("@playwright/test").Page;

// Microfone falso com fala de verdade (o tom do fixtures dá "nenhuma fala detectada", testado no bloco 7).
const WAV = speechWav("Hello, my name is Albert. Nice to meet you. Where are you from? I live in a city in my country. Imagine a train moving through space.", "daily-en");
test.use({ launchOptions: { args: micFileArgs(WAV) } });
const S = SESSION_COPY.pt;
const M = MESSAGES.pt;

const continueButton = (page: P) => page.getByRole("button", { name: new RegExp(`^${S.continueTo.split("{phase}")[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }).filter({ visible: true }).first();

async function waitContinueEnabled(page: P, timeout = 15_000): Promise<boolean> {
  try {
    await expect(continueButton(page)).toBeEnabled({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function clickButton(page: P, name: string | RegExp, options: { exact?: boolean } = {}): Promise<void> {
  const button = page.getByRole("button", { name, exact: options.exact ?? false }).filter({ visible: true }).first();
  await expect(button, `botão ${String(name)}`).toBeVisible({ timeout: 20_000 });
  await button.click();
}

function xpState(raw: string | null): { total: number; today: number } {
  if (!raw) return { total: 0, today: 0 };
  const bag = JSON.parse(raw);
  const lanes = bag.lanes ?? { x: bag };
  let total = 0;
  let today = 0;
  const day = localDate();
  for (const lane of Object.values<any>(lanes)) {
    for (const [date, entry] of Object.entries<any>(lane.log ?? {})) {
      const value = typeof entry === "number" ? entry : Number(entry?.xp ?? entry?.total ?? 0);
      total += value;
      if (date === day) today += value;
    }
  }
  return { total, today };
}

test("sessão diária completa: etapas, fecho e efeitos únicos no servidor @mobile", async ({ page, guard }) => {
  test.setTimeout(900_000);
  guard.allow(/huggingface|hf\.co|onnx|wasm/i);
  const session = await createAccount({ prefix: "daily", target: "en", level: "A1", native: "pt" });
  const userId = session.user.id;
  // Temas e objetivo do aluno, como o onboarding grava (POST /onboarding/quiz).
  const themes = ["Viagens", "Cozinha"];
  const quiz = await api(session.token, "POST", "/api/v1/onboarding/quiz", {
    interests: themes,
    goal: "travel",
    level: "A1",
    target_lang: "en",
    through_lang: "pt",
    tracks: [{ target_lang: "en", through_lang: "pt", level: "A1", active: true }],
  });
  expect(quiz.status, JSON.stringify(quiz.json)).toBe(200);

  await installNeuralProbe(page);
  await seedSession(page, session);
  const lessonRequests: any[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/api\/v1\/lessons\/generate/.test(request.url())) lessonRequests.push(JSON.parse(request.postData() ?? "{}"));
  });
  await page.goto("/");
  await expect(tid(page, "home-screen")).toBeVisible({ timeout: 30_000 });
  await expect(tid(page, "home-session-unit")).toBeVisible({ timeout: 30_000 });
  await assertLayout(page, "Hoje antes da sessão");
  expect(sql(`SELECT streak_count FROM users WHERE id = '${userId}'`)[0]).toBe("0");
  const xpBefore = xpState(await readStore(page, "prosa.xp.v1"));
  const shellXpBefore = ((await tid(page, "shell-xp").textContent()) ?? "").trim();

  await press(page, "home-start");
  await expect(page).toHaveURL(/\/daily\?unit=a1-01/, { timeout: 20_000 });
  // A lição leva de 5 a 90 s (IA).
  await expect(tid(page, "daily-unit")).toBeVisible({ timeout: 120_000 });
  await assertLayout(page, "Sessão: revisão");

  // A lição é da unidade ativa e dos temas do aluno.
  expect(lessonRequests.length).toBeGreaterThan(0);
  expect(lessonRequests[0].unit_id).toBe("a1-01");
  expect(lessonRequests[0].interests).toEqual(expect.arrayContaining(themes));
  const lessonRow = sql(`SELECT unit_id || '|' || title || '|' || topic_category FROM daily_lessons WHERE user_id = '${userId}' ORDER BY lesson_date DESC LIMIT 1`)[0];
  expect(lessonRow, "lição gravada para o aluno").toBeTruthy();
  expect(lessonRow.startsWith("a1-01|")).toBe(true);

  // 1) Revisão: vira e avalia cada cartão (cartões novos da lição).
  for (let i = 0; i < 40; i += 1) {
    if (await waitContinueEnabled(page, 1_500)) break;
    await clickButton(page, M.flipCard);
    await clickButton(page, M.gradeGood, { exact: true });
  }
  expect(await waitContinueEnabled(page, 10_000), "revisão cumprida").toBe(true);
  await continueButton(page).click();

  // 2) Ouvir: marca como ouvido e responde as perguntas de compreensão.
  await clickButton(page, M.listenHeard, { exact: true });
  for (let i = 0; i < 8; i += 1) {
    if (await waitContinueEnabled(page, 1_000)) break;
    const question = page.getByText(M.listenQuestion, { exact: true }).filter({ visible: true }).first();
    await expect(question).toBeVisible({ timeout: 10_000 });
    const tiles = question.locator("xpath=following::*[@role='button'][not(@aria-disabled='true')]");
    await tiles.nth(1).click();
    const next = page.getByRole("button", { name: M.listenNext, exact: true }).filter({ visible: true }).first();
    if (await next.isVisible().catch(() => false)) await next.click();
  }
  expect(await waitContinueEnabled(page, 10_000), "escuta cumprida").toBe(true);
  await continueButton(page).click();

  // 3) Ler: toca numa palavra (glosa no idioma de apoio), abre a tradução (pt) e lê até o fim.
  await expect(page.getByText(M.seeTranslation, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  await assertLayout(page, "Sessão: leitura");
  await clickButton(page, M.seeTranslation, { exact: true });
  const translation = page.getByText(M.translationOfStory, { exact: true }).filter({ visible: true }).first();
  await expect(translation).toBeVisible();
  const translated = await translation.locator("xpath=following::*[string-length(normalize-space(text())) > 40][1]").textContent();
  expect(looksPortuguese(translated ?? ""), `tradução da história em português: ${(translated ?? "").slice(0, 100)}`).toBe(true);
  await page.keyboard.press("Escape");
  for (let i = 0; i < 90; i += 1) {
    if (await waitContinueEnabled(page, 1_000)) break;
    await page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll("*"))) {
        const style = getComputedStyle(el);
        if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
      }
      window.scrollTo(0, document.body.scrollHeight);
    });
  }
  expect(await waitContinueEnabled(page, 5_000), "leitura cumprida (fim do texto + tempo mínimo)").toBe(true);
  await continueButton(page).click();

  // 4) Falar: microfone falso com tom; a nota vem da análise real (sem nota inventada).
  await clickButton(page, M.recordPronunciation, { exact: true });
  await page.waitForTimeout(6_000);
  await clickButton(page, M.stopAndScore, { exact: true });
  let spoke = false;
  let skipped = false;
  for (let i = 0; i < 60 && !spoke; i += 1) {
    spoke = await waitContinueEnabled(page, 1_000);
    if (!spoke) {
      const skip = page.getByRole("button", { name: S.skipSpeech }).filter({ visible: true }).first();
      if (await skip.isVisible().catch(() => false)) {
        // O tom de teste não é fala: o app oferece pular, sem XP (comportamento honesto).
        await skip.click();
        skipped = true;
      }
    }
  }
  await page.screenshot({ path: "test-results/audit-a/daily-shadow.png" });
  expect(spoke, "etapa de fala cumprida (nota ou pulo honesto)").toBe(true);
  // O microfone falso toca FALA de verdade (WAV do SAPI): a etapa tem de ser cumprida com nota medida, não com o pulo.
  expect(skipped, "a etapa de fala foi pulada mesmo com fala real no microfone").toBe(false);
  await expect(page.getByText(M.accuracy, { exact: true }).filter({ visible: true }).first(), "nota de precisão medida na etapa de fala").toBeVisible();
  await continueButton(page).click();

  // 5) Diário: escreve 3 frases e recebe a correção da IA.
  const box = page.getByLabel(M.journalLabel).filter({ visible: true }).first();
  await expect(box).toBeVisible({ timeout: 20_000 });
  await assertLayout(page, "Sessão: diário");
  await box.fill("I am Ana and I am from Brazil. I live in Sao Paulo since two years. My friend name are Carlos and he speak English.");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await clickButton(page, new RegExp(`^(${M.askCorrection}|${M.journalRetry})$`));
    const pendingButton = page.getByRole("button", { name: M.askingCorrection }).filter({ visible: true });
    await pendingButton.first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
    await expect(pendingButton, "a correção da IA volta (até 150 s)").toHaveCount(0, { timeout: 150_000 });
    if (await waitContinueEnabled(page, 3_000)) break;
  }
  expect(await waitContinueEnabled(page, 5_000), "diário corrigido pela IA").toBe(true);
  await page.screenshot({ path: "test-results/audit-a/daily-journal.png" });
  const journalAfter = sql(`SELECT count(*) FROM journal_closures WHERE user_id = '${userId}' AND unit_id = 'a1-01'`)[0];
  await continueButton(page).click();

  // 6) Fecho: nota e salvar a sessão.
  await expect(page.getByRole("button", { name: S.finishSave }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  await assertLayout(page, "Sessão: fecho");
  await clickButton(page, S.finishSave, { exact: true });
  await expect(tid(page, "daily-completion")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(PATH_COPY.pt.completeSaved)).toBeVisible();

  // Efeitos no servidor, uma vez só.
  expect(sql(`SELECT count(*) FROM session_completions WHERE user_id = '${userId}' AND target_lang = 'en'`)[0]).toBe("1");
  expect(sql(`SELECT unit_id FROM session_completions WHERE user_id = '${userId}'`)[0]).toBe("a1-01");
  expect(sql(`SELECT streak_count FROM users WHERE id = '${userId}'`)[0], "ofensiva depois da primeira sessão").toBe("1");
  expect(sql(`SELECT lessons_done FROM path_progress WHERE user_id = '${userId}' AND unit_id = 'a1-01'`)[0]).toBe("1");
  expect(Number(journalAfter), "o diário da unidade fechou no servidor (journal_closures)").toBeGreaterThanOrEqual(1);

  // Cartões da lição no servidor.
  await expect.poll(async () => (await api(session.token, "GET", "/api/v1/srs/cards")).json.cards.length, { timeout: 30_000 }).toBeGreaterThan(0);
  const cards = (await api(session.token, "GET", "/api/v1/srs/cards")).json.cards as Array<{ front_phrase: string; stability: number }>;
  const vocab = JSON.parse(sql(`SELECT vocabulary_data::text FROM daily_lessons WHERE user_id = '${userId}' ORDER BY lesson_date DESC LIMIT 1`)[0]) as Array<{ word: string }>;
  const words = new Set(vocab.map((entry) => entry.word.toLowerCase()));
  expect(cards.some((card) => words.has(card.front_phrase.toLowerCase())), "algum cartão do servidor é palavra da lição de hoje").toBe(true);

  // XP: ganho uma vez; recarregar e repetir não paga de novo.
  const xpAfter = xpState(await readStore(page, "prosa.xp.v1"));
  expect(xpAfter.today, "XP de hoje depois da sessão").toBeGreaterThan(xpBefore.today);
  await page.reload();
  // Sem engolir a falha: o XP só é lido depois que a tela da sessão montou de novo (senão a comparação é vazia).
  await expect(
    page.getByRole("button", { name: S.finishSave }).filter({ visible: true }).first().or(tid(page, "daily-unit")).or(tid(page, "daily-completion")),
    "a sessão volta a montar depois do F5",
  ).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2_000);
  const xpReload = xpState(await readStore(page, "prosa.xp.v1"));
  expect(xpReload.today, "o XP não muda ao recarregar").toBe(xpAfter.today);
  // Se a tela oferecer salvar de novo, salvar outra vez não paga XP nem conta outra sessão.
  const saveAgain = page.getByRole("button", { name: S.finishSave }).filter({ visible: true }).first();
  if (await saveAgain.isVisible()) {
    await saveAgain.click();
    await page.waitForTimeout(3_000);
    expect(xpState(await readStore(page, "prosa.xp.v1")).today, "salvar de novo não paga XP").toBe(xpAfter.today);
    expect(sql(`SELECT count(*) FROM session_completions WHERE user_id = '${userId}'`)[0], "salvar de novo não conta outra sessão").toBe("1");
  }
  test.info().annotations.push({ type: "f5", description: `depois do F5 o botão salvar ${(await saveAgain.isVisible()) ? "estava" : "não estava"} visível` });
  const repeat = await api(session.token, "POST", "/api/v1/sessions/complete", { date: utcDate(0), unit_id: "a1-01", elapsed_seconds: 1200 });
  expect(repeat.status).toBe(200);
  expect(sql(`SELECT count(*) FROM session_completions WHERE user_id = '${userId}'`)[0], "repetir não conta duas sessões").toBe("1");
  expect(sql(`SELECT streak_count FROM users WHERE id = '${userId}'`)[0]).toBe("1");

  // Hoje mostra o resultado: sessão feita, ofensiva 1, XP maior.
  await page.goto("/");
  await expect(tid(page, "home-screen")).toBeVisible({ timeout: 30_000 });
  await expect(tid(page, "home-streak-count")).toContainText("1");
  const shellXpAfter = ((await tid(page, "shell-xp").textContent()) ?? "").trim();
  expect(shellXpAfter).not.toBe(shellXpBefore);
  await assertLayout(page, "Hoje depois da sessão");
});

/** Heurística simples: português tem palavras e acentos que o inglês não tem. */
function looksPortuguese(text: string): boolean {
  const pt = text.match(/(o|a|os|as|um|uma|de|do|da|que|em|é|com|para|eu|você|meu|minha|se|e|não|sou|são|na|no)|[ãõçáéíóúâêô]/gi)?.length ?? 0;
  const en = text.match(/(the|and|is|are|with|you|your|my|this|that|of|to|in|for)/gi)?.length ?? 0;
  return pt > en && pt > 3;
}
