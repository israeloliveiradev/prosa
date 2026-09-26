import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { levenshtein, pronunciationReport } from "../src/services/levenshtein.ts";

describe("levenshtein", () => {
  it("counts the classic kitten/sitting distance", () => {
    assert.equal(levenshtein("kitten", "sitting"), 3);
  });

  it("returns zero for identical strings", () => {
    assert.equal(levenshtein("prosa", "prosa"), 0);
  });
});

describe("pronunciationReport", () => {
  it("scores an exact reading as perfect", () => {
    const report = pronunciationReport("Hello, world!", "hello world");
    assert.equal(report.accuracyScore, 100);
    assert.deepEqual(report.mispronouncedWords, []);
  });

  it("lists the reference word that was replaced", () => {
    const report = pronunciationReport("the cat sat", "the dog sat");
    assert.ok(report.accuracyScore < 100);
    assert.ok(report.accuracyScore > 0);
    assert.deepEqual(report.mispronouncedWords, ["cat"]);
  });

  it("ignores an extra spoken word when the reference words match", () => {
    const report = pronunciationReport("the cat sat", "the big cat sat");
    assert.deepEqual(report.mispronouncedWords, []);
  });

  it("lists a skipped reference word", () => {
    const report = pronunciationReport("the cat sat", "the sat");
    assert.deepEqual(report.mispronouncedWords, ["cat"]);
  });
});
