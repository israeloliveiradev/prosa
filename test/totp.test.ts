import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateTotpSecret, totpCode, verifyTotp } from "../src/services/totp.ts";

describe("totp", () => {
  it("accepts the current code and rejects a wrong one", () => {
    const secret = generateTotpSecret();
    const now = Date.parse("2026-09-26T15:00:00Z");
    const code = totpCode(secret, now);
    assert.equal(code.length, 6);
    assert.equal(verifyTotp(secret, code, now), true);
    assert.equal(verifyTotp(secret, "000000", now), false);
  });
});
