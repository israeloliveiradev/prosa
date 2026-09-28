import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { castStamp, DEFAULT_CAST, lessonVoicePrompt, parseCast } from "../src/services/minds.ts";

describe("minds", () => {
  it("keeps a mind inside its own slot", () => {
    const cast = parseCast({ reading: "plato", memory: "einstein", speech: "feynman", journal: "hypatia" });
    assert.equal(cast.reading, "plato");
    assert.equal(cast.memory, "curie");
    assert.equal(cast.speech, "feynman");
    assert.equal(cast.journal, "hypatia");
  });

  it("writes Einstein into the lesson voice", () => {
    const prompt = lessonVoicePrompt(DEFAULT_CAST);
    assert.match(prompt, /Albert Einstein/);
    assert.match(prompt, /Marie Curie/);
    assert.match(prompt, /Richard Feynman/);
    assert.match(prompt, /Leonardo da Vinci/);
    assert.equal(castStamp(DEFAULT_CAST), "einstein:curie:feynman:davinci");
  });
});
