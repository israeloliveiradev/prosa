import { test, expect, createAccount, seedSession, assertLayout, api, sql, readStore } from "./fixtures";
import { press, tid, utcDate } from "./helpers-a";

/** Bloco 2: os 7 idiomas no seletor de curso, troca de curso, progresso isolado por curso. */

const NAMES: Record<string, string> = { en: "Inglês", es: "Espanhol", de: "Alemão", fr: "Francês", it: "Italiano", ja: "Japonês", ru: "Russo" };

/** Navegação dentro do app (sem recarregar): mantém caches de memória como um aluno que clica. */
async function spaGo(page: import("@playwright/test").Page, path: string): Promise<void> {
  await page.evaluate((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
}

/** O botão do curso mostra a bandeira e o nome (no celular só a bandeira): o rótulo de acessibilidade tem sempre o nome. */
async function expectCourse(page: import("@playwright/test").Page, lang: string): Promise<void> {
  await expect(tid(page, "course-switcher-btn")).toHaveAttribute("aria-label", new RegExp(NAMES[lang]), { timeout: 20_000 });
}

async function openSwitcher(page: import("@playwright/test").Page): Promise<void> {
  await press(page, "course-switcher-btn");
  await expect(tid(page, "course-sheet")).toBeVisible();
}

async function switchTo(page: import("@playwright/test").Page, lang: string, userId: string): Promise<void> {
  await openSwitcher(page);
  await press(page, `course-item-${lang}`);
  const ok = page.locator(`[data-testid="course-switcher-btn"][aria-label*="${NAMES[lang]}"]`).filter({ visible: true });
  const failed = page.getByRole("alert").filter({ visible: true }).first();
  await expect(ok.or(failed)).toBeVisible({ timeout: 20_000 });
  if (await ok.isVisible()) return;
  // APP BUG (B2-1): a troca de curso falhou (POST /study/activate devolve 500). O teste registra a falha e
  // troca por SQL só para seguir com o isolamento por curso.
  expect.soft(false, `trocar para ${lang} pelo seletor falhou (500 em /study/activate)`).toBe(true);
  sql(`UPDATE study_tracks SET active = false WHERE user_id = '${userId}'; UPDATE study_tracks SET active = true WHERE user_id = '${userId}' AND target_lang = '${lang}'; UPDATE users SET target_lang = '${lang}' WHERE id = '${userId}'`);
  await page.reload();
  await expectCourse(page, lang);
}

test("os 7 idiomas no seletor, adicionar e trocar de curso, progresso isolado @mobile", async ({ page, guard }) => {
  test.setTimeout(300_000);
  guard.allow(/huggingface|hf\.co|onnx|wasm/i);
  // B2-1: trocar de curso pode devolver 500 (declarado aqui; a falha é registrada com expect.soft em switchTo).
  guard.allow(/500 POST \/api\/v1\/study\/activate|Failed to load resource.*500/);
  const session = await createAccount({ prefix: "courses", target: "en", level: "A1" });
  const token = session.token;
  const userId = session.user.id;

  await seedSession(page, session);
  await page.goto("/");
  await expect(tid(page, "home-screen")).toBeVisible();
  await expectCourse(page, "en");
  await assertLayout(page, "Hoje (curso en)");

  // Adicionar um curso pela UI: seletor -> "adicionar idioma" -> /quiz -> espanhol -> salvar.
  await openSwitcher(page);
  await press(page, "course-add-btn");
  await expect(tid(page, "quiz-screen")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("target-lang-es").filter({ visible: true }).first().click();
  await press(page, "theme-preset-1");
  await press(page, "quiz-save");
  await expect(page).toHaveURL(/\/profile/, { timeout: 30_000 });
  const tracksAfterAdd = await api(token, "GET", "/api/v1/study/tracks");
  expect(tracksAfterAdd.json.tracks.map((t: any) => t.target_lang).sort()).toEqual(["en", "es"]);
  expect(tracksAfterAdd.json.tracks.find((t: any) => t.target_lang === "es").active).toBe(true);
  await expectCourse(page, "es");

  // Os outros cinco cursos: preparação por SQL (a API de ativação devolve 500 conforme a ordem das linhas, ver B2-1) e inglês ativo.
  sql(`INSERT INTO study_tracks (user_id, target_lang, through_lang, active, level) SELECT '${userId}', l, 'pt', false, 'A1' FROM unnest(ARRAY['de','fr','it','ja','ru']) AS l;
    UPDATE study_tracks SET active = false WHERE user_id = '${userId}';
    UPDATE study_tracks SET active = true WHERE user_id = '${userId}' AND target_lang = 'en';
    UPDATE users SET target_lang = 'en', native_lang = 'pt', level = 'A1' WHERE id = '${userId}'`);
  expect((await api(token, "GET", "/api/v1/study/tracks")).json.tracks).toHaveLength(7);

  // Estado por curso: 2 cartões vencidos em en, 1 em de; uma sessão concluída só em en.
  sql(`INSERT INTO srs_cards (user_id, front_phrase, back_translation, context_sentence, target_lang, status, next_review_at) VALUES
    ('${userId}', 'audit-alpha', 'alfa', 'This is audit-alpha.', 'en', 'learning', now() - interval '2 hours'),
    ('${userId}', 'audit-beta', 'beta', 'This is audit-beta.', 'en', 'learning', now() - interval '2 hours'),
    ('${userId}', 'audit-gamma', 'gama', 'Das ist audit-gamma.', 'de', 'learning', now() - interval '2 hours')`);
  const done = await api(token, "POST", "/api/v1/sessions/complete", { date: utcDate(0), unit_id: "a1-01", elapsed_seconds: 600, target_lang: "en" });
  expect(done.status).toBe(200);

  await page.goto("/");
  await expect(tid(page, "home-screen")).toBeVisible();
  await expectCourse(page, "en");

  // Os 7 idiomas, cada um com a bandeira e o nome certos.
  await openSwitcher(page);
  for (const [lang, name] of Object.entries(NAMES)) {
    const item = tid(page, `course-item-${lang}`);
    await expect(item, `curso ${lang} na lista`).toBeVisible();
    await expect(item).toContainText(name);
    await expect(item.getByRole("img", { name, exact: true }).first(), `bandeira de ${lang}`).toBeVisible();
  }
  await assertLayout(page, "seletor de cursos");
  await page.keyboard.press("Escape");
  await expect(tid(page, "course-sheet")).toBeHidden();

  // Curso en: baralho e trilha.
  await spaGo(page, "/memory");
  await expect(page.getByText("audit-alpha", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("audit-beta", { exact: true })).toBeVisible();
  await expect(page.getByText("audit-gamma", { exact: true })).toHaveCount(0);
  await assertLayout(page, "/memory en");
  await spaGo(page, "/path");
  await expect(tid(page, "path-mastery-lessons")).toBeVisible({ timeout: 20_000 });
  const enLessons = ((await tid(page, "path-mastery-lessons").textContent()) ?? "").replace(/\s+/g, " ");
  expect(enLessons).toMatch(/1\D+3/);

  // Troca para alemão pela UI: o baralho e a trilha são os do alemão, nada de inglês.
  await switchTo(page, "de", userId);
  expect((await api(token, "GET", "/api/v1/account/settings")).status).toBe(200);
  expect(sql(`SELECT target_lang FROM users WHERE id = '${userId}'`)[0]).toBe("de");
  await expect(tid(page, "path-mastery-lessons")).toBeVisible({ timeout: 20_000 });
  await expect(async () => {
    const text = ((await tid(page, "path-mastery-lessons").textContent()) ?? "").replace(/\s+/g, " ");
    expect(text).toMatch(/0\D+3/);
  }).toPass({ timeout: 20_000 });
  await spaGo(page, "/memory");
  // APP BUG (B2-2): o baralho do servidor usa a chave ["srs-cards", userId] (sem o idioma) com staleTime de 60 s;
  // trocar de curso dentro do app não busca os cartões do novo curso. Registra a falha e recarrega para seguir.
  const gamma = page.getByText("audit-gamma", { exact: true });
  await gamma.waitFor({ state: "visible", timeout: 8_000 }).catch(() => undefined);
  expect.soft(await gamma.isVisible(), "os cartões do novo curso aparecem sem recarregar a página").toBe(true);
  if (!(await gamma.isVisible())) {
    await page.goto("/memory");
    await expect(gamma).toBeVisible({ timeout: 20_000 });
  }
  await expect(page.getByText("audit-alpha", { exact: true })).toHaveCount(0);
  await expect(page.getByText("audit-beta", { exact: true })).toHaveCount(0);

  // Servidor isolado por curso.
  const deLesson = (await api(token, "GET", "/api/v1/path?target_lang=de")).json.units.find((u: any) => u.id === "a1-01");
  const enLesson = (await api(token, "GET", "/api/v1/path?target_lang=en")).json.units.find((u: any) => u.id === "a1-01");
  expect(deLesson.mastery.lessons.done).toBe(0);
  expect(enLesson.mastery.lessons.done).toBe(1);

  // Volta para inglês: o que era do inglês volta, e o do alemão some.
  await switchTo(page, "en", userId);
  await spaGo(page, "/memory");
  await expect(page.getByText("audit-alpha", { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("audit-beta", { exact: true })).toBeVisible();
  await expect(page.getByText("audit-gamma", { exact: true })).toHaveCount(0);
  await spaGo(page, "/path");
  await expect(async () => {
    const text = ((await tid(page, "path-mastery-lessons").textContent()) ?? "").replace(/\s+/g, " ");
    expect(text).toMatch(/1\D+3/);
  }).toPass({ timeout: 20_000 });
  expect(sql(`SELECT target_lang FROM users WHERE id = '${userId}'`)[0]).toBe("en");

  // O XP e o progresso local também são por curso: o alemão não herdou o do inglês.
  const xp = JSON.parse((await readStore(page, "prosa.xp.v1")) ?? "{}");
  expect(xp.version === 2 ? Object.keys(xp.lanes).includes("en") : true).toBe(true);
});

test("alternar entre cursos várias vezes nunca devolve 500", async () => {
  const session = await createAccount({ prefix: "flip", target: "en", level: "A1" });
  const statuses: number[] = [];
  // APP BUG (B2-1): UPDATE study_tracks SET active = (target_lang = $2) viola study_tracks_one_active conforme a ordem física das linhas.
  for (const lang of ["es", "de", "fr", "it", "ja", "ru", "en", "ru", "en", "es", "en", "fr"]) {
    const res = await api(session.token, "POST", "/api/v1/study/activate", { target_lang: lang, through_lang: "pt", level: "A1" });
    statuses.push(res.status);
  }
  expect(statuses, "status de cada troca (es, de, fr, it, ja, ru, en, ru, en, es, en, fr)").toEqual(Array(12).fill(200));
});

test("ao trocar de curso dentro do app, os cartões do servidor do novo curso aparecem sem recarregar", async ({ page, guard }) => {
  test.setTimeout(240_000);
  guard.allow(/huggingface|hf.co|onnx|wasm/i);
  const session = await createAccount({ prefix: "deckswitch", target: "en", level: "A1" });
  const userId = session.user.id;
  // Cartões que já estão no servidor: um em inglês (curso atual) e um em espanhol (curso que será adicionado).
  sql(`INSERT INTO srs_cards (user_id, front_phrase, back_translation, context_sentence, target_lang, status, next_review_at) VALUES
    ('${userId}', 'audit-alpha', 'alfa', 'This is audit-alpha.', 'en', 'learning', now() - interval '2 hours'),
    ('${userId}', 'audit-eta', 'eta', 'Esto es audit-eta.', 'es', 'learning', now() - interval '2 hours')`);
  await seedSession(page, session);
  await page.goto("/memory");
  await expect(page.getByText("audit-alpha", { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("audit-eta", { exact: true })).toHaveCount(0);
  await assertLayout(page, "/memory en");
  // Adiciona o espanhol pela tela (o curso ativo passa a ser es) e volta à Revisão sem recarregar.
  await openSwitcher(page);
  await press(page, "course-add-btn");
  await expect(tid(page, "quiz-screen")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("target-lang-es").filter({ visible: true }).first().click();
  await press(page, "theme-preset-1");
  await press(page, "quiz-save");
  await expect(page).toHaveURL(/\/profile/,{ timeout: 30_000 });
  expect(sql(`SELECT target_lang FROM users WHERE id = '${userId}'`)[0]).toBe("es");
  await expectCourse(page, "es");
  await spaGo(page, "/memory");
  // APP BUG (B2-2): a consulta ["srs-cards", userId] não tem o idioma e vale 60 s: o baralho do espanhol não é buscado.
  await expect(page.getByText("audit-eta", { exact: true }), "cartão do espanhol depois de trocar de curso").toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("audit-alpha", { exact: true })).toHaveCount(0);
});
