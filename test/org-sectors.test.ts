import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeDue, sectorPhrases, sectorTerms, workplaceInterest } from "../src/services/org-sectors.ts";

describe("company sector lexicon", () => {
  it("keeps company words ahead of the deck", () => {
    assert.deepEqual(mergeDue(["quota"], ["pipeline", "lead"], ["hello", "quota"]), [
      "quota",
      "pipeline",
      "lead",
      "hello",
    ]);
  });

  it("caps the due list at six", () => {
    assert.equal(mergeDue(["a", "b", "c"], ["d", "e", "f", "g"]).length, 6);
  });

  it("lists technology English workplace words", () => {
    const phrases = sectorPhrases("technology", "en");
    assert.ok(phrases.includes("deploy"));
    assert.ok(sectorTerms("technology", "en").every((item) => item.phrase.length > 1));
  });

  it("marks the workplace interest for the lesson", () => {
    assert.equal(workplaceInterest("health"), "health workplace");
  });
});
