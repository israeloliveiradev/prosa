import { CERT } from "@/lib/copy/cert";
import { DOSSIER } from "@/lib/copy/dossier";
import { DOSSIER_PUBLIC } from "@/lib/copy/dossier-public";
import { test, expect, seedSession, assertLayout, api, sql, APP, API, type Session } from "./fixtures";
import { AI_WAIT, activeUnitId, bodyText, createLearner, press, seedCards, tid } from "./helpers-b";

const d = DOSSIER.pt;
const pub = DOSSIER_PUBLIC.pt;

/** Troca window.print por um contador: a janela de impressão de verdade não abre no teste. */
async function stubPrint(target: { addInitScript: (script: () => void) => Promise<unknown> }): Promise<void> {
  await target.addInitScript(() => {
    (window as unknown as { __prints: number }).__prints = 0;
    window.print = () => {
      (window as unknown as { __prints: number }).__prints += 1;
    };
  });
}

/** Mede o que a página pública mostrou a quem não tem conta. */
function collect(page: import("@playwright/test").Page): string[] {
  const seen: string[] = [];
  page.on("pageerror", (error) => seen.push(`pageerror: ${error}`));
  page.on("console", (message) => {
    if (message.type() === "error") seen.push(`console.error: ${message.text()} @ ${message.location()?.url ?? ""}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) seen.push(`${response.status()} ${response.url().replace(API, "")}`);
  });
  return seen;
}

test.describe("Bloco 14 · Dossiê público, impressão e varredura de layout", () => {
  test("o Dossiê publica um link e a página pública abre sem login, com nível e medidas, e imprime", async ({ page, browser }) => {
    test.setTimeout(240_000);
    const session = await createLearner({ prefix: "dossier", target: "en", level: "B1" });
    // Medidas que o servidor teria acumulado em semanas de estudo (estado semeado, não asserção).
    sql(
      `INSERT INTO learner_profile (user_id, target_lang, reading, listening, lexicon_size, fluency_wpm, error_kinds, weak_sounds)
       VALUES ('${session.user.id}', 'en', 62, 48, 340, 95, '["tense","article"]'::jsonb, '["th"]'::jsonb)`,
    );
    await stubPrint(page);
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/dossier");
    await expect(tid(page, "dossier-screen")).toBeVisible();
    await expect(tid(page, "dossier-lexicon")).toContainText("340", { timeout: 30_000 });
    await expect(tid(page, "dossier-publish")).toBeVisible();
    await assertLayout(page, "Dossiê");

    // Publicar: o link aparece, aponta para a página do app e bate com o servidor.
    await press(page, "dossier-publish");
    const url = tid(page, "dossier-share-url");
    await expect(url).toBeVisible();
    const shown = (await url.innerText()).trim();
    const mine = await api(session.token, "GET", "/api/v1/dossier?target_lang=en");
    expect(mine.status).toBe(200);
    const token: string = mine.json.share_token;
    expect(token.length).toBeGreaterThan(16);
    expect(shown).toBe(`${APP}/dossier/${encodeURIComponent(token)}`);
    expect(sql(`SELECT count(*) FROM tutor_dossiers WHERE user_id='${session.user.id}' AND share_token='${token}'`)[0]).toBe("1");

    // Uma meta de acompanhamento entra no dossiê já publicado.
    await tid(page, "dossier-focus").fill("Passado simples nas conversas");
    await tid(page, "dossier-note").fill("Treinar três frases por dia");
    await press(page, "dossier-add");
    await expect(page.getByText("Passado simples nas conversas").first()).toBeVisible();
    expect(sql(`SELECT count(*) FROM tutor_checkpoints c JOIN tutor_dossiers t ON t.id=c.dossier_id WHERE t.user_id='${session.user.id}'`)[0]).toBe("1");

    // Imprimir no dossiê do aluno chama window.print (stub).
    await press(page, "dossier-print");
    expect(await page.evaluate(() => (window as unknown as { __prints: number }).__prints)).toBe(1);

    // Pessoa de fora: contexto novo, sem sessão nenhuma.
    const outsider = await browser.newContext({ baseURL: APP, locale: "pt-BR", viewport: page.viewportSize() ?? { width: 1440, height: 900 } });
    const guest = await outsider.newPage();
    const problems = collect(guest);
    await stubPrint(guest);
    await guest.goto(shown);
    await expect(guest.getByTestId("dossier-public")).toBeVisible();
    await expect(guest.getByText(pub.title, { exact: true })).toBeVisible();
    expect(await guest.evaluate(() => Object.keys(localStorage).filter((key) => key.includes("session")))).toEqual([]);
    // Nível e medidas reais (as mesmas do servidor).
    await expect(guest.getByText(new RegExp(`^${d.level.replace("{level}", "[ABC][12]").replace("{lang}", "Inglês")}$`))).toBeVisible({ timeout: 30_000 });
    await expect(guest.getByTestId("dossier-lexicon")).toContainText("340");
    await expect(guest.getByTestId("dossier-fluency")).toContainText("95");
    await expect(guest.getByTestId("dossier-listening")).toContainText("48");
    await expect(guest.getByTestId("dossier-reading")).toContainText("62");
    await expect(guest.getByTestId("dossier-errors").getByText("tense", { exact: true })).toBeVisible();
    await expect(guest.getByTestId("dossier-sounds").getByText("th", { exact: true })).toBeVisible();
    await expect(guest.getByText("Passado simples nas conversas")).toBeVisible();
    const view = await (await fetch(`${API}/api/v1/dossier/view/${token}`)).json();
    expect(view.lexicon).toBe(340);
    await assertLayout(guest, "Dossiê público");
    // Imprimir na página pública.
    await guest.getByTestId("dossier-public-print").click();
    expect(await guest.evaluate(() => (window as unknown as { __prints: number }).__prints)).toBe(1);
    expect(problems).toEqual([]);

    // Republicar troca o token: o link antigo morre com a mensagem traduzida.
    await press(page, "dossier-republish");
    await expect.poll(async () => (await api(session.token, "GET", "/api/v1/dossier?target_lang=en")).json.share_token).not.toBe(token);
    await guest.reload();
    await expect(guest.getByTestId("dossier-public-missing")).toBeVisible({ timeout: 20_000 });
    await expect(guest.getByText(pub.missing)).toBeVisible();
    await outsider.close();
  });

  test("o nível do link público é o mesmo que o aluno vê no próprio dossiê", async () => {
    const session = await createLearner({ prefix: "dossier-level", target: "en", level: "B1" });
    const published = await api(session.token, "POST", "/api/v1/dossier/publish", { target_lang: "en" });
    expect(published.status).toBe(200);
    const owner = await api(session.token, "GET", "/api/v1/dossier?target_lang=en");
    const view = await (await fetch(`${API}/api/v1/dossier/view/${published.json.share_token}`)).json();
    expect(owner.json.level).toBe("B1");
    expect(view.level, "o link público não pode mostrar um nível diferente do dono").toBe(owner.json.level);
  });

  test("um token inválido mostra o estado 'não existe' traduzido no dossiê e no certificado", async ({ page, guard }) => {
    // 404 de propósito: tokens que não existem.
    guard.allow(/\/api\/v1\/dossier\/view\//);
    guard.allow(/\/api\/v1\/score\/cert\//);
    await page.goto("/dossier/token-que-nao-existe-123456");
    await expect(page.getByTestId("dossier-public-missing")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(pub.missing)).toBeVisible();
    await assertLayout(page, "Dossiê inválido");
    await page.goto("/cert/token-invalido");
    await expect(page.getByText(CERT.pt.missing)).toBeVisible({ timeout: 20_000 });
    await assertLayout(page, "Certificado inválido");
    // E em outro idioma de interface: a mensagem acompanha (alemão).
    const german = await page.context().newPage();
    await german.addInitScript(() => localStorage.setItem("prosa" + String.fromCharCode(92) + "prosa.locale.v1", "de"));
    await german.goto("/dossier/token-que-nao-existe-123456");
    await expect(german.getByText(DOSSIER_PUBLIC.de.missing)).toBeVisible({ timeout: 20_000 });
    expect(DOSSIER_PUBLIC.de.missing).not.toBe(pub.missing);
    await german.close();
  });

  test("varredura de layout: toda rota viva cabe na tela e não gera erro de console @layout", async ({ page, browser }) => {
    test.setTimeout(900_000);
    const session: Session = await createLearner({ prefix: "sweep", target: "en", level: "A2", interests: ["Música", "Viagens"], goal: "travel" });
    seedCards(session.user.id, "en", [
      { front: "harbor", back: "porto", context: "The harbor is quiet at dawn.", dueInDays: -3 },
      { front: "bridge", back: "ponte", context: "We crossed the bridge.", status: "mastered", dueInDays: 40, reps: 8, intervalDays: 40, stability: 40 },
    ]);
    sql(`INSERT INTO learner_profile (user_id, target_lang, reading, listening, lexicon_size, fluency_wpm) VALUES ('${session.user.id}', 'en', 55, 40, 210, 80)`);
    const published = await api(session.token, "POST", "/api/v1/dossier/publish", { target_lang: "en" });
    expect(published.status).toBe(200);
    const token: string = published.json.share_token;
    const unitId = await activeUnitId(session.token);

    await seedSession(page, session, { locale: "pt" });
    const width = page.viewportSize()?.width ?? 1440;

    // Rota -> como saber que ela terminou de carregar (inclusive o que vem da IA).
    const routes: Array<[string, (p: import("@playwright/test").Page) => Promise<void>]> = [
      // "Hoje" e "Trilha" também são rótulos da navegação (visíveis na hora): espera o conteúdo que vem do servidor.
      ["/", async (p) => void (await expect(tid(p, "home-session-unit")).toBeVisible({ timeout: 30_000 }))],
      ["/path", async (p) => void (await expect(tid(p, "path-map")).toBeVisible({ timeout: 30_000 }))],
      ["/news", async (p) => void (await expect(p.getByText("Vocabulário", { exact: true }).first()).toBeVisible({ timeout: AI_WAIT }))],
      ["/life", async (p) => void (await expect(tid(p, "life-screen")).toBeVisible())],
      ["/talk", async (p) => void (await expect(p.getByLabel("Sua fala", { exact: true }).filter({ visible: true }).first()).toBeEnabled({ timeout: AI_WAIT }))],
      ["/talk?tab=scenes", async (p) => void (await expect(p.locator('[data-testid^="talk-scene-"]:visible').first()).toBeVisible({ timeout: AI_WAIT }))],
      ["/practice", async (p) => void (await expect(tid(p, "practice-hub")).toBeVisible())],
      ["/memory", async (p) => void (await expect(tid(p, "memory-start")).toBeVisible({ timeout: 30_000 }))],
      ["/memory-palace", async (p) => void (await expect(tid(p, "memory-start")).toBeVisible({ timeout: 30_000 }))],
      ["/pronunciation", async (p) => void (await expect(tid(p, "pronunciation-origin")).toBeVisible({ timeout: 30_000 }))],
      ["/syntax-workshop", async (p) => void (await expect(tid(p, "workshop-screen")).toBeVisible())],
      ["/duel", async (p) => void (await expect(tid(p, "duel-ready")).toBeVisible({ timeout: AI_WAIT }))],
      ["/profile", async (p) => void (await expect(p.getByText("Temas", { exact: false }).first()).toBeVisible())],
      ["/settings", async (p) => void (await expect(tid(p, "settings-screen")).toBeVisible())],
      ["/paywall", async (p) => void (await expect(tid(p, "paywall-unavailable")).toBeVisible({ timeout: 20_000 }))],
      ["/score", async (p) => void (await expect(tid(p, "score-screen")).toBeVisible({ timeout: 30_000 }))],
      ["/exam", async (p) => void (await expect(tid(p, "exam-screen")).toBeVisible({ timeout: 30_000 }))],
      ["/pairs", async (p) => void (await expect(p.getByRole("heading").first()).toBeVisible())],
      ["/dossier", async (p) => void (await expect(tid(p, "dossier-screen")).toBeVisible())],
      ["/org", async (p) => void (await expect(p.getByRole("heading", { name: "Equipe" })).toBeVisible())],
      ["/guide", async (p) => void (await expect(tid(p, "guide-screen")).toBeVisible())],
      // Rotas de foco (tela cheia) que a varredura deixava de fora.
      ["/quiz", async (p) => void (await expect(tid(p, "quiz-screen")).toBeVisible({ timeout: 30_000 }))],
      ["/placement", async (p) => void (await expect(tid(p, "placement-screen")).toBeVisible({ timeout: 30_000 }))],
      [`/unit-test?unit=${unitId}`, async (p) => void (await expect(tid(p, "path-test-intro")).toBeVisible({ timeout: 30_000 }))],
      ["/checkpoint", async (p) => void (await expect(tid(p, "path-test-intro")).toBeVisible({ timeout: 30_000 }))],
    ];

    for (const [route, ready] of routes) {
      await page.goto(route);
      await ready(page);
      // O que ainda estiver animando ou carregando um último pedaço assenta antes de medir.
      await page.waitForTimeout(800);
      await assertLayout(page, `${route} @${width}`);
      expect(page.url(), `${route} não deveria redirecionar para o login`).not.toContain("/account");
    }

    // Páginas públicas, sem sessão.
    const outsider = await browser.newContext({ baseURL: APP, locale: "pt-BR", viewport: page.viewportSize() ?? { width: 1440, height: 900 } });
    const guest = await outsider.newPage();
    const problems = collect(guest);
    await guest.goto("/account");
    await expect(guest.getByRole("textbox").first()).toBeVisible({ timeout: 20_000 });
    await guest.waitForTimeout(800);
    await assertLayout(guest, `/account @${width}`);
    await guest.goto(`/dossier/${token}`);
    await expect(guest.getByTestId("dossier-public-print")).toBeVisible({ timeout: 20_000 });
    await guest.waitForTimeout(500);
    await assertLayout(guest, `/dossier/<token> @${width}`);
    expect(await bodyText(guest)).toContain("210");
    expect(problems, "erros nas páginas públicas").toEqual([]);
    await outsider.close();
  });
});
