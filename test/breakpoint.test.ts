import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { breakpointFor, isAtLeast } from "../mobile/src/lib/breakpoint.ts";

describe("breakpoint resolution", () => {
  it("resolves widths to correct breakpoint", () => {
    assert.equal(breakpointFor(375), "mobile");
    assert.equal(breakpointFor(767), "mobile");
    assert.equal(breakpointFor(768), "tablet");
    assert.equal(breakpointFor(1023), "tablet");
    assert.equal(breakpointFor(1024), "laptop");
    assert.equal(breakpointFor(1279), "laptop");
    assert.equal(breakpointFor(1280), "desktop");
    assert.equal(breakpointFor(1920), "desktop");
  });

  it("checks atLeast hierarchy correctly", () => {
    assert.equal(isAtLeast("desktop", "desktop"), true);
    assert.equal(isAtLeast("desktop", "laptop"), true);
    assert.equal(isAtLeast("desktop", "mobile"), true);

    assert.equal(isAtLeast("laptop", "desktop"), false);
    assert.equal(isAtLeast("laptop", "laptop"), true);
    assert.equal(isAtLeast("laptop", "tablet"), true);

    assert.equal(isAtLeast("tablet", "laptop"), false);
    assert.equal(isAtLeast("mobile", "tablet"), false);
  });
});
