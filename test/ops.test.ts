import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { modelBusy } from "../src/services/ops.ts";

describe("modelBusy", () => {
  it("detects quota and 429 text", () => {
    assert.equal(modelBusy(new Error("429 RESOURCE_EXHAUSTED")), true);
    assert.equal(modelBusy(new Error("You exceeded your current quota")), true);
    assert.equal(modelBusy(new Error("rate limit")), true);
    assert.equal(modelBusy(new Error("empty structured response")), false);
  });
});
