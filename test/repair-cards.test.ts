import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calqueCards, recurringCorrectionCards, recurringGrammarCards } from "../src/services/repair-cards.ts";

describe("repair cards", () => {
  const correction = {
    original: "I have 25 years",
    corrected: "I am 25",
    reason: "Idade usa o verbo ser.",
    kind: "idade",
  };

  it("waits until the same mistake comes back", () => {
    const first = recurringCorrectionCards([correction], [], [{ note: "idade", count: 1 }]);
    assert.deepEqual(first, []);
    const again = recurringCorrectionCards([correction], [{ note: "idade", count: 1 }], [{ note: "idade", count: 2 }]);
    assert.equal(again[0]?.front_phrase, "I am 25");
    assert.equal(again[0]?.context_sentence, "I have 25 years");
  });

  it("does not mint a second card for a mistake already stored", () => {
    const third = recurringCorrectionCards([correction], [{ note: "idade", count: 2 }], [{ note: "idade", count: 3 }]);
    assert.deepEqual(third, []);
  });

  it("turns a calque into the natural wording", () => {
    const cards = calqueCards([
      { phrase: "I have 25 years", native_alternative: "I am 25", reason: "Idade não se possui." },
    ]);
    assert.equal(cards[0]?.front_phrase, "I am 25");
    assert.equal(cards[0]?.context_sentence, "I have 25 years");
  });

  it("saves grammar once it has already appeared", () => {
    const notes = [{ original: "He go", corrected: "He goes", reason: "Terceira pessoa." }];
    assert.deepEqual(recurringGrammarCards(notes, 0), []);
    assert.equal(recurringGrammarCards(notes, 1)[0]?.front_phrase, "He goes");
    assert.deepEqual(recurringGrammarCards(notes, 2), []);
  });
});
