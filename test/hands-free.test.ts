import assert from "node:assert/strict";
import test from "node:test";
import { allSentences, handsFreeIntro, handsFreeSteps, sentenceRanges } from "../mobile/src/lib/hands-free.ts";

test("hands-free queue", () => {
  const steps = handsFreeSteps(2);
  assert.deepEqual(
    steps.map((step) => step.kind),
    ["intro", "hear", "gap", "confirm", "hear", "gap", "confirm"],
  );
  assert.equal(steps[3]?.unit, 1);
  assert.equal(steps[4]?.unit, 2);
  assert.equal(handsFreeSteps(40).filter((step) => step.kind === "hear").length, 16);
  assert.deepEqual(allSentences("あ。い！う？え"), ["あ。", "い！", "う？", "え"]);
  assert.match(handsFreeIntro("pt", "Café"), /^O tema é Café\./);
  const ranges = sentenceRanges("Hello there. Next one.");
  assert.equal(ranges[0]?.start, 0);
  assert.equal(ranges[0]?.end, 2);
  assert.equal(ranges[1]?.start, 2);
});
