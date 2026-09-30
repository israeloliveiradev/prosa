import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseJsonContent, scrubSecrets, textOnlyPrompt } from "../src/services/chat-fallback.ts";

describe("textOnlyPrompt", () => {
  it("keeps a plain string", () => {
    assert.equal(textOnlyPrompt("Target language: en"), "Target language: en");
  });

  it("returns null when the request carries audio", () => {
    const contents = [
      {
        role: "user",
        parts: [{ text: "Transcribe" }, { inlineData: { mimeType: "audio/webm", data: "abc" } }],
      },
    ];
    assert.equal(textOnlyPrompt(contents), null);
  });
});

describe("parseJsonContent", () => {
  it("reads a fenced JSON object", () => {
    const parsed = parseJsonContent('```json\n{"reply":"hi"}\n```') as { reply: string };
    assert.equal(parsed.reply, "hi");
  });
});

describe("scrubSecrets", () => {
  it("strips bearer tokens and vendor prefixes", () => {
    const cleaned = scrubSecrets("Bearer abc.def Groq gsk_ABCDEF123456 OpenRouter sk-or-v1-zzzzzzzz");
    assert.equal(cleaned.includes("gsk_"), false);
    assert.equal(cleaned.includes("sk-or-v1-"), false);
    assert.equal(cleaned.includes("Bearer [redacted]"), true);
  });
});
