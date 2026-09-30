import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySignals, clockHint, emptyProfile, profileNote } from "../src/services/learner-profile.ts";

describe("learner profile", () => {
  it("forces listen when hearing is weak", () => {
    const profile = applySignals(emptyProfile(), { reading: 70, listening: 68, hearing: 40 });
    const note = profileNote(profile);
    assert.equal(note.force, "listen");
    assert.equal(clockHint(profile).slowStart, true);
  });

  it("forces listen when listening sits 18 below reading", () => {
    const profile = applySignals(emptyProfile(), { reading: 72, listening: 50 });
    const note = profileNote(profile);
    assert.equal(note.force, "listen");
    assert.equal(note.gap, 22);
    assert.equal(clockHint(profile).listeningGap >= 20, true);
  });

  it("stays quiet when the skills are close", () => {
    const profile = applySignals(emptyProfile(), { reading: 60, listening: 58 });
    assert.equal(profileNote(profile).force, "none");
  });

  it("keeps a repeated error kind at the front", () => {
    const once = applySignals(emptyProfile(), { error: "tense" });
    const twice = applySignals(once, { error: "agreement" });
    const again = applySignals(twice, { error: "tense" });
    assert.deepEqual(again.error_kinds.slice(0, 2), ["tense", "agreement"]);
  });
});
