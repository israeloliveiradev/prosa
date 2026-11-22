import { TALK } from "@/lib/copy/talk";
import { test, expect, seedSession, assertLayout, api } from "./fixtures";
import { AI_WAIT, bodyText, createLearner, looksEnglish, press, spokenLines, tid } from "./helpers-b";

const t = TALK.pt;

async function typeLine(page: import("@playwright/test").Page, line: string) {
  const input = page.getByLabel(t.yourLine, { exact: true }).filter({ visible: true }).first();
  await expect(input).toBeEnabled({ timeout: AI_WAIT });
  await input.fill(line);
  await page.getByRole("button", { name: t.send, exact: true }).filter({ visible: true }).first().click();
}

test.describe("Bloco 8 · Conversa", () => {
  test("o mentor abre com uma fala e responde a uma fala do aluno em inglês", async ({ page, guard }) => {
    const session = await createLearner({ prefix: "talk-mentor", target: "en", level: "A2", interests: ["Música"], goal: "travel" });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/talk");
    await expect(page.getByRole("tab", { name: t.tabMentor })).toBeVisible();

    // Abertura da IA: uma fala do mentor sem o aluno ter digitado nada.
    await expect.poll(async () => (await spokenLines(page, t.listen)).length, { timeout: AI_WAIT }).toBe(1);
    const [opener] = await spokenLines(page, t.listen);
    expect(opener!.length).toBeGreaterThan(8);
    expect(looksEnglish(opener!), `abertura deve estar no idioma-alvo: ${opener}`).toBe(true);
    await assertLayout(page, "Conversa · Mentor");

    await typeLine(page, "Hello, I like music and I play the guitar every day.");
    await expect.poll(async () => (await spokenLines(page, t.listen)).length, { timeout: AI_WAIT }).toBe(2);
    const lines = await spokenLines(page, t.listen);
    expect(looksEnglish(lines[1]!), `resposta no idioma-alvo: ${lines[1]}`).toBe(true);
    expect(lines[1]).not.toBe(lines[0]);
    // A fala do aluno ficou na tela (balão verde) e o campo foi limpo.
    await expect(page.getByText("Hello, I like music and I play the guitar every day.")).toBeVisible();
    await expect(page.getByLabel(t.yourLine, { exact: true }).filter({ visible: true }).first()).toHaveValue("");
    // O servidor respondeu de verdade: a memória do mentor existe como recurso da conta.
    const memory = await api(session.token, "GET", "/api/v1/prose/memory");
    expect(memory.status).toBe(200);
    expect(Array.isArray(memory.json.facts)).toBe(true);
    // Ruído do reprodutor de áudio (voz neural) não é o que se audita aqui.
    guard.allow(/\/api\/v1\/audio/);
  });

  test("o mentor guarda um fato pessoal e o mostra numa nova carga da página", async ({ page, guard }) => {
    const session = await createLearner({ prefix: "talk-memory", target: "en", level: "B1", interests: ["Viagens"] });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/talk");
    await expect.poll(async () => (await spokenLines(page, t.listen)).length, { timeout: AI_WAIT }).toBe(1);

    await typeLine(page, "My name is Marta, I am a nurse and I have a dog called Bolt.");
    await expect.poll(async () => (await spokenLines(page, t.listen)).length, { timeout: AI_WAIT }).toBe(2);

    // Efeito real no servidor: o fato foi extraído e gravado em learner_memory.
    await expect
      .poll(async () => JSON.stringify((await api(session.token, "GET", "/api/v1/prose/memory")).json), { timeout: 30_000 })
      .toMatch(/Marta|nurse|Bolt|dog/i);
    const stored = (await api(session.token, "GET", "/api/v1/prose/memory")).json;
    expect(stored.facts.length + stored.goals.length).toBeGreaterThan(0);

    // Página nova (recarga completa): o painel "Lembra de você" traz o que foi guardado.
    await page.goto("/talk");
    const remembered = [...stored.goals, ...stored.facts].filter((item: string) => item.trim()).slice(0, 4);
    await expect(page.getByText(t.remembers, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(remembered[0]!, { exact: false }).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(t.memoryEmpty)).toHaveCount(0);
    await assertLayout(page, "Conversa · memória");
    guard.allow(/\/api\/v1\/audio/);
  });

  test("as 3 cenas (objetivo, unidade, interesse) abrem com a fala do parceiro, sem revelar a reviravolta", async ({ page, guard }) => {
    test.setTimeout(600_000);
    const session = await createLearner({ prefix: "talk-scenes", target: "en", level: "A2", interests: ["Cozinha"], goal: "travel" });
    // As cenas do dia saem do cache do servidor: pedir pela API antes é o mesmo que o app pede.
    const scenesResponse = await api(session.token, "GET", "/api/v1/persona/scenes?target_lang=en");
    expect(scenesResponse.status).toBe(200);
    const apiScenes: Array<{ id: string; kind: string; title: string; twist: string | null; opener?: string | null }> = scenesResponse.json.scenes;
    expect(apiScenes.map((scene) => scene.kind)).toEqual(["goal", "unit", "interest"]);
    const source: string = scenesResponse.json.source;
    // O bloco afirma "cenas da IA, abertura primeiro": com as cenas fixas (fallback) nada disso é conferido abaixo.
    expect(source, "as cenas do dia vieram da IA (com fallback a abertura e a reviravolta não são auditadas)").toBe("ai");
    expect(apiScenes.every((scene) => typeof scene.opener === "string" && scene.opener.trim().length > 0), "toda cena da IA traz a fala de abertura").toBe(true);

    await seedSession(page, session, { locale: "pt" });
    await page.goto("/talk?tab=scenes");
    await expect(page.locator('[data-testid^="talk-scene-"]:visible')).toHaveCount(3, { timeout: AI_WAIT });
    await expect(page.getByText(t.fromGoal, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(t.fromUnit, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(t.fromInterest, { exact: true }).first()).toBeVisible();
    await assertLayout(page, "Conversa · Cenas");

    if (source === "fallback") {
      await expect(tid(page, "talk-scenes-offline")).toBeVisible();
      test.info().annotations.push({ type: "nota", description: "A IA caiu para as cenas fixas; o selo de reserva apareceu." });
    } else {
      await expect(page.getByTestId("talk-scenes-offline").filter({ visible: true })).toHaveCount(0);
    }

    // A reviravolta é só do parceiro: nem o rótulo nem o texto aparecem ao aluno.
    expect(await bodyText(page)).not.toContain(t.twist);
    for (const scene of apiScenes) {
      if (scene.twist) expect(await bodyText(page), `reviravolta de ${scene.id} visível`).not.toContain(scene.twist);
    }

    for (const scene of apiScenes) {
      await page.locator(`[data-testid="talk-scene-${scene.id}"]:visible`).click();
      await expect(tid(page, "talk-other-scenes")).toBeVisible();
      if (source === "ai") {
        // A cena começa com a fala do parceiro, antes de o aluno escrever.
        expect(scene.opener, `cena ${scene.id} sem opener vinda do servidor`).toBeTruthy();
        await expect.poll(async () => (await spokenLines(page, t.listen))[0]).toBe(scene.opener);
        expect((await spokenLines(page, t.listen)).length).toBe(1);
        await expect(page.getByText(t.youStart.split("{lang}")[0]!, { exact: false })).toHaveCount(0);
      }
      expect(await bodyText(page)).not.toContain(t.twist);
      if (scene.twist) expect(await bodyText(page)).not.toContain(scene.twist);

      const before = (await spokenLines(page, t.listen)).length;
      const inputBox = page.getByLabel(t.yourLine, { exact: true }).filter({ visible: true }).first();
      await inputBox.fill("Hello, nice to meet you. Could you help me, please?");
      await press(page, "talk-send");
      // Resposta em personagem no idioma-alvo + o veredito do tom.
      await expect.poll(async () => (await spokenLines(page, t.listen)).length, { timeout: AI_WAIT }).toBe(before + 1);
      const lines = await spokenLines(page, t.listen);
      expect(looksEnglish(lines[lines.length - 1]!), `resposta da cena ${scene.kind}: ${lines[lines.length - 1]}`).toBe(true);
      await expect(page.getByText(t.toneLabel, { exact: true }).filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText(t.culturalNote, { exact: true }).filter({ visible: true }).first()).toBeVisible();
      await expect(
        page.getByText(new RegExp(`^(${[t.toneAdequate, t.toneDirect, t.toneInformal, t.toneInadequate].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})$`)).first(),
      ).toBeVisible();
      await press(page, "talk-other-scenes");
      await expect(page.locator('[data-testid^="talk-scene-"]:visible')).toHaveCount(3);
    }
    guard.allow(/\/api\/v1\/audio/);
  });

  test("com as cenas fora do ar, a tela é honesta: aviso de reserva, sem cena inventada em silêncio", async ({ page, guard }) => {
    const session = await createLearner({ prefix: "talk-offline", target: "en", level: "A2", goal: "career", interests: ["Negócios"] });
    await seedSession(page, session, { locale: "pt" });

    // SIMULAÇÃO de falha (única exceção ao "sem mock" da auditoria): o endpoint de cenas é abortado.
    await page.route("**/api/v1/persona/scenes*", (route) => route.abort("connectionrefused"));
    guard.allow(/persona\/scenes/);
    guard.allow(/Failed to fetch|ERR_CONNECTION_REFUSED/);
    await page.goto("/talk?tab=scenes");
    // Sem servidor não há cena nenhuma: a tela diz que está offline e que nada foi inventado.
    await expect(page.getByText(t.offlineTitle, { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(t.offlineNetwork).filter({ visible: true }).first()).toBeVisible();
    await expect(page.locator('[data-testid^="talk-scene-"]:visible')).toHaveCount(0);
    await assertLayout(page, "Cenas · offline");

    // O servidor devolvendo as cenas fixas (IA fora do ar): o selo de reserva aparece e as cenas abrem.
    await page.unroute("**/api/v1/persona/scenes*");
    // SIMULAÇÃO: resposta do servidor com source=fallback, no formato real (cenas fixas, sem fala de abertura).
    await page.route("**/api/v1/persona/scenes*", async (route) => {
      const real = await route.fetch();
      const body = await real.json();
      await route.fulfill({
        response: real,
        json: {
          source: "fallback",
          scenes: body.scenes.map((scene: Record<string, unknown>) => ({ ...scene, opener: null, twist: null })),
        },
      });
    });
    await page.reload();
    await expect(page.locator('[data-testid^="talk-scene-"]:visible')).toHaveCount(3, { timeout: AI_WAIT });
    await expect(tid(page, "talk-scenes-offline")).toBeVisible();
    await expect(page.getByText(t.fallbackBadge).first()).toBeVisible();
    await page.locator('[data-testid^="talk-scene-"]:visible').first().click();
    // Cena de reserva: o aluno começa (sem abertura da personagem) e o selo continua na cena.
    await expect(page.getByText(t.youStart.split("{lang}")[0]!, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(t.fallbackBadge).filter({ visible: true }).first()).toBeVisible();
  });

  test("a Conversa cabe no celular @mobile", async ({ page, guard }) => {
    const session = await createLearner({ prefix: "talk-mobile", target: "en", level: "A2", interests: ["Música"] });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/talk");
    await expect.poll(async () => (await spokenLines(page, t.listen)).length, { timeout: AI_WAIT }).toBe(1);
    await assertLayout(page, "Conversa 390");
    guard.allow(/\/api\/v1\/audio/);
  });
});
