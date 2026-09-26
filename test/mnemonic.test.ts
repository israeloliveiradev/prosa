import assert from "node:assert/strict";
import test from "node:test";
import { mnemonicEligible } from "../src/services/mnemonic-service.js";

test("mnemonicEligible", async (t) => {
  await t.test("stays closed before four successful repetitions", () => {
    assert.equal(mnemonicEligible(3, 10, 8), false);
  });

  await t.test("opens when most reviews failed and the card still has repetitions", () => {
    assert.equal(mnemonicEligible(4, 10, 7), true);
  });

  await t.test("stays closed when the failure rate is at the boundary", () => {
    assert.equal(mnemonicEligible(4, 10, 6), false);
  });
});
