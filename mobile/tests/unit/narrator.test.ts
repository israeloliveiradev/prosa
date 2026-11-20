import { test, expect } from "@playwright/test";
import { kv } from "@/lib/kv";
import { defaultVoiceId, narratorVoice, sampleLine, setNarratorVoice, voicesFor } from "@/lib/narrator";

test.describe("Narrador: catálogo no aparelho", () => {
  test.afterEach(() => {
    kv.delete("prosa.narrator.v1");
  });

  test("cada idioma-alvo tem vozes, com gênero e motor", () => {
    for (const lang of ["en", "de", "fr", "es", "it", "ru", "pt"]) {
      const voices = voicesFor(lang);
      expect(voices.length, lang).toBeGreaterThanOrEqual(2);
      for (const voice of voices) {
        expect(voice.lang).toBe(lang);
        expect(["female", "male"]).toContain(voice.gender);
        expect(voice.engine).toBe(lang === "en" ? "kokoro" : "piper");
        expect(voice.label.length).toBeGreaterThan(0);
      }
    }
    expect(new Set(voicesFor("en").map((voice) => voice.gender))).toEqual(new Set(["female", "male"]));
    expect(voicesFor("en-US")).toEqual(voicesFor("en"));
  });

  test("japonês usa a voz do sistema (sem speechSynthesis no Node: uma entrada genérica)", () => {
    const voices = voicesFor("ja");
    expect(voices).toHaveLength(1);
    expect(voices[0]?.engine).toBe("webspeech");
    expect(voices[0]?.id).toBe("webspeech:ja-JP");
  });

  test("padrão: inglês varia por dia (mesmo modelo); Piper fica na voz padrão", () => {
    const en = new Set(["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"].map((date) => defaultVoiceId("en", date)));
    expect(en.size).toBeGreaterThan(1);
    const de = new Set(["2026-11-17", "2026-11-18", "2026-11-19"].map((date) => defaultVoiceId("de", date)));
    expect([...de]).toEqual(["de_DE-thorsten-medium"]);
    expect(defaultVoiceId("ko")).toBe("");
  });

  test("escolha salva vale só se for do catálogo; ids antigos (Edge) são ignorados", () => {
    setNarratorVoice("de", "de_DE-kerstin-low");
    expect(narratorVoice("de")).toBe("de_DE-kerstin-low");
    setNarratorVoice("de", "af_heart");
    expect(narratorVoice("de")).toBe("de_DE-kerstin-low");
    kv.set("prosa.narrator.v1", JSON.stringify({ en: "en-US-AvaNeural" }));
    expect(voicesFor("en").map((voice) => voice.id)).toContain(narratorVoice("en"));
  });

  test("frase de amostra no idioma da voz", () => {
    expect(sampleLine("ru")).toContain("Привет");
    expect(sampleLine("ja-JP")).toContain("こんにちは");
    expect(sampleLine("xx")).toBe(sampleLine("en"));
  });
});
