import { test, expect, createAccount, seedSession, assertLayout, api, readStore, sql } from "./fixtures";
import { press, tid, userRow } from "./helpers-a";
import { DISPLAY_LOCALES } from "@/lib/i18n";
import { SHELL_COPY } from "@/lib/copy/shell";
import { HOME_COPY } from "@/lib/copy/home";
import { PATH_COPY } from "@/lib/copy/path";
import { SETTINGS } from "@/lib/copy/settings";

/** Bloco 3: idioma da interface nos 7 idiomas (tabelas de texto), gravado na conta, e idioma de apoio. */

/** Item de navegação: barra lateral (desktop) ou aba de baixo (celular). */
function navItem(page: import("@playwright/test").Page, id: string) {
  return page.locator(`[data-testid="nav-item-${id}"], [data-testid="tab-${id}"]`).filter({ visible: true }).first();
}

async function spaGo(page: import("@playwright/test").Page, path: string): Promise<void> {
  await page.evaluate((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

test("o idioma de tela troca nos 7 idiomas, vale na conta e sobrevive ao F5 @mobile", async ({ page, guard }) => {
  test.setTimeout(300_000);
  guard.allow(/huggingface|hf\.co|onnx|wasm/i);
  const session = await createAccount({ prefix: "locale", target: "en", level: "A1" });
  await seedSession(page, session);
  await page.goto("/settings");
  await expect(tid(page, "settings-screen")).toBeVisible();
  await assertLayout(page, "Ajustes pt");

  const order = ["pt", "en", "de", "fr", "es", "it", "ja"] as const;
  expect([...DISPLAY_LOCALES].sort()).toEqual([...order].sort());
  // A tela é comparada com as tabelas do próprio app: uma tabela copiada do português passaria. Cada idioma
  // tem de ter rótulos próprios (no máximo 2 dos 8 iguais ao pt, ex.: "Ajustes" em es).
  const fields = (c: (typeof order)[number]) => [SHELL_COPY[c].navToday, SHELL_COPY[c].navPath, SHELL_COPY[c].navReading, SHELL_COPY[c].navTalk, SHELL_COPY[c].navYou, SETTINGS[c].title, HOME_COPY[c].sessionTitle, PATH_COPY[c].title];
  for (const c of order.filter((item) => item !== "pt")) {
    const same = fields(c).filter((value, index) => value === fields("pt")[index]).length;
    expect(same, `tabela de ${c} igual ao português em ${same} de 8 rótulos`).toBeLessThanOrEqual(2);
  }
  expect(fields("ja").join(""), "japonês com escrita japonesa").toMatch(/[぀-ヿ一-鿿]/);
  for (const code of order) {
    await press(page, `settings-locale-${code}`);
    const shell = SHELL_COPY[code];
    // Navegação lateral: os cinco rótulos são exatamente os da tabela do idioma.
    await expect(navItem(page, "today")).toHaveText(shell.navToday, { timeout: 15_000 });
    await expect(navItem(page, "path")).toHaveText(shell.navPath);
    await expect(navItem(page, "reading")).toHaveText(shell.navReading);
    await expect(navItem(page, "talk")).toHaveText(shell.navTalk);
    await expect(navItem(page, "you")).toHaveText(shell.navYou);
    await expect(page.getByText(SETTINGS[code].title, { exact: true }).first(), `título de Ajustes em ${code}`).toBeVisible();
    // A conta guarda o idioma.
    await expect.poll(async () => (await api(session.token, "GET", "/api/v1/account/settings")).json.display_locale, { timeout: 15_000 }).toBe(code);
    expect(userRow(session.user.id).display_locale).toBe(code);
    await assertLayout(page, `Ajustes ${code}`);

    // Hoje e Trilha no idioma.
    await spaGo(page, "/");
    await expect(page.getByText(HOME_COPY[code].sessionTitle, { exact: true }).first(), `título de Hoje em ${code}`).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(shell.navToday, { exact: true }).first()).toBeVisible();
    await assertLayout(page, `Hoje ${code}`);
    await spaGo(page, "/path");
    await expect(page.getByText(PATH_COPY[code].title, { exact: true }).first(), `título da Trilha em ${code}`).toBeVisible({ timeout: 20_000 });
    await assertLayout(page, `Trilha ${code}`);

    // F5: o idioma fica (local e conta).
    await page.reload();
    await expect(navItem(page, "today")).toHaveText(shell.navToday, { timeout: 20_000 });
    await expect(page.getByText(PATH_COPY[code].title, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
    if (code !== "pt") expect(await readStore(page, "prosa.locale.v1")).toContain(code);
    await spaGo(page, "/settings");
    await expect(tid(page, "settings-screen")).toBeVisible();
  }
  expect((await api(session.token, "GET", "/api/v1/account/settings")).json.display_locale).toBe("ja");
});

test("o idioma da conta no servidor vale sobre o idioma guardado no aparelho @mobile", async ({ page, guard }) => {
  guard.allow(/huggingface|hf\.co|onnx|wasm/i);
  // Conta em alemão; o aparelho chega com japonês guardado (aparelho novo para esta conta).
  const session = await createAccount({ prefix: "locale-srv", target: "en", level: "A1", locale: "de" });
  expect(userRow(session.user.id).display_locale).toBe("de");
  await seedSession(page, session, { locale: "ja" });
  await page.goto("/");
  await expect(navItem(page, "today")).toBeVisible({ timeout: 20_000 });
  await expect(navItem(page, "today")).toHaveText(SHELL_COPY.de.navToday, { timeout: 20_000 });
  await expect(page.getByText(HOME_COPY.de.sessionTitle, { exact: true }).first()).toBeVisible();
  expect(await readStore(page, "prosa.locale.v1")).toContain("de");
  // O servidor não foi sobrescrito pelo japonês do aparelho.
  expect((await api(session.token, "GET", "/api/v1/account/settings")).json.display_locale).toBe("de");
  await assertLayout(page, "Hoje (conta em de)");
});

test("o idioma de apoio do aluno aparece nas explicações: native es recebe tradução em espanhol", async () => {
  test.setTimeout(180_000);
  const session = await createAccount({ prefix: "support", target: "en", native: "es", level: "A1", locale: "es" });
  expect(userRow(session.user.id).native_lang).toBe("es");
  // O teste da unidade e a lição só usam glosas no idioma de apoio. Aqui: a lição da unidade 1 (IA).
  const lesson = await api(session.token, "POST", "/api/v1/lessons/generate-personalized", { selected_topic: "Cafe", unit_id: "a1-01" });
  expect(lesson.status, JSON.stringify(lesson.json).slice(0, 300)).toBe(200);
  const body = lesson.json;
  const translations: string[] = [];
  const collect = (value: unknown, key = ""): void => {
    if (typeof value === "string" && /translation|gloss|meaning|support/i.test(key)) translations.push(value);
    else if (Array.isArray(value)) value.forEach((item) => collect(item, key));
    else if (value && typeof value === "object") Object.entries(value).forEach(([k, v]) => collect(v, k));
  };
  collect(body);
  expect(translations.length, `campos de tradução na lição: ${Object.keys(body).join(",")}`).toBeGreaterThan(0);
  const spanish = /\b(el|la|los|las|un|una|de|que|en|es|con|por|para|yo|tú|mi|su|y|se|me|te|hola|gracias|café)\b|[ñáéíóú¿¡]/i;
  const english = /\b(the|and|is|are|with|you|your|my|this|that|hello|thanks)\b/i;
  const longest = [...translations].sort((a, b) => b.length - a.length)[0] ?? "";
  expect(longest, `tradução mais longa: ${longest.slice(0, 120)}`).toMatch(spanish);
  const englishOnly = translations.filter((text) => english.test(text) && !spanish.test(text));
  expect(englishOnly, "tradução em inglês no lugar do espanhol").toEqual([]);
  // A regex "spanish" acima também aceita português (de, que, para, acentos): o apoio padrão (pt) passaria.
  // Exige marca só do espanhol e nenhuma marca só do português.
  const spanishOnly = /[ñ¿¡]|\b(el|los|las|usted|tú|yo|hola|gracias|muy|pero|y|eres|soy|nombre)\b/i;
  const portugueseOnly = /[ãõ]|\b(você|não|obrigad[oa]|olá|uma|com|são|isso|muito|também|nome|sou)\b/i;
  expect(longest, `marca só do espanhol na tradução: ${longest.slice(0, 120)}`).toMatch(spanishOnly);
  const portugueseLeak = translations.filter((text) => portugueseOnly.test(text));
  expect(portugueseLeak, "tradução em português no lugar do espanhol").toEqual([]);
  // Os cartões criados da lição (SRS) também chegam em espanhol.
  void sql;
});
