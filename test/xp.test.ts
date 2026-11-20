import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAward,
  createEmptyXpState,
  sanitizeGoal,
  todayXp,
  totalXp,
  weekDots,
  type XpState,
} from "../mobile/src/lib/xp-rules.ts";

describe("xp rules and calculations", () => {
  it("awards 10 XP for a completed phase and 0 if repeated on the same day", () => {
    let state = createEmptyXpState();
    const date = "2026-10-08";

    const res1 = applyAward(state, "phase", "review", date);
    assert.equal(res1.gained, 10);
    assert.equal(todayXp(res1.state, date), 10);
    state = res1.state;

    const res2 = applyAward(state, "phase", "review", date);
    assert.equal(res2.gained, 0);
    assert.equal(todayXp(res2.state, date), 10);

    const res3 = applyAward(state, "phase", "listen", date);
    assert.equal(res3.gained, 10);
    assert.equal(todayXp(res3.state, date), 20);
  });

  it("caps card review XP at 20 per day", () => {
    let state = createEmptyXpState();
    const date = "2026-10-08";

    for (let i = 0; i < 20; i++) {
      const res = applyAward(state, "card", `card-${i}`, date);
      assert.equal(res.gained, 1);
      state = res.state;
    }
    assert.equal(todayXp(state, date), 20);

    // 21ª carta única deve dar 0
    const over = applyAward(state, "card", "card-20", date);
    assert.equal(over.gained, 0);
    assert.equal(todayXp(over.state, date), 20);
  });

  it("caps duel XP at 30 per day", () => {
    let state = createEmptyXpState();
    const date = "2026-10-08";

    for (let i = 0; i < 30; i++) {
      const res = applyAward(state, "duel", `round-${i}`, date);
      assert.equal(res.gained, 1);
      state = res.state;
    }
    assert.equal(todayXp(state, date), 30);

    const over = applyAward(state, "duel", "round-30", date);
    assert.equal(over.gained, 0);
    assert.equal(todayXp(over.state, date), 30);
  });

  it("resets limits when day changes", () => {
    let state = createEmptyXpState();
    const day1 = "2026-10-08";
    const day2 = "2026-10-09";

    const res1 = applyAward(state, "speech", `${day1}:speech`, day1);
    assert.equal(res1.gained, 5);
    state = res1.state;

    // Repetido no mesmo dia
    const res2 = applyAward(state, "speech", `${day1}:speech`, day1);
    assert.equal(res2.gained, 0);

    // A mesma ação (mesma chave) não paga de novo em outro dia
    assert.equal(applyAward(state, "speech", `${day1}:speech`, day2).gained, 0);

    // No dia seguinte, a ação nova daquele dia paga
    const res3 = applyAward(state, "speech", `${day2}:speech`, day2);
    assert.equal(res3.gained, 5);
    state = res3.state;

    assert.equal(todayXp(state, day1), 5);
    assert.equal(todayXp(state, day2), 5);
    assert.equal(totalXp(state), 10);
  });

  it("sanitizes invalid goal to default 50", () => {
    assert.equal(sanitizeGoal(20), 20);
    assert.equal(sanitizeGoal(50), 50);
    assert.equal(sanitizeGoal(100), 100);
    assert.equal(sanitizeGoal(30), 50);
    assert.equal(sanitizeGoal(null), 50);
    assert.equal(sanitizeGoal(undefined), 50);
  });

  it("computes weekDots Monday through Sunday correctly", () => {
    // 2026-10-08 é Quinta-feira.
    // Segunda é 2026-10-05, Domingo é 2026-10-11
    const today = "2026-10-08";
    const dates = ["2026-10-05", "2026-10-08", "2026-10-11"];
    const dots = weekDots(dates, today);

    assert.deepEqual(dots, [
      true, // seg (05)
      false, // ter (06)
      false, // qua (07)
      true, // qui (08)
      false, // sex (09)
      false, // sab (10)
      true, // dom (11)
    ]);
  });
});
