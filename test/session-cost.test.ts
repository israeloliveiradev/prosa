import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { costMicros, perSessionMicros, usdFromMicros } from "../src/services/session-cost.ts";

describe("session cost", () => {
  it("charges nothing on a cache hit", () => {
    assert.equal(costMicros({ task: "lesson", provider: "gemini", lane: "full", cached: true }), 0);
    assert.equal(costMicros({ task: "audio", provider: "cache", lane: "full", cached: true }), 0);
  });

  it("prices a cheap Groq call below a full Gemini call", () => {
    const cheap = costMicros({ task: "grammar", provider: "groq", lane: "cheap", cached: false });
    const full = costMicros({ task: "lesson", provider: "gemini", lane: "full", cached: false });
    assert.ok(cheap < full);
    assert.ok(cheap > 0);
  });

  it("splits the day by real sessions", () => {
    assert.equal(perSessionMicros(800, 2), 400);
    assert.equal(perSessionMicros(400, 0), null);
    assert.equal(usdFromMicros(400), "0.000");
    assert.equal(usdFromMicros(12_000), "0.012");
  });
});
