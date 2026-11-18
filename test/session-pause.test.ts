import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deserializeSessionState,
  isSameCalendarDay,
  serializeSessionState,
  SessionSaveState,
} from "../mobile/src/lib/session-clock.ts";

describe("Session Save State & Resume Engine", () => {
  it("serializes and deserializes session state correctly", () => {
    const state: SessionSaveState = {
      version: "7.5",
      pausedAtTimestamp: Date.parse("2026-10-06T14:30:00Z"),
      sessionDurationMode: "sprint_60",
      elapsedSeconds: 1200, // 20 minutes completed in 60m session
      completedBlockIds: ["sprint_60_block_0_speed_drills", "sprint_60_block_1_spaced_retention"],
      currentBlockIndex: 2,
      targetLang: "en",
      accumulatedActiveSeconds: 1200,
    };

    const serialized = serializeSessionState(state);
    assert.ok(typeof serialized === "string");

    const restored = deserializeSessionState(serialized);
    assert.notEqual(restored, null);
    assert.equal(restored?.version, "7.5");
    assert.equal(restored?.sessionDurationMode, "sprint_60");
    assert.equal(restored?.elapsedSeconds, 1200);
    assert.equal(restored?.targetLang, "en");
    assert.deepEqual(restored?.completedBlockIds, [
      "sprint_60_block_0_speed_drills",
      "sprint_60_block_1_spaced_retention",
    ]);
  });

  it("returns null when deserializing corrupt or invalid state", () => {
    assert.equal(deserializeSessionState(null), null);
    assert.equal(deserializeSessionState(""), null);
    assert.equal(deserializeSessionState("{ invalid json "), null);
    assert.equal(deserializeSessionState({ version: "1.0" }), null); // Wrong version
  });

  it("checks same calendar day accurately for streak maintenance", () => {
    const morning = Date.parse("2026-10-06T09:00:00Z");
    const evening = Date.parse("2026-10-06T21:00:00Z");
    const nextDay = Date.parse("2026-10-07T09:00:00Z");

    assert.equal(isSameCalendarDay(morning, evening), true);
    assert.equal(isSameCalendarDay(morning, nextDay), false);
  });
});
