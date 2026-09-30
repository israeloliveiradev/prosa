import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDictation, dictationMatches } from "../mobile/src/lib/dictation.ts";

describe("partial dictation", () => {
  const story = "Please take a seat. The coffee was cold, so she asked for hot coffee again.";
  const vocabulary = [
    { word: "take a seat" },
    { word: "coffee" },
    { word: "hot coffee" },
  ];

  it("blanks today's chunks and leaves the rest visible", () => {
    const { pieces, gaps } = buildDictation(story, vocabulary);
    assert.equal(gaps.length, 3);
    assert.equal(gaps[0]?.expected, "take a seat");
    assert.equal(gaps.some((gap) => gap.expected === "coffee"), true);
    assert.equal(pieces.some((piece) => piece.kind === "word" && piece.text === "Please"), true);
    assert.equal(pieces.some((piece) => piece.kind === "gap" && piece.text === "take a seat"), true);
  });

  it("stops at twelve gaps", () => {
    const words = Array.from({ length: 20 }, (_, index) => `word${index}`);
    const { gaps } = buildDictation(words.join(" "), words.map((word) => ({ word })));
    assert.equal(gaps.length, 12);
  });

  it("accepts the same words with different case and punctuation", () => {
    assert.equal(dictationMatches("Take a seat!", "take a seat"), true);
    assert.equal(dictationMatches("sit down", "take a seat"), false);
  });
});
