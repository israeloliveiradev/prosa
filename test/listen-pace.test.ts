import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dayIndex } from "../mobile/src/lib/listen-pace.ts";

describe("voice of the day", () => {
  it("stays on the only voice", () => {
    assert.equal(dayIndex("2026-09-29", 1), 0);
  });

  it("moves to another voice on the next day", () => {
    const today = dayIndex("2026-09-29", 4);
    const tomorrow = dayIndex("2026-09-30", 4);
    assert.notEqual(today, tomorrow);
    assert.equal(dayIndex("2026-09-29", 4), today);
  });
});
