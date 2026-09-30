import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { modelBusy } from "../src/services/ops.ts";

describe("modelBusy", () => {
  it("detects quota and 429 text", () => {
    assert.equal(modelBusy(new Error("429 RESOURCE_EXHAUSTED")), true);
    assert.equal(modelBusy(new Error("You exceeded your current quota")), true);
    assert.equal(modelBusy(new Error("rate limit")), true);
    assert.equal(modelBusy(new Error("rate_limit_exceeded")), true);
    assert.equal(modelBusy(new Error("empty structured response")), false);
    assert.equal(modelBusy(new Error('{"error":{"code":503,"status":"UNAVAILABLE","message":"high demand"}}')), true);
    assert.equal(modelBusy(new Error("This model is currently experiencing high demand")), true);
  });
});
