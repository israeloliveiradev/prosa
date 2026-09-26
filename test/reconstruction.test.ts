import assert from "node:assert/strict";
import test from "node:test";
import {
  finishReconstruction,
  reconstructionDue,
  scheduleReconstruction,
  type ReconstructionAnchor,
} from "../mobile/src/lib/reconstruction.ts";

function anchor(date: string, story = "story"): ReconstructionAnchor {
  return {
    date,
    topic: "coffee",
    targetLang: "en",
    throughLang: "pt",
    level: "A2",
    storyText: story,
    translation: "tradução",
    completedOn: null,
  };
}

test("reconstruction schedule", async (t) => {
  await t.test("keeps the unread story and parks the newer one", () => {
    const first = scheduleReconstruction(null, null, anchor("2026-09-24", "day one"));
    const second = scheduleReconstruction(first.pending, first.next, anchor("2026-09-25", "day two"));
    assert.equal(second.pending?.storyText, "day one");
    assert.equal(second.next?.storyText, "day two");
    assert.equal(reconstructionDue(second.pending, "2026-09-25"), null);
    assert.equal(reconstructionDue(second.pending, "2026-09-26")?.storyText, "day one");
  });

  await t.test("promotes the parked story after the reverse rewrite", () => {
    const parked = scheduleReconstruction(anchor("2026-09-24"), anchor("2026-09-26", "today"), anchor("2026-09-26", "today"));
    const done = finishReconstruction(parked.pending, parked.next, "2026-09-26");
    assert.equal(done.pending?.storyText, "today");
    assert.equal(done.next, null);
    assert.equal(reconstructionDue(done.pending, "2026-09-26"), null);
  });
});
