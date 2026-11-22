import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applyAnswer, EMPTY_TALLY, type DuelDrillItem } from "@/features/practice/model/duel-model";
import { DUEL } from "@/lib/copy/duel";
import { test, expect, seedSession, assertLayout, api, sql, type Session } from "./fixtures";
import { AI_WAIT, activeUnitId, bodyText, createLearner, press, tid } from "./helpers-b";

const t = DUEL.pt;

/** Lemas-núcleo de uma unidade, lidos do currículo do backend (src/curriculum/<idioma>.ts). */
function unitLemmas(lang: string, unitId: string): string[] {
  const source = readFileSync(resolve(__dirname, "../../../src/curriculum", `${lang}.ts`), "utf8");
  const start = source.indexOf(`"${unitId}": {`);
  expect(start, `unidade ${unitId} no currículo ${lang}`).toBeGreaterThan(-1);
  const next = source.slice(start + 10).search(/\n {2}"(a1|a2|b1|b2|c1)-\d\d": \{/);
  const block = next === -1 ? source.slice(start) : source.slice(start, start + 10 + next);
  return [...block.matchAll(/lemma: "([^"]+)"/g)].map((match) => match[1]!.toLowerCase());
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-zà-ÿ'’-]+/g) ?? []);
}

interface Round {
  drills: DuelDrillItem[];
  best: number | null;
  unit_id: string | null;
}

async function playRound(page: import("@playwright/test").Page, drills: DuelDrillItem[], wrongAt: number[] = []) {
  let tally = EMPTY_TALLY;
  for (const [index, drill] of drills.entries()) {
    await expect(tid(page, "duel-progress")).toContainText(t.progress.replace("{n}", String(index + 1)).replace("{total}", String(drills.length)));
    await expect(tid(page, "duel-prompt")).toHaveText(drill.prompt);
    const wrong = wrongAt.includes(index);
    const choice = wrong ? (drill.answer + 1) % 4 : drill.answer;
    await expect(tid(page, `duel-option-${choice}`)).toHaveText(drill.options[choice]!);
    await press(page, `duel-option-${choice}`);
    await expect(tid(page, "duel-feedback")).toHaveText(wrong ? t.wrong : t.right);
    tally = applyAnswer(tally, !wrong);
    await expect(tid(page, "duel-score")).toContainText(`${t.scoreLabel} ${tally.score}`);
    await press(page, "duel-next");
  }
  return tally;
}

async function openDuel(page: import("@playwright/test").Page, path: string): Promise<Round> {
  const round = page.waitForResponse((response) => response.url().includes("/api/v1/duel/round") && response.request().method() === "POST", { timeout: AI_WAIT });
  await page.goto(path);
  const response = await round;
  expect(response.status()).toBe(200);
  const body = await response.json();
  await expect(tid(page, "duel-ready")).toBeVisible({ timeout: AI_WAIT });
  return body as Round;
}

function runs(session: Session, unit: string | null): number[] {
  const filter = unit ? `unit_id = '${unit}'` : "unit_id IS NULL";
  return sql(`SELECT score FROM duel_runs WHERE user_id='${session.user.id}' AND ${filter} ORDER BY played_at`).map(Number);
}

test.describe("Bloco 11 · Duelo", () => {
  test("a rodada-chefe da unidade tem cerca de 12 perguntas sobre a unidade, salva o resultado e anuncia o recorde", async ({ page }) => {
    test.setTimeout(480_000);
    const session = await createLearner({ prefix: "duel-unit", target: "en", level: "A1" });
    const unit = await activeUnitId(session.token);
    expect(unit).toBe("a1-01");
    await seedSession(page, session, { locale: "pt" });

    const first = await openDuel(page, `/duel?unit=${unit}`);
    expect(first.unit_id).toBe(unit);
    expect(first.best).toBeNull();
    expect(first.drills.length).toBeGreaterThanOrEqual(8);
    expect(first.drills.length).toBeLessThanOrEqual(12);
    await expect(page.getByText(t.dekUnit.replace("{unit}", unit.toUpperCase()))).toBeVisible();
    await expect(tid(page, "duel-best")).toHaveText(t.noBest);
    await assertLayout(page, "Duelo · pronto");

    // As perguntas são sobre a unidade: as palavras-núcleo dela aparecem nos exercícios.
    const lemmas = unitLemmas("en", unit);
    expect(lemmas.length).toBeGreaterThan(8);
    const about = first.drills.filter((drill) => {
      const seen = words(`${drill.prompt} ${drill.options[drill.answer]}`);
      return lemmas.some((lemma) => seen.has(lemma));
    });
    expect(about.length, `perguntas com lemas de ${unit}: ${about.length}/${first.drills.length}`).toBeGreaterThanOrEqual(Math.ceil(first.drills.length / 2));
    for (const drill of first.drills) {
      expect(drill.prompt).toContain("____");
      expect(new Set(drill.options.map((option) => option.toLowerCase())).size).toBe(4);
    }

    // Rodada 1: um erro na 3ª pergunta.
    await press(page, "duel-start");
    await expect(tid(page, "duel-round")).toBeVisible();
    await assertLayout(page, "Duelo · rodada");
    const tally1 = await playRound(page, first.drills, [2]);
    await expect(tid(page, "duel-done")).toBeVisible();
    await expect(tid(page, "duel-result")).toHaveText(
      t.resultLine.replace("{score}", String(tally1.score)).replace("{correct}", String(tally1.correct)).replace("{total}", String(first.drills.length)).replace("{combo}", String(tally1.bestCombo)),
    );
    await expect(tid(page, "duel-save")).toHaveText(t.saved);
    await expect(tid(page, "duel-new-best")).toHaveText(t.newBest);
    await assertLayout(page, "Duelo · resultado");
    // Efeito real: a rodada foi gravada com a unidade e o melhor do servidor é o placar.
    expect(runs(session, unit)).toEqual([tally1.score]);
    expect(sql(`SELECT correct_count, best_combo FROM duel_runs WHERE user_id='${session.user.id}'`)[0]).toBe(`${tally1.correct}|${tally1.bestCombo}`);

    // Rodada 2: tudo certo, o recorde sobe e é anunciado de novo; a tela já abre mostrando o melhor anterior.
    const secondResponse = page.waitForResponse((response) => response.url().includes("/api/v1/duel/round") && response.request().method() === "POST", { timeout: AI_WAIT });
    await press(page, "duel-again");
    const second: Round = await (await secondResponse).json();
    expect(second.best).toBe(tally1.score);
    await expect(tid(page, "duel-best")).toHaveText(t.bestLine.replace("{n}", String(tally1.score)));
    await press(page, "duel-start");
    const tally2 = await playRound(page, second.drills, []);
    expect(tally2.score).toBeGreaterThan(tally1.score);
    await expect(tid(page, "duel-save")).toHaveText(t.saved);
    await expect(tid(page, "duel-new-best")).toHaveText(t.newBest);
    expect(runs(session, unit)).toEqual([tally1.score, tally2.score]);
    const best = sql(`SELECT max(score) FROM duel_runs WHERE user_id='${session.user.id}' AND unit_id='${unit}'`)[0];
    expect(Number(best)).toBe(tally2.score);

    // O placar livre não inclui rodadas-chefe de unidade.
    const board = await api(session.token, "GET", "/api/v1/duel/leaderboard");
    expect(board.json.entries.some((entry: { you: boolean }) => entry.you)).toBe(false);
  });

  test("o duelo livre pelo hub de práticas funciona e entra no placar", async ({ page }) => {
    test.setTimeout(360_000);
    const session = await createLearner({ prefix: "duel-free", target: "en", level: "A2", interests: ["Viagens"] });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/practice");
    await expect(tid(page, "practice-hub")).toBeVisible();
    await expect(tid(page, "practice-card-duel")).toBeVisible();
    await assertLayout(page, "Práticas");

    const round = page.waitForResponse((response) => response.url().includes("/api/v1/duel/round") && response.request().method() === "POST", { timeout: AI_WAIT });
    await press(page, "practice-open-duel");
    await expect(page).toHaveURL(/\/duel$/);
    const body: Round = await (await round).json();
    expect(body.unit_id).toBeNull();
    expect(body.drills.length).toBeGreaterThanOrEqual(8);
    await expect(page.getByText(t.dekFree)).toBeVisible({ timeout: AI_WAIT });
    await expect(tid(page, "duel-ready")).toBeVisible({ timeout: AI_WAIT });

    await press(page, "duel-start");
    const tally = await playRound(page, body.drills, [0, 5]);
    await expect(tid(page, "duel-save")).toHaveText(t.saved);
    await expect(tid(page, "duel-new-best")).toHaveText(t.newBest);
    // Placar da tela = placar do servidor, com a linha "você".
    await expect(page.getByText(t.boardYou).first()).toBeVisible();
    expect(runs(session, null)).toEqual([tally.score]);
    const board = await api(session.token, "GET", "/api/v1/duel/leaderboard");
    const mine = board.json.entries.find((entry: { you: boolean }) => entry.you);
    expect(mine?.score).toBe(tally.score);
    expect(await bodyText(page)).toContain(String(tally.score));
  });

  test("depois de jogar, o cartão do Duelo no hub de práticas mostra o melhor real", async ({ page }) => {
    test.setTimeout(360_000);
    const session = await createLearner({ prefix: "duel-hub", target: "en", level: "A2" });
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/practice");
    await expect(tid(page, "practice-hub")).toBeVisible();
    // Sem rodada salva, o hub não inventa número.
    await expect(tid(page, "practice-card-duel")).toBeVisible();
    await expect(page.getByTestId("practice-stat-duel").filter({ visible: true })).toHaveCount(0);
    const round = page.waitForResponse((response) => response.url().includes("/api/v1/duel/round") && response.request().method() === "POST", { timeout: AI_WAIT });
    await press(page, "practice-open-duel");
    const body: Round = await (await round).json();
    await expect(tid(page, "duel-ready")).toBeVisible({ timeout: AI_WAIT });
    await press(page, "duel-start");
    const tally = await playRound(page, body.drills, []);
    await expect(tid(page, "duel-save")).toHaveText(t.saved);
    await press(page, "duel-back");
    await expect(tid(page, "practice-hub")).toBeVisible();
    await expect(tid(page, "practice-stat-duel")).toContainText(String(tally.score), { timeout: 30_000 });
  });

  test("o Duelo cabe no celular @mobile", async ({ page }) => {
    test.setTimeout(300_000);
    const session = await createLearner({ prefix: "duel-mobile", target: "en", level: "A1" });
    await seedSession(page, session, { locale: "pt" });
    const body = await openDuel(page, "/duel");
    await assertLayout(page, "Duelo 390 · pronto");
    await press(page, "duel-start");
    await expect(tid(page, "duel-round")).toBeVisible();
    await assertLayout(page, "Duelo 390 · rodada");
    await press(page, `duel-option-${body.drills[0]!.answer}`);
    await assertLayout(page, "Duelo 390 · resposta");
  });
});
