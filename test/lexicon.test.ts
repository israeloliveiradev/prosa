import assert from "node:assert/strict";
import test from "node:test";
import { missingPhrases, storyCoverage } from "../src/services/lexicon.ts";

test("lesson coverage", async (t) => {
  await t.test("counts known words, chunks and function words", () => {
    const story = "I take a seat and the waiter brings water to the table in the cafe. ".repeat(4);
    const covered = storyCoverage(story, ["take a seat", "waiter", "brings", "water", "table", "cafe"], [], "en");
    assert.ok(covered.ratio >= 0.95);
    assert.deepEqual(covered.stray, []);
  });

  await t.test("names the words that sit outside the known set", () => {
    const story = "The committee postponed the extraordinary legislation until the quorum returned. ".repeat(4);
    const covered = storyCoverage(story, ["the"], ["committee"], "en");
    assert.ok(covered.ratio < 0.95);
    assert.ok(covered.stray.includes("postponed"));
  });

  await t.test("notices a due phrase that never appeared", () => {
    assert.deepEqual(missingPhrases("She goes to work.", ["take a seat", "work"]), ["take a seat"]);
  });
});
