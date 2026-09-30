import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateJournalBodySchema } from "../src/schemas/journal.ts";
import { reconstructionBodySchema } from "../src/schemas/reconstruction.ts";
import { ladderStep, veilCorrection } from "../src/services/journal-service.ts";

describe("journal correction ladder", () => {
  const item = {
    original: "I have 25 years",
    corrected: "I am 25",
    reason: "Idade usa o verbo ser.",
    kind: "idade",
  };

  it("hides the sentence on the first try", () => {
    const view = veilCorrection(item, 1, []);
    assert.equal(view.step, "prompt");
    assert.equal(view.corrected, "");
    assert.equal(view.reason, "");
    assert.equal(view.kind, "");
    assert.equal(view.original, item.original);
  });

  it("shows the hint and still hides the sentence on the second try", () => {
    const view = veilCorrection(item, 2, []);
    assert.equal(view.step, "hint");
    assert.equal(view.corrected, "");
    assert.equal(view.reason, item.reason);
    assert.equal(view.kind, item.kind);
  });

  it("shows the sentence on the third try", () => {
    const view = veilCorrection(item, 3, []);
    assert.equal(view.step, "correction");
    assert.equal(view.corrected, item.corrected);
  });

  it("skips ahead when the same mistake is already remembered", () => {
    const view = veilCorrection(item, 1, [{ note: "idade", count: 2 }]);
    assert.equal(view.step, "correction");
    assert.equal(view.corrected, item.corrected);
  });

  it("keeps the rewrite separate from the try counter", () => {
    const parsed = reconstructionBodySchema.parse({
      attempt: "I am 25",
      story_text: "I am 25 years old.",
      translation: "Eu tenho 25 anos.",
      target_lang: "en",
      through_lang: "pt",
      level: "A2",
    });
    assert.equal(parsed.attempt, "I am 25");
    assert.equal(parsed.try_index, 1);
  });

  it("starts the journal ladder on the first try when attempt is omitted", () => {
    const parsed = evaluateJournalBodySchema.parse({
      text: "I have 25 years",
      journal_prompt: "How old are you?",
      target_lang: "en",
      native_lang: "pt",
      level: "A2",
    });
    assert.equal(parsed.attempt, 1);
  });

  it("stays open while any correction is still a prompt", () => {
    assert.equal(ladderStep(["hint", "prompt"]), "prompt");
    assert.equal(ladderStep([]), "correction");
  });
});
