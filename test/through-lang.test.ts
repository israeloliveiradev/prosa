import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lessonLeaksSpanish, namedLang, spanishGlossLeak, throughLabel } from "../src/services/through-lang.ts";

describe("through language gloss", () => {
  it("names Brazilian Portuguese", () => {
    assert.equal(throughLabel("pt"), "Brazilian Portuguese");
    assert.equal(namedLang("pt"), "Brazilian Portuguese (pt)");
  });

  it("catches Spanish spellings on an English deck gloss", () => {
    assert.equal(spanishGlossLeak("Extracción"), true);
    assert.equal(spanishGlossLeak("Percepción"), true);
    assert.equal(spanishGlossLeak("Infusión"), true);
    assert.equal(spanishGlossLeak("Entropía"), true);
    assert.equal(spanishGlossLeak("Extração"), false);
    assert.equal(spanishGlossLeak("Percepção"), false);
    assert.equal(spanishGlossLeak("gole"), false);
  });

  it("does not flag Portuguese imperfect forms ending in ía", () => {
    assert.equal(spanishGlossLeak("A empresa construía data centers e incluía novos países."), false);
    assert.equal(spanishGlossLeak("Ele saía cedo e possuía duas casas; doía a cabeça."), false);
    assert.equal(spanishGlossLeak("A tecnología avanza cada día."), true);
    assert.equal(spanishGlossLeak("Economía"), true);
  });

  it("flags a lesson whose vocabulary slipped into Spanish", () => {
    assert.equal(
      lessonLeaksSpanish({
        translation: "Toda manhã ela pede um café.",
        vocabulary: [{ translation: "Extracción" }],
      }),
      true,
    );
  });
});
