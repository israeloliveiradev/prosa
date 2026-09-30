import assert from "node:assert/strict";
import test from "node:test";
import { scheduleFsrs } from "../src/services/fsrs.ts";

const blank = { stability: 0, difficulty: 0, reps: 0, lastReviewAt: null };

test("fsrs scheduling", async (t) => {
  await t.test("a first Good lands a few days out", () => {
    const next = scheduleFsrs(blank, 4, 1_700_000_000_000);
    assert.equal(next.intervalDays, 3);
    assert.equal(next.status, "reviewing");
    assert.ok(next.dueAt > 1_700_000_000_000);
  });

  await t.test("Again on a new card comes back the same day", () => {
    const next = scheduleFsrs(blank, 0);
    assert.equal(next.intervalDays, 0);
    assert.equal(next.status, "learning");
  });

  await t.test("a remembered card lasts longer than its previous stability", () => {
    const now = 1_700_000_000_000;
    const first = scheduleFsrs(blank, 4, now);
    const second = scheduleFsrs(
      { stability: first.stability, difficulty: first.difficulty, reps: first.reps, lastReviewAt: now },
      4,
      now + first.intervalDays * 24 * 60 * 60 * 1000,
    );
    assert.ok(second.stability > first.stability);
    assert.ok(second.intervalDays >= first.intervalDays);
  });
});
