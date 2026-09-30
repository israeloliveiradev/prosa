import assert from "node:assert/strict";
import test from "node:test";
import { feedbackStep, mergeMemory, repairStep } from "../src/services/learner-memory.ts";

test("mentor memory", async (t) => {
  await t.test("keeps a fact once and trims the thread", () => {
    const first = mergeMemory(null, {
      facts: ["entrevista na terça", "entrevista na terça"],
      goal: "falar no trabalho",
      error: "tempo verbal",
      thread: "Falou da entrevista.",
    });
    assert.deepEqual(first.facts, ["entrevista na terça"]);
    assert.deepEqual(first.goals, ["falar no trabalho"]);
    assert.deepEqual(first.errors, [{ note: "tempo verbal", count: 1 }]);
    const second = mergeMemory(first, {
      facts: ["Entrevista na terça"],
      goal: "",
      error: "tempo verbal",
      thread: "",
    });
    assert.equal(second.facts.length, 1);
    assert.equal(second.errors[0]?.count, 2);
    assert.equal(second.thread, "Falou da entrevista.");
  });

  await t.test("climbs the repair ladder", () => {
    assert.equal(repairStep("", []), "none");
    assert.equal(repairStep("tempo verbal", []), "prompt");
    assert.equal(repairStep("tempo verbal", [{ note: "tempo verbal", count: 1 }]), "hint");
    assert.equal(repairStep("tempo verbal", [{ note: "Tempo verbal", count: 2 }]), "correction");
  });

  await t.test("a repeated mistake jumps ahead of a first try", () => {
    assert.equal(feedbackStep(1, "tempo verbal", [{ note: "tempo verbal", count: 2 }]), "correction");
    assert.equal(feedbackStep(2, "", []), "hint");
    assert.equal(feedbackStep(1, "", []), "prompt");
  });
});
