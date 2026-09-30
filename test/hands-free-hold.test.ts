import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handsFreeHeld } from "../src/services/hands-free-hold.ts";

describe("hands-free hold", () => {
  it("holds the sentence when most words land", () => {
    assert.equal(handsFreeHeld("The shop is open.", "the shop is open"), true);
    assert.equal(handsFreeHeld("The shop is open.", "the shop"), false);
    assert.equal(handsFreeHeld("The shop is open.", ""), false);
  });
});
