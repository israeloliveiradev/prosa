import assert from "node:assert/strict";
import test from "node:test";
import { orderGrammarBlocks } from "../src/services/grammar-service.js";

test("orderGrammarBlocks", async (t) => {
  await t.test("puts the four roles in building-block order and keeps the current text first", () => {
    const ordered = orderGrammarBlocks([
      { role: "object", text: "the door", options: ["the window", "the door"] },
      { role: "verb", text: "open", options: ["close"] },
      { role: "connector", text: "will", options: ["will"] },
      { role: "subject", text: "She", options: ["He"] },
    ]);
    assert.ok(ordered);
    assert.deepEqual(
      ordered.map((block) => block.role),
      ["subject", "connector", "verb", "object"],
    );
    assert.equal(ordered[0]?.options[0], "She");
    assert.equal(ordered[3]?.options[0], "the door");
  });

  await t.test("rejects a sentence that is missing a block", () => {
    assert.equal(orderGrammarBlocks([{ role: "subject", text: "She", options: ["She"] }]), null);
  });
});
