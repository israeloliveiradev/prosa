import { expect, test } from "@playwright/test";
import { kv } from "@/lib/kv";
import { awardXp, bindXpLang, getXpState, hydrateXp, resetXp, setXpGoal, xpView } from "@/lib/xp";
import {
  XP_DAILY_LIMITS,
  applyAward,
  createEmptyXpState,
  localIsoDate,
  pruneAwarded,
  shiftIsoDate,
  weekDots,
  xpLog,
} from "@/lib/xp-rules";

const DAY = "2026-11-19";

test.describe("XP: regras puras", () => {
  test("a mesma chave paga uma única vez, mesmo em outro dia", () => {
    let state = createEmptyXpState();
    const first = applyAward(state, "phase", "lesson-1:review", DAY);
    expect(first.gained).toBe(10);
    state = first.state;
    expect(applyAward(state, "phase", "lesson-1:review", DAY).gained).toBe(0);
    expect(applyAward(state, "phase", "lesson-1:review", shiftIsoDate(DAY, 1)).gained).toBe(0);
    expect(applyAward(state, "card", "lesson-1:review", DAY).gained).toBe(1);
  });

  test("teto diário por tipo de ação, renovado no dia seguinte", () => {
    let state = createEmptyXpState();
    const cap = XP_DAILY_LIMITS.card!;
    for (let index = 0; index < cap; index += 1) {
      const result = applyAward(state, "card", `${DAY}:word-${index}`, DAY);
      expect(result.gained).toBe(1);
      state = result.state;
    }
    expect(applyAward(state, "card", `${DAY}:word-extra`, DAY).gained).toBe(0);
    expect(state.log[DAY]).toBe(cap);
    const tomorrow = shiftIsoDate(DAY, 1);
    expect(applyAward(state, "card", `${tomorrow}:word-extra`, tomorrow).gained).toBe(1);

    let recon = createEmptyXpState();
    recon = applyAward(recon, "reconstruction", "a", DAY).state;
    expect(applyAward(recon, "reconstruction", "b", DAY).gained).toBe(0);
  });

  test("chave vazia ou data inválida não pagam", () => {
    const state = createEmptyXpState();
    expect(applyAward(state, "phase", "   ", DAY).gained).toBe(0);
    expect(applyAward(state, "phase", "x", "19/11/2026").gained).toBe(0);
  });

  test("a janela de idempotência poda chaves antigas mas mantém o XP no histórico", () => {
    let state = createEmptyXpState();
    state = applyAward(state, "phase", "old", "2026-09-01").state;
    const pruned = pruneAwarded(state, DAY);
    expect(pruned.awarded["2026-09-01"]).toBeUndefined();
    expect(pruned.log["2026-09-01"]).toBe(10);
  });

  test("log dos últimos 7 dias e semana de segunda a domingo", () => {
    let state = createEmptyXpState();
    state = applyAward(state, "phase", "a", "2026-11-17").state;
    state = applyAward(state, "speech", "b", DAY).state;
    expect(xpLog(state, DAY).map((day) => day.xp)).toEqual([0, 0, 0, 0, 10, 0, 5]);
    expect(xpLog(state, DAY)[6]!.date).toBe(DAY);
    // 2026-11-19 é quinta-feira: a semana vai de 16 (seg) a 22 (dom).
    expect(weekDots(["2026-11-17", DAY], DAY)).toEqual([false, true, false, true, false, false, false]);
  });

  test("data local (não UTC)", () => {
    expect(localIsoDate(new Date(2026, 10, 19, 23, 30))).toBe("2026-11-19");
    expect(localIsoDate(new Date(2026, 10, 20, 0, 5))).toBe("2026-11-20");
  });
});

test.describe("XP: store por curso", () => {
  test.beforeEach(() => {
    resetXp();
    bindXpLang("en");
  });

  test.afterEach(() => {
    resetXp();
  });

  test("awardXp é idempotente e cada curso tem o seu XP", () => {
    expect(awardXp("phase", `${DAY}:review`, DAY)).toBe(10);
    expect(awardXp("phase", `${DAY}:review`, DAY)).toBe(0);
    expect(getXpState().log[DAY]).toBe(10);

    bindXpLang("fr");
    expect(getXpState().log[DAY]).toBeUndefined();
    expect(awardXp("phase", `${DAY}:review`, DAY)).toBe(10);

    bindXpLang("en");
    expect(xpView(getXpState(), DAY).today).toBe(10);
    expect(xpView(getXpState(), DAY).total).toBe(10);
  });

  test("meta diária: falta, batida, e sobrevive ao F5", () => {
    setXpGoal(20);
    awardXp("phase", "a", DAY);
    let view = xpView(getXpState(), DAY);
    expect(view.goal).toBe(20);
    expect(view.goalMet).toBe(false);
    expect(view.remaining).toBe(10);
    awardXp("phase", "b", DAY);
    view = xpView(getXpState(), DAY);
    expect(view.goalMet).toBe(true);
    expect(view.remaining).toBe(0);
    expect(view.log).toHaveLength(7);

    hydrateXp();
    expect(getXpState().goal).toBe(20);
    expect(getXpState().log[DAY]).toBe(20);
    setXpGoal(50);
  });

  test("formato antigo (um registro global) é adotado pelo primeiro curso", () => {
    kv.set("prosa.xp.v1", JSON.stringify({ log: { [DAY]: 30 }, awarded: { [DAY]: ["phase:x", "phase:y", "phase:z"] }, goal: 100 }));
    hydrateXp();
    bindXpLang("it");
    expect(getXpState().log[DAY]).toBe(30);
    expect(getXpState().goal).toBe(100);
    expect(awardXp("phase", "x", DAY)).toBe(0);
    setXpGoal(50);
  });
});
