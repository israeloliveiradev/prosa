import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastForDay, contrastsFor, hvptTrials, trialWord } from "../src/services/pronunciation-contrasts.ts";

describe("pronunciation contrasts", () => {
  it("gives Portuguese learners the English th and the long vowel", () => {
    const list = contrastsFor("pt", "en");
    assert.equal(list.some((item) => item.id === "en-th"), true);
    assert.equal(list.some((item) => item.id === "en-vowel"), true);
  });

  it("changes the contrast on the next day", () => {
    const today = contrastForDay("pt", "en", "2026-09-29");
    const tomorrow = contrastForDay("pt", "en", "2026-09-30");
    assert.ok(today);
    assert.ok(tomorrow);
    assert.notEqual(today?.id, tomorrow?.id);
  });

  it("plans three trials across three voices", () => {
    const contrast = contrastForDay("pt", "fr", "2026-09-29");
    assert.ok(contrast);
    const trials = hvptTrials(contrast, 4, "2026-09-29");
    assert.equal(trials.length, 3);
    assert.deepEqual(
      trials.map((trial) => trial.voice),
      [0, 1, 2],
    );
    assert.deepEqual(
      hvptTrials(contrast, 2, "2026-09-29").map((trial) => trial.voice),
      [0, 1, 0],
    );
    assert.ok(trialWord(contrast, trials[0]!).length > 0);
  });

  it("has nothing for a language outside the map", () => {
    assert.deepEqual(contrastsFor("pt", "ko"), []);
  });
});
