import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { goneKinds, retentionRate } from "../src/services/measure.ts";

describe("measure panel", () => {
  it("averages FSRS retrievability", () => {
    const now = Date.parse("2026-09-30T00:00:00Z");
    const rate = retentionRate(
      [
        { stability: 20, last_review_at: new Date("2026-09-29T00:00:00Z") },
        { stability: 20, last_review_at: new Date("2026-09-29T00:00:00Z") },
      ],
      now,
    );
    assert.equal(typeof rate, "number");
    assert.ok((rate ?? 0) >= 80);
  });

  it("lists error kinds that left", () => {
    assert.deepEqual(goneKinds(["tense", "article"], ["article"]), ["tense"]);
  });

  it("stays quiet without reviewed cards", () => {
    assert.equal(retentionRate([]), null);
  });
});
