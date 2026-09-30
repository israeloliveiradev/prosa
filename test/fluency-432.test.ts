import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fluencyDay, fluencyLaps, fluencyScore, recurringSlips } from "../src/services/fluency-432.ts";

describe("fluency 4/3/2", () => {
  it("lands every third day", () => {
    assert.equal(fluencyDay("2026-09-30"), true);
    assert.equal(fluencyDay("2026-09-29"), false);
    assert.equal(fluencyDay("2026-10-03"), true);
    assert.equal(fluencyDay("2026-09-03"), true);
  });

  it("keeps three shrinking laps", () => {
    assert.deepEqual(
      fluencyLaps().map((lap) => lap.seconds),
      [240, 180, 120],
    );
  });

  it("counts words per minute and pauses", () => {
    const score = fluencyScore("Hello there. Next one.", 60_000);
    assert.equal(score.words, 4);
    assert.equal(score.wpm, 4);
    assert.ok(score.pauses >= 1);
  });

  it("keeps a slip that showed twice across the laps", () => {
    assert.deepEqual(
      recurringSlips(
        [{ original: "I go to shop" }, { original: "She is come" }],
        "I go to shop. Next. I go to shop. She is come.",
      ),
      ["I go to shop"],
    );
  });
});
