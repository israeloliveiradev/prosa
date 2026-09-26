import assert from "node:assert/strict";
import test from "node:test";
import { cadenceReport } from "../src/services/cadence.js";

test("cadenceReport", async (t) => {
  await t.test("marks a rushed word and keeps an even word in time", () => {
    const report = cadenceReport(
      [{ offsetMs: 0 }, { offsetMs: 400 }, { offsetMs: 800 }],
      [{ durationMs: 400 }, { durationMs: 120 }],
    );
    assert.equal(report.bars[0]?.note, "no tempo");
    assert.equal(report.bars[1]?.note, "apressou");
    assert.equal(report.bars[1]?.drift, true);
    assert.ok(report.score < 100);
  });

  await t.test("returns an empty radar when either side is silent", () => {
    assert.deepEqual(cadenceReport([], [{ durationMs: 200 }]), { score: 0, bars: [] });
  });
});
