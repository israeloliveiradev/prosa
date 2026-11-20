import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { MINDS } from "@/design/minds";
import { NARRATOR_VOICE_IDS } from "@/lib/narrator";
import * as maps from "@/workers/ttsWorker";

/**
 * Catálogo de vozes no aparelho, conferido contra os pacotes instalados:
 * cada id existe no kokoro-js / piper-tts-web, os gêneros batem, os mapas de mentor
 * cobrem as 16 mentes e o worker de runtime (.js) é cópia literal do .ts.
 */

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");

function kokoroCatalog(): Map<string, { gender: "female" | "male"; language: string }> {
  const source = read("node_modules/kokoro-js/dist/kokoro.js");
  const out = new Map<string, { gender: "female" | "male"; language: string }>();
  for (const match of source.matchAll(/\b([a-z]{2}_[a-z]+):\{name:"[^"]+",language:"([^"]+)",gender:"(Female|Male)"/g)) {
    out.set(match[1] as string, { gender: match[3] === "Female" ? "female" : "male", language: match[2] as string });
  }
  return out;
}

function piperCatalog(): Set<string> {
  const source = read("node_modules/@mintplex-labs/piper-tts-web/dist/piper-tts-web.js");
  const out = new Set<string>();
  for (const match of source.matchAll(/"([a-z]{2}_[A-Z]{2}-[^"]+)":\s*"[^"]+\.onnx"/g)) {
    out.add(match[1] as string);
  }
  return out;
}

/** Avalia o bloco <voice-maps> do worker de runtime e devolve os mapas. */
function runtimeMaps(): Record<string, unknown> {
  const source = read("public/workers/ttsWorker.js");
  const start = source.indexOf("// <voice-maps>");
  const end = source.indexOf("// </voice-maps>");
  expect(start, "marcador <voice-maps> no worker").toBeGreaterThanOrEqual(0);
  expect(end, "marcador </voice-maps> no worker").toBeGreaterThan(start);
  const block = source.slice(start, end).replace(/^export const /gm, "const ");
  const names = ["ENGINE_BY_LANG", "DEFAULT_VOICE_BY_LANG", "KOKORO_VOICES", "PIPER_VOICES", "KOKORO_MENTOR_VOICES", "PIPER_MENTOR_VOICES"];
  return new Function(`${block}\nreturn { ${names.join(", ")} };`)() as Record<string, unknown>;
}

const FEMALE_MINDS = new Set(["curie", "lovelace", "hypatia"]);

test.describe("Vozes no aparelho: catálogos instalados", () => {
  test("toda voz Kokoro existe no kokoro-js instalado, com o mesmo gênero", () => {
    const installed = kokoroCatalog();
    expect(installed.size).toBeGreaterThanOrEqual(28);
    for (const [id, info] of Object.entries(maps.KOKORO_VOICES)) {
      expect(installed.has(id), `kokoro-js não tem ${id}`).toBe(true);
      expect(installed.get(id)?.gender, `gênero de ${id}`).toBe(info.gender);
      expect(installed.get(id)?.language.startsWith("en"), `${id} é inglês`).toBe(true);
    }
  });

  test("toda voz Piper existe no PATH_MAP do piper-tts-web, no idioma certo", () => {
    const installed = piperCatalog();
    expect(installed.size).toBeGreaterThan(100);
    for (const [id, info] of Object.entries(maps.PIPER_VOICES)) {
      expect(installed.has(id), `piper-tts-web não tem ${id}`).toBe(true);
      expect(id.slice(0, 2), `idioma de ${id}`).toBe(info.lang);
      expect([16000, 22050, 44100]).toContain(info.sampleRate);
    }
  });

  test("não sobra id inválido (jf_/jm_/ff_/ef_/if_/pf_ não existem no kokoro-js 1.2.1)", () => {
    const everyId = [
      ...Object.keys(maps.KOKORO_VOICES),
      ...Object.values(maps.KOKORO_MENTOR_VOICES).flatMap((row) => Object.values(row)),
      ...Object.values(maps.PIPER_MENTOR_VOICES).flatMap((row) => Object.values(row)),
      ...Object.values(maps.DEFAULT_VOICE_BY_LANG),
    ];
    for (const id of everyId) {
      expect(/^(jf|jm|ff|ef|em|if|im|pf|pm|zf|zm|hf|hm)_/.test(id), `id inválido ${id}`).toBe(false);
    }
  });

  test("motores por idioma: Kokoro só en, Piper de/fr/es/it/ru/pt, Web Speech só ja", () => {
    expect(maps.ENGINE_BY_LANG).toEqual({
      en: "kokoro",
      de: "piper",
      fr: "piper",
      es: "piper",
      it: "piper",
      ru: "piper",
      pt: "piper",
      ja: "webspeech",
    });
    for (const [lang, voice] of Object.entries(maps.DEFAULT_VOICE_BY_LANG)) {
      const engine = maps.ENGINE_BY_LANG[lang];
      if (engine === "kokoro") {
        expect(maps.KOKORO_VOICES[voice], `padrão ${lang}`).toBeTruthy();
      } else if (engine === "piper") {
        expect(maps.PIPER_VOICES[voice]?.lang, `padrão ${lang}`).toBe(lang);
      } else {
        expect(voice.startsWith("webspeech:")).toBe(true);
      }
    }
  });

  test("mapas de mentor cobrem as 16 mentes, com vozes válidas e gênero certo", () => {
    expect(MINDS.length).toBe(16);
    const mindIds = MINDS.map((mind) => mind.id).sort();
    expect(Object.keys(maps.KOKORO_MENTOR_VOICES).sort()).toEqual(mindIds);
    expect(Object.keys(maps.PIPER_MENTOR_VOICES).sort()).toEqual(mindIds);
    for (const mind of MINDS) {
      const expected = FEMALE_MINDS.has(mind.id) ? "female" : "male";
      const en = maps.KOKORO_MENTOR_VOICES[mind.id]?.en ?? "";
      expect(maps.KOKORO_VOICES[en]?.gender, `${mind.id}/en`).toBe(expected);
      for (const lang of ["de", "fr", "es", "it", "ru", "pt"] as const) {
        const id = maps.PIPER_MENTOR_VOICES[mind.id]?.[lang] ?? "";
        const info = maps.PIPER_VOICES[id];
        expect(info?.lang, `${mind.id}/${lang} → ${id}`).toBe(lang);
        const hasGender = Object.values(maps.PIPER_VOICES).some((voice) => voice.lang === lang && voice.gender === expected);
        if (hasGender) {
          expect(info?.gender, `${mind.id}/${lang} → ${id}`).toBe(expected);
        }
      }
    }
  });

  test("russo existe: irina feminina; denis, dmitri e ruslan masculinas", () => {
    expect(maps.PIPER_VOICES["ru_RU-irina-medium"]?.gender).toBe("female");
    for (const id of ["ru_RU-denis-medium", "ru_RU-dmitri-medium", "ru_RU-ruslan-medium"]) {
      expect(maps.PIPER_VOICES[id]?.gender, id).toBe("male");
    }
  });

  test("Einstein, Curie e Feynman têm vozes distintas em todo idioma com 3 vozes ou mais", () => {
    const counts: Record<string, number> = { en: Object.keys(maps.KOKORO_VOICES).length };
    for (const voice of Object.values(maps.PIPER_VOICES)) {
      counts[voice.lang] = (counts[voice.lang] ?? 0) + 1;
    }
    for (const [lang, count] of Object.entries(counts)) {
      if (count < 3) {
        continue;
      }
      const pick = (mind: string) =>
        lang === "en" ? maps.KOKORO_MENTOR_VOICES[mind]?.en : maps.PIPER_MENTOR_VOICES[mind]?.[lang];
      const trio = new Set(["einstein", "curie", "feynman"].map(pick));
      expect(trio.size, `${lang}: ${[...trio].join(", ")}`).toBe(3);
    }
  });

  test("o seletor só oferece vozes do catálogo", () => {
    for (const [lang, ids] of Object.entries(NARRATOR_VOICE_IDS)) {
      expect(ids.length, lang).toBeGreaterThan(0);
      expect(ids[0], `primeira voz de ${lang} é a padrão`).toBe(maps.DEFAULT_VOICE_BY_LANG[lang]);
      for (const id of ids) {
        const ok = lang === "en" ? Boolean(maps.KOKORO_VOICES[id]) : maps.PIPER_VOICES[id]?.lang === lang;
        expect(ok, `${lang}: ${id}`).toBe(true);
      }
    }
  });
});

test.describe("Worker de runtime (public/workers/ttsWorker.js)", () => {
  test("os mapas do .js são idênticos aos do .ts", () => {
    const runtime = runtimeMaps();
    expect(runtime.ENGINE_BY_LANG).toEqual(maps.ENGINE_BY_LANG);
    expect(runtime.DEFAULT_VOICE_BY_LANG).toEqual(maps.DEFAULT_VOICE_BY_LANG);
    expect(runtime.KOKORO_VOICES).toEqual(maps.KOKORO_VOICES);
    expect(runtime.PIPER_VOICES).toEqual(maps.PIPER_VOICES);
    expect(runtime.KOKORO_MENTOR_VOICES).toEqual(maps.KOKORO_MENTOR_VOICES);
    expect(runtime.PIPER_MENTOR_VOICES).toEqual(maps.PIPER_MENTOR_VOICES);
  });

  test("o Piper carrega o onnxruntime-web do mesmo build dos arquivos em /ort", () => {
    const worker = read("public/workers/ttsWorker.js");
    const installed = JSON.parse(read("node_modules/onnxruntime-web/package.json")) as { version: string };
    const pinned = /const ORT_VERSION = "([^"]+)"/.exec(worker)?.[1];
    expect(pinned).toBe(installed.version);
    expect(worker).toContain("?deps=onnxruntime-web@${ORT_VERSION}");
    for (const file of ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
      const served = createHash("sha256").update(fs.readFileSync(path.join(ROOT, "public/ort", file))).digest("hex");
      const shipped = createHash("sha256").update(fs.readFileSync(path.join(ROOT, "node_modules/onnxruntime-web/dist", file))).digest("hex");
      expect(served, `${file} é do onnxruntime-web ${installed.version}`).toBe(shipped);
    }
  });

  test("a velocidade não vai para o motor nem para AudioBufferSourceNode", () => {
    const worker = read("public/workers/ttsWorker.js");
    expect(worker).toContain("speed: 1");
    const service = read("src/services/speechService.ts");
    const audio = read("src/services/audio/AudioService.ts");
    for (const source of [service, audio]) {
      expect(source).not.toMatch(/createBufferSource|playbackRate\.value/);
    }
    expect(audio).toContain("keepPitch(audio)");
  });
});
