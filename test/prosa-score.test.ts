import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bandFromScore,
  certificateHeld,
  combineScore,
  rushedFlags,
  scorePrompts,
  thetaToScore,
} from "../src/services/prosa-score.ts";

describe("prosa score", () => {
  it("maps theta onto 0-100 and a CEFR band", () => {
    assert.equal(thetaToScore(-3.2), 0);
    assert.equal(thetaToScore(3.2), 100);
    assert.equal(bandFromScore(39), "A2");
    assert.equal(bandFromScore(75), "C1");
  });

  it("weights multiple-choice more than writing and speaking", () => {
    assert.equal(combineScore(100, 0, 0), 60);
    assert.equal(combineScore(50, 50, 50), 50);
  });

  it("holds the public certificate when half the items are rushed", () => {
    const flags = rushedFlags({ a: 800, b: 900, c: 700, d: 20_000 });
    assert.deepEqual(flags, ["rushed"]);
    assert.equal(certificateHeld(flags), true);
    assert.deepEqual(rushedFlags({ a: 12_000, b: 9_000, c: 8_000 }), []);
  });

  it("gives original prompts per language", () => {
    assert.match(scorePrompts("en").writing, /change/);
    assert.match(scorePrompts("ja").speaking, /問題/);
  });
});
