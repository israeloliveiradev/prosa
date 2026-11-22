import { READING } from "@/lib/copy/reading";
import { copy as uiCopy } from "@/lib/i18n";
import { test, expect, seedSession, assertLayout, api, sql, type Session } from "./fixtures";
import { AI_WAIT, bodyText, createLearner, looksEnglish, press, tid } from "./helpers-b";

const t = READING.pt;

interface Story {
  title: string;
  story_text: string;
  translation: string;
  vocabulary: Array<{ word: string; translation: string; example_sentence: string }>;
  source_depth?: string;
  source_url?: string | null;
  source_title?: string;
}

function looksPortuguese(text: string): boolean {
  return (text.match(/\b(o|a|os|as|de|do|da|em|um|uma|que|e|para|com|não|é|foi|são|por|se|no|na)\b/gi) ?? []).length >= 4;
}

/** Abre /news e devolve a matéria que o app pediu ao servidor (a primeira do tema padrão). */
async function openNews(page: import("@playwright/test").Page): Promise<{ story: Story; request: Record<string, unknown> }> {
  const response = page.waitForResponse((r) => r.url().includes("/api/v1/news/fetch-adapted") && r.request().method() === "POST", { timeout: AI_WAIT });
  await page.goto("/news");
  const done = await response;
  expect(done.status(), "a matéria precisa vir do servidor").toBe(200);
  const request = JSON.parse(done.request().postData() ?? "{}");
  return { story: await done.json(), request };
}

async function newsLearner(prefix: string, extra: Partial<Parameters<typeof createLearner>[0]> = {}): Promise<Session> {
  return createLearner({ prefix, target: "en", level: "A2", interests: ["Ciência", "Música"], goal: "culture", ...extra });
}

test.describe("Bloco 12 · Leitura", () => {
  test("uma matéria real nos temas e no nível do aluno, com o rótulo da profundidade da fonte", async ({ page }) => {
    test.setTimeout(300_000);
    const session = await newsLearner("reading-feed");
    await seedSession(page, session, { locale: "pt" });
    const { story, request } = await openNews(page);

    // O pedido usa o primeiro tema do aluno e o nível dele.
    expect(request.interest).toBe("Ciência");
    expect(request.level).toBe("A2");
    await expect(page.getByRole("heading", { name: t.title })).toBeVisible();
    await expect(page.getByText(story.title, { exact: false }).first()).toBeVisible({ timeout: AI_WAIT });
    expect(looksEnglish(story.story_text), "texto no idioma-alvo").toBe(true);
    expect(looksPortuguese(story.translation), "tradução no idioma de apoio").toBe(true);
    expect(story.vocabulary.length).toBeGreaterThan(0);
    await expect(page.getByText("A2 · Seu nível").first()).toBeVisible();
    // O tema escolhido está marcado (fundo verde) e o outro não.
    const selected = page.getByRole("radio", { name: "Ciência" });
    await expect(selected).toHaveCSS("background-color", "rgb(13, 148, 136)");
    await expect(page.getByRole("radio", { name: "Música" })).not.toHaveCSS("background-color", "rgb(13, 148, 136)");

    // Rótulo honesto do que o servidor leu: artigo completo x só resumo.
    expect(["full", "summary"]).toContain(story.source_depth);
    const depth = tid(page, `news-depth-${story.source_depth}`);
    await expect(depth).toBeVisible();
    await expect(depth).toHaveText(story.source_depth === "summary" ? t.depthSummary : t.depthFull);
    await expect(page.getByTestId(`news-depth-${story.source_depth === "summary" ? "full" : "summary"}`)).toHaveCount(0);
    // E a fonte aparece (link) ou o app diz que não há.
    if (story.source_url) await expect(tid(page, "news-source-link")).toBeVisible();
    else await expect(tid(page, "news-source-missing")).toBeVisible();
    test.info().annotations.push({ type: "nota", description: `profundidade=${story.source_depth}; fonte=${story.source_title ?? ""}` });
    await assertLayout(page, "Leitura");
  });

  test("os chips de tema e de nível expõem o estado marcado para leitores de tela (aria-checked)", async ({ page }) => {
    const session = await newsLearner("reading-a11y");
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/news");
    await expect(page.getByRole("radio", { name: "Ciência" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Ciência" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Música" })).not.toBeChecked();
    await expect(page.getByRole("radio", { name: /^A2 · / })).toBeChecked();
  });

  test("tocar numa palavra mostra o significado no idioma de apoio e 'Guardar' cria o cartão", async ({ page }) => {
    test.setTimeout(300_000);
    const session = await newsLearner("reading-word");
    await seedSession(page, session, { locale: "pt" });
    const { story } = await openNews(page);
    await expect(page.getByText(story.title, { exact: false }).first()).toBeVisible({ timeout: AI_WAIT });

    // Palavra do vocabulário: o toque abre a folha com a tradução (português) e o exemplo.
    const known = page.locator(`[role=button][aria-label$=", ${t.vocabWordA11y}"]`).filter({ visible: true }).first();
    await expect(known).toBeVisible();
    await known.click();
    const sheet = tid(page, "session-glass-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(t.wordTitle, { exact: true })).toBeVisible();
    const sheetText = (await sheet.innerText()).toLowerCase();
    const entry = story.vocabulary.find((item) => sheetText.includes(item.translation.toLowerCase()) && sheetText.includes(item.word.toLowerCase()));
    expect(entry, `a folha precisa mostrar palavra e tradução do vocabulário: ${sheetText}`).toBeTruthy();
    expect(entry!.translation.toLowerCase()).not.toBe(entry!.word.toLowerCase());
    await expect(sheet.getByText(t.wordMissing)).toHaveCount(0);
    await press(page, "session-glass-sheet-close");

    // "Guardar": o cartão entra no baralho do aparelho, aparece em Revisão e vai ao servidor.
    const chip = page.getByRole("button", { name: new RegExp(`^${t.saveWord}: `) }).filter({ visible: true }).first();
    await expect(chip).toBeVisible();
    const label = (await chip.getAttribute("aria-label"))!;
    const word = label.slice(`${t.saveWord}: `.length).split(", ")[0]!;
    const saved = story.vocabulary.find((item) => item.word === word)!;
    expect(saved).toBeTruthy();
    // Antes do toque o cartão NÃO pode existir no servidor (senão "Guardar cria o cartão" passaria sem o toque).
    const countCard = () => sql(`SELECT count(*) FROM srs_cards WHERE user_id='${session.user.id}' AND lower(front_phrase)=lower('${word.replace(/'/g, "''")}')`)[0];
    expect(countCard(), `cartão "${word}" já existia antes de Guardar`).toBe("0");
    // Glosa no idioma de apoio (pt), não em inglês: nenhuma tradução do vocabulário com palavra funcional inglesa.
    for (const item of story.vocabulary) {
      expect(item.translation, `tradução de "${item.word}" parece inglês`).not.toMatch(/\b(the|of|to|and|is|are|with|for)\b/i);
    }
    await chip.click();
    await expect(page.getByRole("button", { name: new RegExp(`^${t.savedWord}: ${word}`) }).first()).toBeVisible();

    await page.waitForTimeout(1500);
    await page.goto("/memory");
    await expect(tid(page, "memory-screen")).toBeVisible();
    await press(page, "memory-filter-learning");
    await expect(page.getByText(word, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    // O cartão também precisa existir no servidor (outro aparelho o veria).
    await expect
      .poll(async () => (await api(session.token, "GET", "/api/v1/srs/cards")).json.cards.some((card: { front_phrase: string }) => card.front_phrase.toLowerCase() === word.toLowerCase()), {
        timeout: 20_000,
        message: `cartão "${word}" guardado na Leitura deveria estar no servidor`,
      })
      .toBe(true);
    expect(sql(`SELECT count(*) FROM srs_cards WHERE user_id='${session.user.id}' AND lower(front_phrase)=lower('${word.replace(/'/g, "''")}')`)[0]).toBe("1");
  });

  test("o ditado de ouvido compara a versão do aluno com a notícia e devolve nota e correções", async ({ page, guard }) => {
    test.setTimeout(300_000);
    const session = await newsLearner("reading-dictogloss");
    await seedSession(page, session, { locale: "pt" });
    const { story } = await openNews(page);
    await expect(page.getByText(story.title, { exact: false }).first()).toBeVisible({ timeout: AI_WAIT });

    await page.getByRole("button", { name: t.dictoglossOpen, exact: true }).filter({ visible: true }).first().click();
    await expect(page.getByText(t.dgTitle)).toBeVisible();
    // O áudio é do aparelho; aqui o aluno diz que já ouviu (o fluxo de escuta tem o seu próprio bloco).
    await page.getByRole("button", { name: t.dgHeard, exact: true }).filter({ visible: true }).first().click();
    const attempt = story.story_text.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").replace(/[a-z]+ing\b/i, "go");
    const box = page.getByLabel(t.dgWrite, { exact: true }).filter({ visible: true }).first();
    await box.fill(attempt);
    const reconstruct = page.waitForResponse((r) => r.url().includes("/api/v1/journal/reconstruct"), { timeout: AI_WAIT });
    await page.getByRole("button", { name: t.dgCompare, exact: true }).filter({ visible: true }).first().click();
    const report = await reconstruct;
    expect(report.status()).toBe(200);
    const body = await report.json();
    expect(typeof body.score).toBe("number");
    await expect(page.getByText(t.dgScore.replace("{score}", String(body.score)), { exact: true })).toBeVisible();
    await expect(page.getByText(t.dgGrammar, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(t.dgLiteral, { exact: true }).first()).toBeVisible();
    await assertLayout(page, "Ditado de ouvido");
    await page.getByRole("button", { name: t.dgClose, exact: true }).filter({ visible: true }).first().click();
    await expect(page.getByText(t.dgTitle)).toHaveCount(0);
    guard.allow(/\/api\/v1\/audio/);
  });

  test("'Seu texto' adapta um texto colado ao nível e guarda a nota no servidor", async ({ page }) => {
    test.setTimeout(300_000);
    const session = await newsLearner("reading-life");
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/news");
    await expect(page.getByText(t.ownTextKicker, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: t.ownTextOpen }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/life$/);
    await expect(tid(page, "life-screen")).toBeVisible();
    await assertLayout(page, "Seu texto");

    const source = "Hoje eu acordei cedo, tomei café com pão e fui de bicicleta até o trabalho. À tarde encontrei uma amiga no parque e conversamos sobre as nossas viagens.";
    const calibrateButton = tid(page, "life-calibrate");
    await expect(calibrateButton).toBeDisabled();
    await tid(page, "life-source-input").fill(source);
    await expect(calibrateButton).toBeEnabled();
    const calibrate = page.waitForResponse((r) => r.url().includes("/api/v1/ownlife") && r.request().method() === "POST" && !r.url().includes("mission"), { timeout: AI_WAIT });
    await press(page, "life-calibrate");
    expect((await calibrate).status()).toBe(200);
    const note = tid(page, "life-note");
    await expect(note).toBeVisible({ timeout: AI_WAIT });
    const stored = (await api(session.token, "GET", "/api/v1/ownlife?target_lang=en")).json.note;
    expect(stored.calibrated.length).toBeGreaterThan(20);
    expect(stored.calibrated).not.toBe(source);
    expect(looksEnglish(stored.calibrated), `texto adaptado no idioma-alvo: ${stored.calibrated}`).toBe(true);
    await expect(note).toContainText(stored.calibrated.slice(0, 40));
    expect(sql(`SELECT count(*) FROM ownlife_notes WHERE user_id='${session.user.id}'`)[0]).toBe("1");
    await expect(tid(page, "life-source-input")).toHaveValue("");

    // Recarregar: a nota continua lá (servidor).
    await page.reload();
    await expect(tid(page, "life-note")).toContainText(stored.calibrated.slice(0, 40), { timeout: 30_000 });
  });

  test("Leitura e Seu texto cabem no celular @mobile", async ({ page }) => {
    test.setTimeout(300_000);
    const session = await newsLearner("reading-mobile");
    await seedSession(page, session, { locale: "pt" });
    const { story } = await openNews(page);
    await expect(page.getByText(story.title, { exact: false }).first()).toBeVisible({ timeout: AI_WAIT });
    await assertLayout(page, "Leitura 390");
    await page.goto("/life");
    await expect(tid(page, "life-screen")).toBeVisible();
    await assertLayout(page, "Seu texto 390");
    expect(await bodyText(page)).toContain(uiCopy("pt").lifeCalibrate);
  });
});
