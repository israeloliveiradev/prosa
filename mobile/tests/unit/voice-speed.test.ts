import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { MINDS } from "@/design/minds";
import { kv } from "@/lib/kv";
import { fastNarratorVoice, narratorVoice, setNarratorVoice, voicesFor } from "@/lib/narrator";
import {
  FAST_EN_DEFAULT,
  FAST_EN_MENTOR_VOICES,
  FAST_NARRATOR_VOICE_IDS,
  PIPER_EN_VOICES,
  fastEquivalent,
  isFastEnglishVoice,
} from "@/services/audio/fastVoices";
import {
  MAX_SAMPLES,
  SLOW_RTF,
  addSample,
  englishEngineFor,
  recordSpeedSample,
  resetSpeed,
  setAutoFast,
  setSpeedPreference,
  shouldSwitchToFast,
  speedState,
  speedVerdict,
  type RtfSample,
} from "@/services/audio/speedGuard";
import { startVoiceWarmup, voiceWarmupState } from "@/services/audio/voiceWarmup";
import { resolveVoice, speechService } from "@/services/speechService";
import { KOKORO_MENTOR_VOICES, KOKORO_VOICES } from "@/workers/ttsWorker";

/**
 * Guarda de velocidade da voz em inglês: quando o Kokoro gera a fala mais devagar do que ela
 * toca, a narração passa para uma voz Piper em inglês (rápida). Medidas reais (M2, Intel Iris Xe):
 * Kokoro WebGPU fp32 ≈ 0,86; Kokoro WASM q8 ≈ 2,2–3,2; Piper en medium ≈ 0,4–0,8.
 */

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const sample = (device: RtfSample["device"], audioMs: number, inferMs: number): RtfSample => ({ device, audioMs, inferMs, at: 0 });

test.describe("Guarda de velocidade: decisão", () => {
  test("sem áudio suficiente ainda não há veredito", () => {
    expect(speedVerdict([])).toBeNull();
    expect(speedVerdict([sample("wasm", 1_500, 4_000)])).toBeNull();
    // trechos curtos (< 0,5 s) medem a sobrecarga, não a voz: ficam de fora
    expect(speedVerdict([sample("wasm", 400, 2_000), sample("wasm", 400, 2_000), sample("wasm", 400, 2_000), sample("wasm", 400, 2_000), sample("wasm", 400, 2_000)])).toBeNull();
  });

  test("WASM medido como no M1 (23,5 s para 10,5 s de áudio) é lento", () => {
    const verdict = speedVerdict([sample("wasm", 10_500, 23_500)]);
    expect(verdict).toMatchObject({ device: "wasm", slow: true, samples: 1 });
    expect(verdict?.rtf).toBeCloseTo(2.24, 2);
  });

  test("WebGPU medido no M2 (3,7 s para 4,3 s) não é lento", () => {
    const verdict = speedVerdict([sample("webgpu", 4_300, 3_736), sample("webgpu", 4_875, 4_217)]);
    expect(verdict?.slow).toBe(false);
    expect(verdict?.rtf).toBeLessThan(1);
  });

  test("limiar: até 1,1 é aceitável; acima é lento (média ponderada pela duração)", () => {
    expect(SLOW_RTF).toBe(1.1);
    expect(speedVerdict([sample("wasm", 2_000, 2_200)])?.slow).toBe(false);
    expect(speedVerdict([sample("wasm", 2_000, 2_240)])?.slow).toBe(true);
    // um trecho longo e rápido pesa mais que um curto e lento
    const mixed = speedVerdict([sample("wasm", 8_000, 6_000), sample("wasm", 1_000, 3_000)]);
    expect(mixed?.rtf).toBe(1);
    expect(mixed?.slow).toBe(false);
  });

  test("o veredito é do dispositivo pedido (ou do da medida mais recente)", () => {
    const samples = [sample("wasm", 5_000, 12_000), sample("webgpu", 5_000, 4_000)];
    expect(speedVerdict(samples)?.device).toBe("webgpu");
    expect(speedVerdict(samples)?.slow).toBe(false);
    expect(speedVerdict(samples, "wasm")?.slow).toBe(true);
  });

  test("medidas inválidas não entram e a lista guarda só as últimas", () => {
    expect(addSample([], sample("wasm", Number.NaN, 100))).toEqual([]);
    expect(addSample([], sample("wasm", 2_000, 0))).toEqual([]);
    let samples: RtfSample[] = [];
    for (let index = 0; index < MAX_SAMPLES + 3; index += 1) {
      samples = addSample(samples, { ...sample("wasm", 1_000, 1_000), at: index });
    }
    expect(samples).toHaveLength(MAX_SAMPLES);
    expect(samples[0]?.at).toBe(3);
  });

  test("motor do inglês: a escolha do aluno manda; no automático, o rápido só depois de pronto", () => {
    expect(englishEngineFor("natural", true)).toBe("kokoro");
    expect(englishEngineFor("fast", false)).toBe("piper");
    expect(englishEngineFor("auto", false)).toBe("kokoro");
    expect(englishEngineFor("auto", true)).toBe("piper");
  });

  test("hora de trocar: só no automático, natural medido lento e sem troca feita", () => {
    const slow = speedVerdict([sample("wasm", 4_000, 12_000)]);
    const fine = speedVerdict([sample("webgpu", 4_000, 3_400)]);
    expect(shouldSwitchToFast("auto", slow, false)).toBe(true);
    expect(shouldSwitchToFast("auto", slow, true)).toBe(false);
    expect(shouldSwitchToFast("natural", slow, false)).toBe(false);
    expect(shouldSwitchToFast("fast", slow, false)).toBe(false);
    expect(shouldSwitchToFast("auto", fine, false)).toBe(false);
    expect(shouldSwitchToFast("auto", null, false)).toBe(false);
  });
});

test.describe("Guarda de velocidade: estado deste aparelho", () => {
  test.afterEach(() => {
    resetSpeed();
    kv.delete("prosa.narrator.v1");
  });

  test("medidas acumulam e dão o veredito; a preferência volta ao automático com a medida em vigor", () => {
    resetSpeed();
    expect(speedState()).toMatchObject({ preference: "auto", autoFast: false, samples: [] });
    expect(recordSpeedSample(sample("wasm", 1_200, 3_000))).toBeNull();
    const verdict = recordSpeedSample(sample("wasm", 3_000, 7_000));
    expect(verdict?.slow).toBe(true);
    expect(speedState().samples).toHaveLength(2);
    setAutoFast(true);
    expect(speechService.englishEngine()).toBe("piper");
    setSpeedPreference("natural");
    expect(speechService.englishEngine()).toBe("kokoro");
    // de volta ao automático, ainda lento: a troca continua valendo
    setSpeedPreference("auto");
    expect(speedState().autoFast).toBe(true);
    // a voz natural ficou rápida (ex.: WebGPU): voltar ao automático desfaz a troca
    setSpeedPreference("natural");
    recordSpeedSample(sample("wasm", 30_000, 3_000));
    setSpeedPreference("auto");
    expect(speedState().autoFast).toBe(false);
    expect(speechService.englishEngine()).toBe("kokoro");
  });

  test("informações para o seletor", () => {
    resetSpeed();
    speechService.setSpeedPreference("fast");
    const info = speechService.speedInfo();
    expect(info).toMatchObject({ preference: "fast", engine: "piper", autoFast: false, verdict: null, switching: false });
  });
});

test.describe("Vozes rápidas em inglês (Piper)", () => {
  function piperCatalog(): Set<string> {
    const source = read("node_modules/@mintplex-labs/piper-tts-web/dist/piper-tts-web.js");
    const out = new Set<string>();
    for (const match of source.matchAll(/"([a-z]{2}_[A-Z]{2}-[^"]+)":\s*"[^"]+\.onnx"/g)) {
      out.add(match[1] as string);
    }
    return out;
  }

  test("toda voz existe no PATH_MAP do piper-tts-web, é inglês e tem taxa conhecida", () => {
    const installed = piperCatalog();
    for (const [id, info] of Object.entries(PIPER_EN_VOICES)) {
      expect(installed.has(id), `piper-tts-web não tem ${id}`).toBe(true);
      expect(id.startsWith(info.accent === "US" ? "en_US-" : "en_GB-"), id).toBe(true);
      expect(info.lang).toBe("en");
      // medido no cabeçalho WAV do Piper no navegador (M2): todas as medium em 22 050 Hz
      expect(info.sampleRate).toBe(22050);
    }
    expect(FAST_NARRATOR_VOICE_IDS[0]).toBe(FAST_EN_DEFAULT);
    expect([...FAST_NARRATOR_VOICE_IDS].sort()).toEqual(Object.keys(PIPER_EN_VOICES).sort());
    const genders = new Set(Object.values(PIPER_EN_VOICES).map((voice) => voice.gender));
    expect(genders).toEqual(new Set(["female", "male"]));
  });

  test("equivalente rápido: mesmo gênero e sotaque de cada voz Kokoro", () => {
    for (const [id, info] of Object.entries(KOKORO_VOICES)) {
      const fast = PIPER_EN_VOICES[fastEquivalent(id)];
      expect(fast?.gender, id).toBe(info.gender);
      expect(fast?.accent, id).toBe(info.accent);
    }
    expect(fastEquivalent("en-US-AvaNeural")).toBe(FAST_EN_DEFAULT);
    expect(fastEquivalent(null)).toBe(FAST_EN_DEFAULT);
  });

  test("mentores: cada mente tem voz rápida do gênero dela; Einstein, Curie e Feynman distintas", () => {
    const female = new Set(["curie", "lovelace", "hypatia"]);
    expect(Object.keys(FAST_EN_MENTOR_VOICES).sort()).toEqual(MINDS.map((mind) => mind.id).sort());
    for (const mind of MINDS) {
      const fast = PIPER_EN_VOICES[FAST_EN_MENTOR_VOICES[mind.id] ?? ""];
      expect(fast?.gender, mind.id).toBe(female.has(mind.id) ? "female" : "male");
      expect(fast?.accent, mind.id).toBe(KOKORO_VOICES[KOKORO_MENTOR_VOICES[mind.id]?.en ?? ""]?.accent);
    }
    const trio = new Set(["einstein", "curie", "feynman"].map((mind) => FAST_EN_MENTOR_VOICES[mind]));
    expect(trio.size).toBe(3);
  });

  test("resolveVoice: no modo rápido o inglês vai para o Piper; uma voz Piper pedida vale sempre", () => {
    expect(resolveVoice("en", "af_heart", undefined, "piper")).toEqual({ lang: "en", engine: "piper", voice: "en_US-lessac-medium" });
    expect(resolveVoice("en", "bm_george", undefined, "piper").voice).toBe("en_GB-alan-medium");
    expect(resolveVoice("en", undefined, "curie", "piper").voice).toBe("en_GB-cori-medium");
    expect(resolveVoice("en-US", undefined, undefined, "piper").voice).toBe(FAST_EN_DEFAULT);
    expect(resolveVoice("en", "en_US-ryan-medium")).toEqual({ lang: "en", engine: "piper", voice: "en_US-ryan-medium" });
    // natural (padrão): nada muda para quem já usava
    expect(resolveVoice("en", "af_heart")).toEqual({ lang: "en", engine: "kokoro", voice: "af_heart" });
    // as vozes rápidas não valem fora do inglês, e os outros idiomas não mudam
    expect(resolveVoice("de", "en_US-ryan-medium", undefined, "piper").voice).toBe("de_DE-thorsten-medium");
    expect(resolveVoice("ja", undefined, undefined, "piper").engine).toBe("webspeech");
    expect(isFastEnglishVoice("de_DE-thorsten-medium")).toBe(false);
  });
});

test.describe("Narrador: voz natural x rápida em inglês", () => {
  test.afterEach(() => {
    resetSpeed();
    kv.delete("prosa.narrator.v1");
  });

  test("cada modo lembra a sua escolha; a rápida segue a natural escolhida", () => {
    resetSpeed();
    setNarratorVoice("en", "bm_george");
    expect(narratorVoice("en")).toBe("bm_george");
    expect(fastNarratorVoice()).toBe("en_GB-alan-medium");
    speechService.setSpeedPreference("fast");
    expect(voicesFor("en").map((voice) => voice.engine)).toEqual(["piper", "piper", "piper", "piper"]);
    expect(narratorVoice("en")).toBe("en_GB-alan-medium");
    setNarratorVoice("en", "en_US-lessac-medium");
    expect(narratorVoice("en")).toBe("en_US-lessac-medium");
    speechService.setSpeedPreference("natural");
    expect(narratorVoice("en")).toBe("bm_george");
    expect(voicesFor("en").every((voice) => voice.engine === "kokoro")).toBe(true);
    // ids de outro idioma continuam recusados
    setNarratorVoice("en", "de_DE-thorsten-medium");
    expect(narratorVoice("en")).toBe("bm_george");
  });
});

test.describe("Worker de runtime: vozes rápidas, WebGPU e ORT", () => {
  test("o mapa <fast-en-voices> do .js é idêntico ao do .ts", () => {
    const source = read("public/workers/ttsWorker.js");
    const start = source.indexOf("// <fast-en-voices>");
    const end = source.indexOf("// </fast-en-voices>");
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const block = source.slice(start, end).replace(/^export const /gm, "const ");
    const runtime = new Function(`${block}\nreturn PIPER_EN_VOICES;`)() as unknown;
    expect(runtime).toEqual(PIPER_EN_VOICES);
  });

  test("Kokoro: fp32 no WebGPU (recomendação do kokoro-js), q8 no WASM, com volta ao WASM", () => {
    const source = read("public/workers/ttsWorker.js");
    expect(source).toContain('const KOKORO_DTYPE = { webgpu: "fp32", wasm: "q8" };');
    expect(source).toMatch(/if \(device !== "webgpu"\) throw error;[\s\S]*device = "wasm";/);
    expect(source).toContain("audioLooksValid");
  });

  test("modelos Piper antigos (130 símbolos): ids novos caem, c + cedilha volta a ser ç", () => {
    const source = read("public/workers/ttsWorker.js");
    const start = source.indexOf("// <legacy-phonemes>");
    const end = source.indexOf("// </legacy-phonemes>");
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const remap = new Function(`${source.slice(start, end)}\nreturn remapLegacyPhonemeIds;`)() as (ids: number[], maxId: number) => number[];
    // ^ _ g _ ə _ ʃ _ ˈ _ ɪ _ c _ ̧ _ t _ ə _ $   ("Geschichte": a cedilha combinante é 140)
    const geschichte = [1, 0, 66, 0, 59, 0, 96, 0, 120, 0, 74, 0, 16, 0, 140, 0, 32, 0, 59, 0, 2];
    expect(remap(geschichte, 129)).toEqual([1, 0, 66, 0, 59, 0, 96, 0, 120, 0, 74, 0, 40, 0, 32, 0, 59, 0, 2]);
    // til nasal (141) e dígitos (130–139) não existem no modelo antigo: saem com o PAD que os segue
    expect(remap([1, 0, 54, 0, 141, 0, 3, 0, 131, 0, 2], 129)).toEqual([1, 0, 54, 0, 3, 0, 2]);
    // tudo dentro da tabela: nada muda
    expect(remap([1, 0, 16, 0, 40, 0, 2], 129)).toEqual([1, 0, 16, 0, 40, 0, 2]);
    expect(source).toContain("const PIPER_ORT_MODULE_URL = `https://esm.sh/onnxruntime-web@${ORT_VERSION}/es2022/wasm.mjs`;");
  });

  test("o ORT do Piper vem do CDN na mesma versão pinada (o Metro servia o .wasm em minutos)", () => {
    const source = read("public/workers/ttsWorker.js");
    const installed = JSON.parse(read("node_modules/onnxruntime-web/package.json")) as { version: string };
    expect(/const ORT_VERSION = "([^"]+)"/.exec(source)?.[1]).toBe(installed.version);
    expect(source).toContain("const ORT_WASM_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;");
    expect(source).toContain("onnxWasm: ORT_WASM_BASE");
  });
});

test.describe("Aquecimento da voz (fora do navegador)", () => {
  test("japonês usa a voz do sistema; sem Web Worker, nada baixa", async () => {
    await startVoiceWarmup("ja-JP");
    expect(voiceWarmupState("ja").phase).toBe("system");
    await startVoiceWarmup("de");
    expect(voiceWarmupState("de").phase).toBe("unsupported");
    expect(voiceWarmupState("ko").phase).toBe("idle");
    expect(voiceWarmupState("ko")).toBe(voiceWarmupState("ko"));
  });
});
