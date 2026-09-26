import assert from "node:assert/strict";
import test from "node:test";
import { duelScoreBodySchema } from "../src/schemas/duel.ts";
import { duelPoints, shuffleDrill } from "../src/services/duel-score.ts";

test("duel scoring", async (t) => {
  await t.test("keeps the correct option after the choices move", () => {
    const source = { prompt: "I ____ coffee.", options: ["drink", "under", "very", "blue"], answer: 0 };
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const shuffled = shuffleDrill(source);
      assert.equal(shuffled.options[shuffled.answer], "drink");
    }
  });

  await t.test("scores a streak as ten points times the combo", () => {
    assert.equal(duelPoints(1), 10);
    assert.equal(duelPoints(4), 40);
    assert.equal(duelScoreBodySchema.safeParse({ score: 60, best_combo: 3, correct_count: 3 }).success, true);
    assert.equal(duelScoreBodySchema.safeParse({ score: 9999, best_combo: 3, correct_count: 3 }).success, false);
  });
});
