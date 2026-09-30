import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chunksInSentence } from "../mobile/src/lib/chunks.ts";

describe("chunks in a sentence", () => {
  const vocabulary = [
    { word: "take a seat", translation: "sentar" },
    { word: "coffee", translation: "café" },
    { word: "seatbelt", translation: "cinto" },
    { word: "a pesar de", translation: "apesar de" },
  ];

  it("keeps a two- or three-word expression that sits inside the sentence", () => {
    const found = chunksInSentence(vocabulary, "Please take a seat now.");
    assert.deepEqual(found, [{ word: "take a seat", translation: "sentar" }]);
  });

  it("does not treat a longer word as the expression", () => {
    const found = chunksInSentence(vocabulary, "Fasten your seatbelt.");
    assert.deepEqual(found, []);
  });

  it("finds an expression with accents when the words stay together", () => {
    const found = chunksInSentence(vocabulary, "Salimos a pesar de la lluvia.");
    assert.equal(found[0]?.word, "a pesar de");
  });
});
