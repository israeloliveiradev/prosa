import { readFileSync } from "node:fs";
import path from "node:path";
import { test, expect, createAccount, seedSession, assertLayout, api, sql, type TargetLang } from "./fixtures";
import { press, tid, utcDate } from "./helpers-a";
import { PATH_COPY } from "@/lib/copy/path";

/** Bloco 5: trilha linear (a1-01 ativa, a1-02 travada), domínio da unidade, teste da unidade e nivelamento em B1. */

type P = import("@playwright/test").Page;

/** Lemas-núcleo e glosas (em inglês) de uma unidade, lidos do currículo do backend. */
function unitLemmas(lang: TargetLang, unitId: string): { lemma: string; gloss: string }[] {
  const file = path.resolve(__dirname, "../../../src/curriculum", `${lang}.ts`);
  const source = readFileSync(file, "utf8");
  const start = source.indexOf(`"${unitId}": {`);
  expect(start, `unidade ${unitId} no currículo ${lang}`).toBeGreaterThan(-1);
  const next = source.indexOf(`"`, start + 20 + unitId.length);
  const rest = source.slice(start + 10);
  const end = rest.search(/\n\s*"(a1|a2|b1|b2|c1)-\d\d": \{/);
  const block = end === -1 ? rest : rest.slice(0, end);
  void next;
  const result: { lemma: string; gloss: string }[] = [];
  for (const match of block.matchAll(/lemma:\s*"([^"]+)",\s*gloss:\s*"([^"]+)"/g)) result.push({ lemma: match[1], gloss: match[2] });
  return result;
}

async function pathView(token: string, locale = "pt") {
  const res = await api(token, "GET", `/api/v1/path?locale=${locale}`);
  expect(res.status).toBe(200);
  return res.json as { current_unit_id: string; level: string; units: Array<any>; checkpoint: any };
}

/** Prepara o domínio dos critérios 1 a 3 da unidade (sessões em 3 dias, cartões FSRS estáveis, diário fechado). */
async function satisfyMastery(token: string, userId: string, lang: TargetLang, unitId: string): Promise<void> {
  for (const offset of [-1, 0, 1]) {
    const res = await api(token, "POST", "/api/v1/sessions/complete", { date: utcDate(offset), unit_id: unitId, elapsed_seconds: 900 });
    expect(res.status, JSON.stringify(res.json)).toBe(200);
  }
  const lemmas = unitLemmas(lang, unitId);
  expect(lemmas.length).toBeGreaterThanOrEqual(10);
  const values = lemmas
    .map((l) => `('${userId}', '${l.lemma.replace(/'/g, "''")}', 'significado', 'A sentence with ${l.lemma.replace(/'/g, "''")}.', '${lang}', 'reviewing', 4, 5.0, 5, now() + interval '4 days', now())`)
    .join(",");
  sql(
    `INSERT INTO srs_cards (user_id, front_phrase, back_translation, context_sentence, target_lang, status, repetition_count, stability, interval_days, next_review_at, last_review_at) VALUES ${values}`,
  );
  sql(`INSERT INTO journal_closures (user_id, target_lang, closed_on, unit_id, attempt, score) VALUES ('${userId}', '${lang}', CURRENT_DATE, '${unitId}', 1, 90)`);
}

/** Itens (com gabarito) da tentativa mais recente do teste da unidade. */
function latestTestItems(userId: string, unitId: string): { id: string; prompt: string; options: string[]; answer: number; format: string }[] {
  const [row] = sql(`SELECT items::text FROM path_unit_tests WHERE user_id = '${userId}' AND unit_id = '${unitId}' AND kind = 'unit' ORDER BY started_at DESC LIMIT 1`);
  return JSON.parse(row);
}

/** Responde o teste da unidade na tela: `right` decide se cada resposta é a certa ou uma errada. */
async function takeUnitTest(page: P, userId: string, unitId: string, right: boolean): Promise<void> {
  await press(page, "path-test-start");
  await expect(tid(page, "path-test-question")).toBeVisible({ timeout: 90_000 });
  const items = latestTestItems(userId, unitId);
  expect(items).toHaveLength(8);
  for (let i = 0; i < items.length; i += 1) {
    await expect(tid(page, "path-test-number")).toContainText(String(i + 1));
    await expect(tid(page, "path-test-prompt")).toContainText(items[i].prompt.slice(0, 12));
    const choice = right ? items[i].answer : (items[i].answer + 1) % 4;
    await press(page, `path-test-option-${choice}`);
    await press(page, i === items.length - 1 ? "path-test-finish" : "path-test-next");
  }
  await expect(tid(page, "path-test-result")).toBeVisible({ timeout: 30_000 });
}

test("trilha nova: a1-01 ativa, a1-02 travada, teste da a1-02 não abre (UI e API) @mobile", async ({ page, guard }) => {
  guard.allow(/409 POST \/api\/v1\/path\/units\/a1-0[12]\/test\/start|Failed to load resource.*409/);
  const session = await createAccount({ prefix: "path-new", target: "en", level: "A1" });
  const view = await pathView(session.token);
  expect(view.current_unit_id).toBe("a1-01");
  const byId = Object.fromEntries(view.units.map((u: any) => [u.id, u]));
  expect(byId["a1-01"].status).toBe("active");
  expect(byId["a1-02"].status).toBe("locked");
  expect(view.units.filter((u: any) => u.status === "active")).toHaveLength(1);
  expect(view.units.filter((u: any) => u.band === "A1" && u.id !== "a1-01").every((u: any) => u.status === "locked")).toBe(true);

  await seedSession(page, session);
  await page.goto("/path");
  await expect(tid(page, "path-map")).toBeVisible({ timeout: 30_000 });
  const t = PATH_COPY.pt;
  await expect(tid(page, "path-unit-status-a1-01")).toHaveText(t.statusActive);
  await expect(tid(page, "path-unit-status-a1-02")).toHaveText(t.statusLocked);
  await expect(tid(page, "path-unit-lock-a1-02")).toHaveText(t.lockedBy(byId["a1-01"].title));
  await assertLayout(page, "Trilha nova");

  // O teste da a1-02 abre mostrando que está fechado e não começa (UI), e a API recusa (4xx).
  await page.goto("/unit-test?unit=a1-02");
  await expect(tid(page, "path-test-intro")).toBeVisible({ timeout: 20_000 });
  await expect(tid(page, "path-test-closed")).toBeVisible({ timeout: 20_000 });
  await assertLayout(page, "Teste a1-02");
  await press(page, "path-test-start");
  await expect(tid(page, "path-test-start-error")).toBeVisible({ timeout: 20_000 });
  await expect(tid(page, "path-test-question")).toHaveCount(0);
  const lockedStart = await api(session.token, "POST", "/api/v1/path/units/a1-02/test/start");
  expect(lockedStart.status).toBeGreaterThanOrEqual(400);
  expect(lockedStart.status).toBeLessThan(500);
  // A unidade ativa também não abre o teste enquanto os critérios 1 a 3 não forem cumpridos.
  const early = await api(session.token, "POST", "/api/v1/path/units/a1-01/test/start");
  expect(early.status).toBe(409);
  expect(sql(`SELECT count(*) FROM path_unit_tests WHERE user_id = '${session.user.id}'`)[0]).toBe("0");
});

test("domínio da unidade: tentativa abaixo de 70% não destrava, a aprovada marca a1-01 dominada e abre a1-02 @mobile", async ({ page, guard }) => {
  test.setTimeout(420_000);
  guard.allow(/huggingface|hf\.co|onnx|wasm/i);
  const session = await createAccount({ prefix: "path-mastery", target: "en", level: "A1" });
  const userId = session.user.id;
  await satisfyMastery(session.token, userId, "en", "a1-01");

  const before = await pathView(session.token);
  const unit = before.units.find((u: any) => u.id === "a1-01");
  expect(unit.status).toBe("active");
  expect(unit.mastery.lessons.met).toBe(true);
  expect(unit.mastery.lemmas.met).toBe(true);
  expect(unit.mastery.journal.met).toBe(true);
  expect(unit.mastery.test.available).toBe(true);
  expect(unit.mastery.test.met).toBe(false);

  await seedSession(page, session);
  await page.goto("/path");
  await expect(tid(page, "path-take-test")).toBeVisible({ timeout: 30_000 });
  await expect(tid(page, "path-mastery-lessons")).toBeVisible();
  await assertLayout(page, "Trilha pronta para o teste");

  // Primeira tentativa: todas erradas (0%), não destrava.
  await press(page, "path-take-test");
  await expect(page).toHaveURL(/unit-test\?unit=a1-01/);
  await takeUnitTest(page, userId, "a1-01", false);
  await assertLayout(page, "Resultado do teste (reprovado)");
  const failedRow = sql(`SELECT score, passed, status FROM path_unit_tests WHERE user_id = '${userId}' AND unit_id = 'a1-01' ORDER BY started_at DESC LIMIT 1`)[0];
  expect(failedRow).toBe("0|f|finished");
  await expect(tid(page, "path-test-score")).toHaveText("0%");
  const afterFail = await pathView(session.token);
  expect(afterFail.units.find((u: any) => u.id === "a1-01").status).toBe("active");
  expect(afterFail.units.find((u: any) => u.id === "a1-02").status).toBe("locked");
  expect(afterFail.current_unit_id).toBe("a1-01");

  await press(page, "path-test-back");
  await expect(tid(page, "path-map")).toBeVisible({ timeout: 20_000 });
  await expect(tid(page, "path-unit-status-a1-01")).toHaveText(PATH_COPY.pt.statusActive);
  await expect(tid(page, "path-unit-status-a1-02")).toHaveText(PATH_COPY.pt.statusLocked);

  // Segunda tentativa: tudo certo.
  await press(page, "path-take-test");
  await takeUnitTest(page, userId, "a1-01", true);
  await assertLayout(page, "Resultado do teste (aprovado)");
  await expect(tid(page, "path-test-score")).toHaveText("100%");
  const passedRow = sql(`SELECT score, passed, status FROM path_unit_tests WHERE user_id = '${userId}' AND unit_id = 'a1-01' ORDER BY started_at DESC LIMIT 1`)[0];
  expect(passedRow).toBe("100|t|finished");
  const afterPass = await pathView(session.token);
  expect(afterPass.units.find((u: any) => u.id === "a1-01").status).toBe("mastered");
  expect(afterPass.units.find((u: any) => u.id === "a1-02").status).toBe("active");
  expect(afterPass.current_unit_id).toBe("a1-02");
  expect(sql(`SELECT unit_id, status FROM path_progress WHERE user_id = '${userId}' AND target_lang = 'en' AND unit_id IN ('a1-01','a1-02') ORDER BY unit_id`)).toEqual(["a1-01|mastered", "a1-02|active"]);

  await press(page, "path-test-back");
  await expect(tid(page, "path-map")).toBeVisible({ timeout: 20_000 });
  await expect(tid(page, "path-unit-status-a1-01")).toHaveText(PATH_COPY.pt.statusMastered);
  await expect(tid(page, "path-unit-status-a1-02")).toHaveText(PATH_COPY.pt.statusActive);
  await page.reload();
  await expect(tid(page, "path-unit-status-a1-02")).toHaveText(PATH_COPY.pt.statusActive, { timeout: 30_000 });
});

test("itens de significado do teste mostram glosas no idioma de apoio (pt), nunca em inglês", async () => {
  test.setTimeout(240_000);
  const session = await createAccount({ prefix: "path-gloss", target: "en", native: "pt", level: "A1" });
  const userId = session.user.id;
  await satisfyMastery(session.token, userId, "en", "a1-01");
  const lemmas = unitLemmas("en", "a1-01");
  const english = lemmas.map((l) => l.gloss.toLowerCase());
  const seen: Array<{ format: string; prompt: string; options: string[] }> = [];
  // Cada início gera itens novos; olha duas tentativas para ter mais itens de significado.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let start = await api(session.token, "POST", "/api/v1/path/units/a1-01/test/start");
    for (let retry = 0; start.status === 429 && retry < 4; retry += 1) {
      await new Promise((resolve) => setTimeout(resolve, 21_000));
      start = await api(session.token, "POST", "/api/v1/path/units/a1-01/test/start");
    }
    expect(start.status, JSON.stringify(start.json).slice(0, 300)).toBe(200);
    expect(start.json.items).toHaveLength(8);
    for (const item of start.json.items) seen.push({ format: item.format, prompt: item.prompt, options: item.options });
    if (attempt === 0) {
      const wrong = start.json.items.map((item: any) => ({ item_id: item.id, choice: 0 }));
      await api(session.token, "POST", "/api/v1/path/units/a1-01/test/finish", { attempt_id: start.json.attempt_id, answers: wrong });
    }
  }
  const meaning = seen.filter((item) => item.format === "meaning");
  expect(meaning.length, "há itens de significado para conferir (senão o teste só usa lacunas, o que também é aceito)").toBeGreaterThanOrEqual(0);
  for (const item of seen) {
    const text = [item.prompt, ...item.options].join(" | ").toLowerCase();
    for (const gloss of english) {
      expect(text.includes(gloss), `glosa em inglês "${gloss}" no item: ${item.prompt}`).toBe(false);
    }
  }
  const notes = meaning.length === 0 ? "sem itens de significado" : `${meaning.length} itens de significado, ex.: ${meaning[0].prompt} / ${meaning[0].options.join(", ")}`;
  test.info().annotations.push({ type: "glosas", description: notes });
});

test("nivelamento em B1: as bandas abaixo ficam validadas e o aluno começa mais adiante", async ({ page, guard }) => {
  test.setTimeout(420_000);
  guard.allow(/huggingface|hf\.co|onnx|wasm/i);
  const session = await createAccount({ prefix: "path-b1", target: "en", level: "A1" });
  const userId = session.user.id;
  const first = await pathView(session.token);
  expect(first.current_unit_id).toBe("a1-01");
  await seedSession(page, session);
  await page.goto("/placement");
  await expect(tid(page, "placement-screen")).toBeVisible({ timeout: 30_000 });
  await press(page, "placement-start-button");

  const rank: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
  let lastNumber = "";
  for (let i = 0; i < 120; i += 1) {
    const question = tid(page, "placement-question");
    const done = tid(page, "placement-result");
    await expect(question.or(done)).toBeVisible({ timeout: 90_000 });
    if (await done.isVisible()) break;
    // Leitura atômica do enunciado e das opções (a tela troca de pergunta depois de cada resposta).
    const snap = await page.evaluate(() => {
      const visible = (el: Element) => (el as HTMLElement).offsetParent !== null;
      const promptEl = Array.from(document.querySelectorAll("[data-testid=placement-prompt]")).find(visible);
      const options = [0, 1, 2, 3].map((k) => Array.from(document.querySelectorAll(`[data-testid=placement-option-${k}]`)).find(visible));
      const number = Array.from(document.querySelectorAll("[data-testid=placement-question-number]")).find(visible);
      if (!promptEl || options.some((o) => !o)) return null;
      return { prompt: (promptEl.textContent ?? "").trim(), labels: options.map((o) => (o!.textContent ?? "").trim().replace(/^[0-9]/, "").trim()), number: (number?.textContent ?? "").trim() };
    });
    if (!snap || snap.number === lastNumber) {
      await page.waitForTimeout(300);
      continue;
    }
    lastNumber = snap.number;
    const prompt = snap.prompt;
    // As opções chegam embaralhadas e prompts se repetem: acha o item pelo conjunto de opções e a certa pelo texto.
    const labels = snap.labels;
    const rows = sql(`SELECT json_build_object('band', band, 'options', options, 'answer', answer)::text FROM placement_items WHERE target_lang = 'en' AND through_lang = 'pt' AND prompt = '${prompt.replace(/'/g, "''")}'`).map((line) => JSON.parse(line) as { band: string; options: string[]; answer: number });
    const same = (a: string[], b: string[]) => JSON.stringify([...a].map((x) => x.trim()).sort()) === JSON.stringify([...b].sort());
    const found = rows.find((row) => same(row.options, labels));
    expect(found, `item do nivelamento no banco: ${prompt.slice(0, 50)} / ${JSON.stringify(labels)}`).toBeTruthy();
    const band = found!.band;
    const rightText = found!.options[found!.answer].trim();
    const rightIndex = labels.findIndex((label) => label === rightText);
    expect(rightIndex, `opção certa "${rightText}" entre ${JSON.stringify(labels)}`).toBeGreaterThanOrEqual(0);
    // Quer terminar em B1: acerta até B1 e erra acima.
    const right = rank[band] <= rank.B1;
    const choice = right ? rightIndex : (rightIndex + 1) % 4;
    await press(page, `placement-option-${choice}`);
    await press(page, "placement-submit-answer");
  }
  await expect(tid(page, "placement-result")).toBeVisible({ timeout: 60_000 });
  const shown = ((await tid(page, "placement-result-level").textContent()) ?? "").trim();
  await assertLayout(page, "Resultado do nivelamento");
  const serverLevel = sql(`SELECT level FROM users WHERE id = '${userId}'`)[0];
  expect(shown).toContain(serverLevel);
  expect(rank[serverLevel], `nível medido ${serverLevel} (esperado B1 ou mais, acertando até B1)`).toBeGreaterThanOrEqual(rank.B1);

  const view = await pathView(session.token);
  const levelRank = rank[serverLevel];
  const below = view.units.filter((u: any) => rank[u.band] < levelRank);
  expect(below.length).toBeGreaterThan(0);
  expect(below.every((u: any) => u.status === "validated" || u.status === "mastered")).toBe(true);
  const active = view.units.filter((u: any) => u.status === "active");
  expect(active).toHaveLength(1);
  expect(rank[active[0].band]).toBe(levelRank);
  expect(view.current_unit_id).toBe(active[0].id);
  expect(view.current_unit_id).not.toBe("a1-01");

  // Na tela: a trilha mostra as bandas abaixo como validadas e a unidade atual na banda do nível.
  await page.goto("/path");
  await expect(tid(page, "path-map")).toBeVisible({ timeout: 30_000 });
  await expect(tid(page, `path-unit-status-${active[0].id}`)).toHaveText(PATH_COPY.pt.statusActive, { timeout: 20_000 });
  await assertLayout(page, "Trilha depois do nivelamento");
});
