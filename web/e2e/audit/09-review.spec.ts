import { copy as uiCopy } from "@/lib/i18n";
import { MEMORY } from "@/lib/copy/memory";
import { test, expect, seedSession, assertLayout, api, sql } from "./fixtures";
import { AI_WAIT, bodyText, cardState, createLearner, press, seedCards, tid, xpTotal } from "./helpers-b";

const t = MEMORY.pt;
const ui = uiCopy("pt");

/** Revela o cartão (Espaço) e dá a nota (teclas 1 a 4), como o aluno com teclado. */
async function gradeWithKeyboard(page: import("@playwright/test").Page, key: "1" | "2" | "3" | "4") {
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press(" ");
  await page.keyboard.press(key);
}

test.describe("Bloco 9 · Revisão e Palácio", () => {
  test("um aparelho novo mostra os cartões do servidor e os filtros separam vencidos, aprendendo e dominados", async ({ page }) => {
    const session = await createLearner({ prefix: "review-fresh", target: "en", level: "A2" });
    seedCards(session.user.id, "en", [
      { front: "harbor", back: "porto", context: "The harbor is quiet at dawn.", dueInDays: -3 },
      { front: "lantern", back: "lanterna", context: "She lit the lantern at night.", dueInDays: -2 },
      { front: "meadow", back: "campina", context: "Sheep rest in the meadow.", dueInDays: -1 },
      { front: "compass", back: "bússola", context: "The compass points north.", dueInDays: 3 },
      { front: "anchor", back: "âncora", context: "They dropped the anchor.", dueInDays: 5 },
      { front: "bridge", back: "ponte", context: "We crossed the bridge.", status: "mastered", dueInDays: 40, reps: 8, intervalDays: 40, stability: 40 },
    ]);
    const server = await api(session.token, "GET", "/api/v1/srs/cards");
    expect(server.json.cards.length).toBe(6);

    // Aparelho novo: só a sessão no armazenamento, nenhum baralho local.
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/memory");
    await expect(tid(page, "memory-screen")).toBeVisible();
    await expect(tid(page, "memory-filter-due")).toContainText(`${t.filterDue} · 3`, { timeout: 30_000 });
    await expect(tid(page, "memory-filter-learning")).toContainText(`${t.filterLearning} · 5`);
    await expect(tid(page, "memory-filter-mastered")).toContainText(`${t.filterMastered} · 1`);
    await expect(tid(page, "memory-empty")).toHaveCount(0);
    await assertLayout(page, "Revisão · lista");

    // Vencidos: só os 3 atrasados.
    let text = await bodyText(page);
    for (const word of ["harbor", "lantern", "meadow"]) expect(text).toContain(word);
    for (const word of ["compass", "anchor", "bridge"]) expect(text).not.toContain(word);
    await expect(tid(page, "memory-start")).toContainText("Revisar 3 cartões");

    // Aprendendo: os 5 que não estão dominados.
    await press(page, "memory-filter-learning");
    await expect(tid(page, "memory-start")).toContainText("Revisar 5 cartões");
    text = await bodyText(page);
    for (const word of ["compass", "anchor", "harbor"]) expect(text).toContain(word);
    expect(text).not.toContain("bridge");

    // Dominadas: só a ponte, com 1 cartão.
    await press(page, "memory-filter-mastered");
    await expect(tid(page, "memory-start")).toContainText(t.startOne);
    text = await bodyText(page);
    expect(text).toContain("bridge");
    expect(text).not.toContain("harbor");

    // Recarregar mantém o resultado (o servidor é a fonte).
    await page.reload();
    await expect(tid(page, "memory-filter-due")).toContainText(`${t.filterDue} · 3`, { timeout: 30_000 });
  });

  test("uma rodada de revisão grava a nota no servidor (vencimento e estabilidade)", async ({ page }) => {
    const session = await createLearner({ prefix: "review-round", target: "en", level: "A2" });
    seedCards(session.user.id, "en", [
      { front: "harbor", back: "porto", context: "The harbor is quiet at dawn.", dueInDays: -3 },
      { front: "lantern", back: "lanterna", context: "She lit the lantern at night.", dueInDays: -2 },
      { front: "meadow", back: "campina", context: "Sheep rest in the meadow.", dueInDays: -1 },
    ]);
    const before = cardState(session.user.id, "en", "harbor")!;
    expect(before.reps).toBe(1);

    await seedSession(page, session, { locale: "pt" });
    await page.goto("/memory");
    await expect(tid(page, "memory-start")).toBeVisible({ timeout: 30_000 });

    await press(page, "memory-start");
    await expect(tid(page, "memory-round")).toBeVisible();
    await assertLayout(page, "Revisão · rodada");
    // O primeiro cartão é o mais atrasado (harbor): dar "Fácil" (4).
    await expect(page.getByText("Carta 1 de 3", { exact: false }).first()).toBeVisible();
    await gradeWithKeyboard(page, "4");
    await expect(page.getByText("Carta 2 de 3", { exact: false }).first()).toBeVisible();

    // Efeito real: o servidor reagendou o cartão (FSRS) a partir da revisão enviada.
    await expect
      .poll(() => cardState(session.user.id, "en", "harbor")!.reps, { timeout: 30_000 })
      .toBe(before.reps + 1);
    const after = cardState(session.user.id, "en", "harbor")!;
    expect(after.stability, "a estabilidade sobe com nota Fácil").toBeGreaterThan(before.stability);
    expect(after.dueMs, "o vencimento vai para o futuro").toBeGreaterThan(Date.now() + 24 * 3600 * 1000);
    expect(sql(`SELECT count(*) FROM srs_sync_events WHERE user_id='${session.user.id}' AND card_id='${after.id}'`)[0]).toBe("1");

    // Os outros dois: "Errei" (1) e "Bom" (3).
    await gradeWithKeyboard(page, "1");
    await gradeWithKeyboard(page, "3");
    await expect(page.getByText(t.reviewDone)).toBeVisible();
    await expect.poll(() => cardState(session.user.id, "en", "lantern")!.reps, { timeout: 30_000 }).toBe(2);
    await expect.poll(() => cardState(session.user.id, "en", "meadow")!.reps, { timeout: 30_000 }).toBe(2);
    const lantern = cardState(session.user.id, "en", "lantern")!;
    const meadow = cardState(session.user.id, "en", "meadow")!;
    expect(lantern.dueMs, "errei volta logo").toBeLessThan(after.dueMs);
    expect(meadow.dueMs).toBeGreaterThan(lantern.dueMs);
    expect(sql(`SELECT count(*) FROM srs_sync_events WHERE user_id='${session.user.id}'`)[0]).toBe("3");

  });

  test("a rodada de revisão paga 1 XP por cartão, uma única vez por dia", async ({ page }) => {
    const session = await createLearner({ prefix: "review-xp", target: "en", level: "A2" });
    seedCards(session.user.id, "en", [
      { front: "harbor", back: "porto", context: "The harbor is quiet at dawn.", dueInDays: -3 },
      { front: "lantern", back: "lanterna", context: "She lit the lantern at night.", dueInDays: -2 },
      { front: "meadow", back: "campina", context: "Sheep rest in the meadow.", dueInDays: -1 },
    ]);
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/memory");
    await expect(tid(page, "memory-start")).toBeVisible({ timeout: 30_000 });
    const xpBefore = await xpTotal(page);
    await press(page, "memory-start");
    await expect(tid(page, "memory-round")).toBeVisible();
    await gradeWithKeyboard(page, "4");
    await gradeWithKeyboard(page, "3");
    await gradeWithKeyboard(page, "3");
    await expect(page.getByText(t.reviewDone)).toBeVisible();
    await expect.poll(() => sql(`SELECT count(*) FROM srs_sync_events WHERE user_id='${session.user.id}'`)[0], { timeout: 30_000 }).toBe("3");

    // XP: 1 por cartão (3 cartões = +3), cada cartão uma única vez no dia.
    const xpAfterRound = await xpTotal(page);
    expect(xpAfterRound - xpBefore, "XP da rodada de 3 cartões").toBe(3);

    // Rever os mesmos cartões no mesmo dia não paga de novo.
    await press(page, "memory-round-back");
    await press(page, "memory-filter-learning");
    await press(page, "memory-start");
    await expect(tid(page, "memory-round")).toBeVisible();
    await gradeWithKeyboard(page, "3");
    await expect.poll(() => sql(`SELECT count(*) FROM srs_sync_events WHERE user_id='${session.user.id}'`)[0], { timeout: 30_000 }).toBe("4");
    expect(await xpTotal(page), "o mesmo cartão no mesmo dia não paga XP outra vez").toBe(xpAfterRound);
  });

  test("o palácio constrói a âncora de um cartão elegível e explica quando o cartão ainda não é elegível", async ({ page }) => {
    const session = await createLearner({ prefix: "review-palace", target: "en", level: "A2" });
    const [eligibleId] = seedCards(session.user.id, "en", [
      { front: "stubborn", back: "teimoso", context: "My brother is stubborn about breakfast.", dueInDays: -6, reps: 5, status: "reviewing", stability: 1 },
      { front: "gentle", back: "gentil", context: "She has a gentle voice.", dueInDays: -5, reps: 5, status: "reviewing", stability: 1 },
    ]);
    // Histórico de falhas gravado no servidor (a elegibilidade nasce dele): 4 revisões, 3 erradas.
    const stamp = Date.now().toString(36);
    for (const [index, quality] of [0, 0, 3, 0].entries()) {
      sql(`INSERT INTO srs_sync_events (client_id, user_id, card_id, quality) VALUES ('seed_${stamp}_${index}', '${session.user.id}', '${eligibleId}', ${quality})`);
    }

    await seedSession(page, session, { locale: "pt" });
    await page.goto("/memory-palace");
    await expect(tid(page, "memory-start")).toBeVisible({ timeout: 30_000 });
    await press(page, "memory-start");
    await expect(tid(page, "memory-round")).toBeVisible();
    await assertLayout(page, "Palácio");

    // Cartão 1 (stubborn): elegível, a IA monta a âncora e ela fica guardada.
    await expect(page.getByText("Carta 1 de 2", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: ui.palace, exact: true }).filter({ visible: true }).first().click();
    const sheet = tid(page, "session-glass-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText(ui.palaceNotReady)).toHaveCount(0, { timeout: AI_WAIT });
    await expect.poll(() => sql(`SELECT association_text FROM srs_mnemonics WHERE card_id='${eligibleId}'`).length, { timeout: AI_WAIT }).toBe(1);
    const stored = sql(`SELECT association_text FROM srs_mnemonics WHERE card_id='${eligibleId}'`)[0]!;
    expect(stored.length).toBeGreaterThan(12);
    await expect(sheet.getByText(stored.slice(0, 30), { exact: false })).toBeVisible();
    await press(page, "session-glass-sheet-close");
    await expect(page.getByTestId("session-glass-sheet").filter({ visible: true })).toHaveCount(0);

    // Cartão 2 (gentle): o servidor diz que ainda acerta o bastante e a tela explica o motivo.
    await gradeWithKeyboard(page, "3");
    await expect(page.getByText("Carta 2 de 2", { exact: false }).first()).toBeVisible();
    await page.getByRole("button", { name: ui.palace, exact: true }).filter({ visible: true }).first().click();
    await expect(tid(page, "session-glass-sheet").getByText(ui.palaceNotReady)).toBeVisible();
    const second = sql(`SELECT count(*) FROM srs_mnemonics m JOIN srs_cards c ON c.id=m.card_id WHERE c.user_id='${session.user.id}' AND c.front_phrase='gentle'`)[0];
    expect(second).toBe("0");
  });

  test("Revisão e Palácio cabem no celular @mobile", async ({ page }) => {
    const session = await createLearner({ prefix: "review-mobile", target: "en", level: "A2" });
    seedCards(session.user.id, "en", [
      { front: "harbor", back: "porto", context: "The harbor is quiet at dawn.", dueInDays: -3 },
      { front: "bridge", back: "ponte", context: "We crossed the bridge.", status: "mastered", dueInDays: 40, reps: 8, intervalDays: 40, stability: 40 },
    ]);
    await seedSession(page, session, { locale: "pt" });
    await page.goto("/memory");
    await expect(tid(page, "memory-start")).toBeVisible({ timeout: 30_000 });
    await assertLayout(page, "Revisão 390");
    await press(page, "memory-start");
    await expect(tid(page, "memory-round")).toBeVisible();
    await assertLayout(page, "Rodada 390");
  });
});
