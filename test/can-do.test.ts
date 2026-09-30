import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canDoFor, canDoScore } from "../src/services/can-do.ts";

describe("can-do descriptors", () => {
  it("gives four descriptors for B1", () => {
    const items = canDoFor("B1");
    assert.equal(items.length, 4);
    assert.equal(items[0]?.id, "b1-read");
  });

  it("scores how many the learner held", () => {
    assert.equal(canDoScore(["b1-read", "b1-listen"], "B1"), 50);
    assert.equal(canDoScore([], "B1"), 0);
  });
});
