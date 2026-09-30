import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { emptyProfile } from "../src/services/learner-profile.ts";
import { duelFocus } from "../src/services/duel-focus.ts";

describe("duel focus", () => {
  it("uses the recurring error kinds first", () => {
    const profile = { ...emptyProfile(), error_kinds: ["tense", "agreement"] };
    assert.deepEqual(duelFocus(profile), ["verb tense", "agreement"]);
  });

  it("falls back to the weakest scored skill", () => {
    const profile = { ...emptyProfile(), reading: 80, listening: 40, grammar: 70 };
    assert.deepEqual(duelFocus(profile), ["listening vocabulary"]);
  });

  it("stays empty when the profile has no signal", () => {
    assert.deepEqual(duelFocus(emptyProfile()), []);
  });
});
