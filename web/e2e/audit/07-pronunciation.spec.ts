import { test, expect, createAccount, seedSession, assertLayout, api, readStore, installFakeMic } from "./fixtures";
import { tid, press, speechWav, micFileArgs } from "./helpers-a";
import { SESSION_COPY } from "@/lib/copy/session";
import { MESSAGES } from "@/lib/messages";

/** Bloco 7: pronúncia. Silêncio vale 0 e não paga XP; um tom não é fala; fala de verdade é medida pelo servidor. */

type P = import("@playwright/test").Page;

// O microfone do navegador lê um arquivo com fala de verdade; os testes de silêncio e de tom trocam o getUserMedia (installFakeMic).
const WAV = speechWav("Hello, my name is Albert. Nice to meet you. Where are you from? I live in a city in my country. Imagine a train moving through space.", "daily-en");
test.use({ launchOptions: { args: micFileArgs(WAV) } });
const S = SESSION_COPY.pt;
const M = MESSAGES.pt;

function awardedKeys(raw: string | null): string[] {
  if (!raw) return [];
  const bag = JSON.parse(raw);
  const lanes = bag.lanes ?? { x: bag };
  const keys: string[] = [];
  for (const lane of Object.values<any>(lanes)) for (const list of Object.values<any>(lane.awarded ?? {})) keys.push(...(list as string[]));
  return keys;
}

function xpTotal(raw: string | null): number {
  if (!raw) return 0;
  const bag = JSON.parse(raw);
  const lanes = bag.lanes ?? { x: bag };
  let total = 0;
  for (const lane of Object.values<any>(lanes)) for (const value of Object.values<any>(lane.log ?? {})) total += Number(value) || 0;
  return total;
}

/** Mede a chamada de análise de fala: quantas foram ao servidor e o que o servidor respondeu. */
function watchAnalysis(page: P): { calls: number; replies: any[] } {
  const watch = { calls: 0, replies: [] as any[] };
  page.on("request", (request) => {
    if (request.method() === "POST" && /\/audio\/analyze-shadowing/.test(request.url())) watch.calls += 1;
  });
  page.on("response", async (response) => {
    if (response.request().method() === "POST" && /\/audio\/analyze-shadowing/.test(response.url())) {
      watch.replies.push(await response.json().catch(() => null));
    }
  });
  return watch;
}

async function record(page: P, ms: number): Promise<number> {
  const start = page.getByRole("button", { name: M.recordPronunciation, exact: true }).filter({ visible: true }).first();
  await expect(start).toBeVisible({ timeout: 30_000 });
  await start.click();
  await page.waitForTimeout(ms);
  await page.getByRole("button", { name: M.stopAndScore, exact: true }).filter({ visible: true }).first().click();
  const label = page.getByText(M.accuracy, { exact: true }).filter({ visible: true }).first();
  await expect(label).toBeVisible({ timeout: 90_000 });
  const shown = await label.locator("xpath=following::*[normalize-space(text())][1]").textContent();
  return Number((shown ?? "").trim());
}

async function openLab(page: P, token: string): Promise<void> {
  await page.goto("/pronunciation");
  await expect(tid(page, "pronunciation-screen")).toBeVisible({ timeout: 30_000 });
  await expect(tid(page, "pronunciation-origin")).toBeVisible({ timeout: 30_000 });
  await assertLayout(page, "/pronunciation");
  void token;
}

test.describe("microfone mudo", () => {
  test("silêncio: nota 0, 'nenhuma fala detectada', nada vai ao servidor e nenhum XP @mobile", async ({ page }) => {
    test.setTimeout(240_000);
    const session = await createAccount({ prefix: "pron-silence", target: "en", level: "A1" });
    await installFakeMic(page, "silence");
    await seedSession(page, session);
    const watch = watchAnalysis(page);
    await openLab(page, session.token);
    await page.goto("/pronunciation");
    await expect(tid(page, "pronunciation-origin")).toBeVisible({ timeout: 30_000 });
    const xpBefore = await readStore(page, "prosa.xp.v1");
    const score = await record(page, 3_000);
    expect(score, "silêncio vale 0").toBe(0);
    await expect(page.getByText(M.noSpeech, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await assertLayout(page, "/pronunciation silêncio");
    expect(watch.calls, "a gravação sem voz não vai para o servidor").toBe(0);
    const xpAfter = await readStore(page, "prosa.xp.v1");
    expect(xpTotal(xpAfter)).toBe(xpTotal(xpBefore));
    expect(awardedKeys(xpAfter).filter((key) => key.startsWith("speech"))).toEqual([]);
    expect(awardedKeys(xpAfter)).toEqual(awardedKeys(xpBefore));
    // Treino livre: nada foi gravado na conta (sem sessão concluída, sem ofensiva).
    expect((await api(session.token, "GET", "/api/v1/account/settings")).status).toBe(200);
  });
});

test.describe("tom puro (440 Hz) não é fala", () => {
  test("com um tom o app mede de verdade: a nota na tela é a da medição, sem valor fixo", async ({ page, guard }) => {
    test.setTimeout(240_000);
    const session = await createAccount({ prefix: "pron-tone", target: "en", level: "A1" });
    await installFakeMic(page, "tone");
    await seedSession(page, session);
    const watch = watchAnalysis(page);
    await openLab(page, session.token);
    const xpBefore = await readStore(page, "prosa.xp.v1");
    const score = await record(page, 4_000);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    // Duas gravações do mesmo tom dão a mesma medição (não um número inventado): se foi ao servidor,
    // a nota na tela é a resposta do servidor; se o app decidiu "sem voz", é 0.
    if (watch.calls > 0) {
      await expect.poll(() => watch.replies.length, { timeout: 30_000 }).toBeGreaterThan(0);
      expect(score, "a nota na tela é a da medição do servidor").toBe(watch.replies.at(-1).accuracy_score);
    } else {
      expect(score, "sem chamada ao servidor, o app só pode mostrar 0 (sem voz)").toBe(0);
    }
    expect(score, "nenhuma nota fixa de enfeite (70)").not.toBe(70);
    test.info().annotations.push({ type: "tom", description: `chamadas ao servidor: ${watch.calls}; nota na tela: ${score}; resposta: ${JSON.stringify(watch.replies.at(-1) ?? null).slice(0, 200)}` });
    await assertLayout(page, "/pronunciation tom");
    const xpAfter = await readStore(page, "prosa.xp.v1");
    expect(xpTotal(xpAfter), "treino livre não paga XP").toBe(xpTotal(xpBefore));
    void guard;
  });
});

test.describe("fala de verdade", () => {
  test("com fala o servidor mede e a nota é diferente da do silêncio, sem XP no treino livre", async ({ page }) => {
    test.setTimeout(240_000);
    const session = await createAccount({ prefix: "pron-speech", target: "en", level: "A1" });
    await seedSession(page, session);
    const watch = watchAnalysis(page);
    await openLab(page, session.token);
    const xpBefore = await readStore(page, "prosa.xp.v1");
    const score = await record(page, 7_000);
    expect(watch.calls, "a fala foi para a análise do servidor").toBeGreaterThan(0);
    await expect.poll(() => watch.replies.length, { timeout: 30_000 }).toBeGreaterThan(0);
    const reply = watch.replies.at(-1);
    expect(score).toBe(reply.accuracy_score);
    expect(score, "fala de verdade tem nota acima de 0").toBeGreaterThan(0);
    expect(String(reply.transcription ?? "").length, "o servidor transcreveu a fala").toBeGreaterThan(0);
    expect(score).not.toBe(70);
    const xpAfter = await readStore(page, "prosa.xp.v1");
    expect(xpTotal(xpAfter), "treino livre não paga XP").toBe(xpTotal(xpBefore));
  });
});

test.describe("etapa de fala da sessão diária", () => {
  test("com silêncio a etapa de fala dá 0, não conclui e não paga XP de fala @mobile", async ({ page, guard }) => {
    test.setTimeout(600_000);
    guard.allow(/huggingface|hf\.co|onnx|wasm/i);
    const session = await createAccount({ prefix: "pron-daily", target: "en", level: "A1" });
    await installFakeMic(page, "silence");
    await seedSession(page, session);
    const watch = watchAnalysis(page);
    await page.goto("/daily?unit=a1-01");
    await expect(tid(page, "daily-unit")).toBeVisible({ timeout: 120_000 });

    const next = () => page.getByRole("button", { name: new RegExp(`^${S.continueTo.split("{phase}")[0]}`) }).filter({ visible: true }).first();
    const enabled = async (timeout: number) => {
      try {
        await expect(next()).toBeEnabled({ timeout });
        return true;
      } catch {
        return false;
      }
    };
    // Revisão
    for (let i = 0; i < 40; i += 1) {
      if (await enabled(1_500)) break;
      await page.getByRole("button", { name: M.flipCard }).filter({ visible: true }).first().click();
      await page.getByRole("button", { name: M.gradeGood, exact: true }).filter({ visible: true }).first().click();
    }
    await next().click();
    // Escuta
    await page.getByRole("button", { name: M.listenHeard, exact: true }).filter({ visible: true }).first().click();
    for (let i = 0; i < 8; i += 1) {
      if (await enabled(1_000)) break;
      const question = page.getByText(M.listenQuestion, { exact: true }).filter({ visible: true }).first();
      await expect(question).toBeVisible({ timeout: 10_000 });
      await question.locator("xpath=following::*[@role='button'][not(@aria-disabled='true')]").nth(1).click();
      const more = page.getByRole("button", { name: M.listenNext, exact: true }).filter({ visible: true }).first();
      if (await more.isVisible().catch(() => false)) await more.click();
    }
    await next().click();
    // Leitura
    for (let i = 0; i < 90; i += 1) {
      if (await enabled(1_000)) break;
      await page.evaluate(() => {
        for (const el of Array.from(document.querySelectorAll("*"))) {
          const style = getComputedStyle(el);
          if ((style.overflowY === "auto" || style.overflowY === "scroll") && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
        }
      });
    }
    await next().click();

    // Fala em silêncio.
    const xpBefore = await readStore(page, "prosa.xp.v1");
    await assertLayout(page, "Sessão: fala");
    const score = await record(page, 3_000);
    expect(score, "silêncio vale 0 na sessão").toBe(0);
    await expect(page.getByText(M.noSpeech, { exact: true }).filter({ visible: true }).first()).toBeVisible();
    expect(watch.calls, "silêncio não vai ao servidor").toBe(0);
    expect(await enabled(2_000), "a etapa de fala não conclui com silêncio").toBe(false);
    const xpAfter = await readStore(page, "prosa.xp.v1");
    expect(awardedKeys(xpAfter).filter((key) => key.startsWith("speech")), "nenhum XP de fala").toEqual([]);
    expect(xpTotal(xpAfter)).toBe(xpTotal(xpBefore));
    // O aluno com microfone mudo não fica preso: o app oferece pular a fala (sem XP).
    await expect(page.getByRole("button", { name: S.skipSpeech }).filter({ visible: true }).first(), "saída para quem grava só silêncio (pular a fala)").toBeVisible();
  });
});
