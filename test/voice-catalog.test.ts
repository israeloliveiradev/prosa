import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../src/http/errors.ts";
import { resolveNarrationVoice, voicesFor } from "../src/services/voice-catalog.ts";

describe("resolveNarrationVoice", () => {
  it("defaults English to Ava", () => {
    assert.equal(resolveNarrationVoice("en").id, "en-US-AvaNeural");
    assert.equal(voicesFor("EN").length, 4);
  });

  it("accepts another voice of the same language", () => {
    assert.equal(resolveNarrationVoice("en", "en-US-AndrewNeural").name, "Andrew");
  });

  it("defaults Portuguese to Francisca", () => {
    assert.equal(resolveNarrationVoice("pt").id, "pt-BR-FranciscaNeural");
  });

  it("rejects a voice from another language", () => {
    assert.throws(() => resolveNarrationVoice("en", "es-ES-ElviraNeural"), (error: unknown) => {
      return error instanceof AppError && error.statusCode === 400;
    });
  });
});
