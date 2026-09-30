import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pairFits } from "../src/services/pair-match.ts";

describe("journal pairs", () => {
  it("matches an English speaker to a Brazilian writing in English", () => {
    assert.equal(
      pairFits({ native_lang: "pt", target_lang: "en" }, { native_lang: "en", target_lang: "de" }),
      true,
    );
  });

  it("keeps the classic tandem", () => {
    assert.equal(
      pairFits({ native_lang: "pt", target_lang: "en" }, { native_lang: "en", target_lang: "pt" }),
      true,
    );
  });

  it("does not pair two people studying the same language from the same L1", () => {
    assert.equal(
      pairFits({ native_lang: "pt", target_lang: "en" }, { native_lang: "pt", target_lang: "en" }),
      false,
    );
  });
});
