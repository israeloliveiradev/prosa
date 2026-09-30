import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { askingClarify, stripPraise, talkMove } from "../src/services/sense-negotiate.ts";

describe("sense negotiate", () => {
  it("asks when the line is too thin to mean one thing", () => {
    assert.equal(talkMove("It.", [{ role: "mind", text: "How was the interview?" }]), "clarify");
    assert.equal(talkMove("Good.", []), "clarify");
  });

  it("asks for a rephrase after a clarify question", () => {
    assert.equal(
      talkMove("The shop on the corner.", [{ role: "mind", text: "Which shop do you mean?" }]),
      "rephrase",
    );
  });

  it("lets a full answer continue", () => {
    assert.equal(talkMove("I asked for a coffee and they were out of milk.", []), "continue");
  });

  it("drops automatic praise", () => {
    assert.equal(stripPraise("Great! Tell me what happened next."), "Tell me what happened next.");
    assert.equal(askingClarify("Which day do you mean?"), true);
  });
});
