import { test, expect } from "@playwright/test";
import { ClipLru, audioCacheKey, type LruEntry } from "@/lib/audio-cache";
import {
  SpeechError,
  buildSpeechUrl,
  clipReferenceBytes,
  estimateSpeechMs,
  estimateTimeline,
  estimateWordMarks,
  isSpeechUrl,
  parseSpeechUrl,
  readClipReference,
  resolveVoice,
  speechService,
  splitSpeechChunks,
  voicedBounds,
  wordSpans,
} from "@/services/speechService";

test.describe("Voz no aparelho: escolha de motor e voz", () => {
  test("cada idioma vai para o seu motor", () => {
    expect(resolveVoice("en-US")).toEqual({ lang: "en", engine: "kokoro", voice: "af_heart" });
    expect(resolveVoice("de")).toEqual({ lang: "de", engine: "piper", voice: "de_DE-thorsten-medium" });
    expect(resolveVoice("ru").engine).toBe("piper");
    expect(resolveVoice("pt-BR").voice).toBe("pt_BR-faber-medium");
    expect(resolveVoice("ja-JP")).toEqual({ lang: "ja", engine: "webspeech", voice: "webspeech:ja-JP" });
  });

  test("voz pedida vale só no idioma dela; id antigo do servidor cai na padrão", () => {
    expect(resolveVoice("en", "bm_george").voice).toBe("bm_george");
    expect(resolveVoice("de", "bm_george").voice).toBe("de_DE-thorsten-medium");
    expect(resolveVoice("fr", "de_DE-kerstin-low").voice).toBe("fr_FR-siwis-medium");
    expect(resolveVoice("en", "en-US-AvaNeural").voice).toBe("af_heart");
    expect(resolveVoice("ja", "webspeech:Microsoft Nanami").voice).toBe("webspeech:Microsoft Nanami");
  });

  test("mentor escolhe a voz quando não há voz pedida", () => {
    expect(resolveVoice("en", undefined, "curie").voice).toBe("bf_emma");
    expect(resolveVoice("ru", undefined, "curie").voice).toBe("ru_RU-irina-medium");
    expect(resolveVoice("fr", undefined, "einstein").voice).toBe("fr_FR-tom-medium");
    expect(resolveVoice("en", "am_puck", "curie").voice).toBe("am_puck");
  });

  test("idioma sem voz no aparelho é um erro honesto", () => {
    expect(() => resolveVoice("ko")).toThrow(SpeechError);
    try {
      resolveVoice("ko");
    } catch (caught) {
      expect((caught as SpeechError).code).toBe("unsupported-language");
      expect((caught as SpeechError).message.length).toBeGreaterThan(5);
    }
  });
});

test.describe("Voz no aparelho: trechos e tempo das palavras", () => {
  test("corta por frase e guarda a posição no texto original", () => {
    const text = "Hello there. How are you today? I am fine!";
    const chunks = splitSpeechChunks(text, 220, 0);
    expect(chunks.map((chunk) => chunk.text)).toEqual(["Hello there.", "How are you today?", "I am fine!"]);
    for (const chunk of chunks) {
      expect(text.slice(chunk.start, chunk.end)).toBe(chunk.text);
    }
  });

  test("junta frases curtas até o limite e corta frases longas em orações e palavras", () => {
    const merged = splitSpeechChunks("Hi. Yes. No.", 220, 90);
    expect(merged).toHaveLength(1);
    const long = `${"word ".repeat(80).trim()}, and then ${"more ".repeat(60).trim()}.`;
    const pieces = splitSpeechChunks(long, 120, 0);
    expect(pieces.length).toBeGreaterThan(2);
    for (const piece of pieces) {
      expect(piece.text.length).toBeLessThanOrEqual(120);
      expect(long.slice(piece.start, piece.end)).toBe(piece.text);
    }
  });

  test("japonês corta em 。 sem espaço e pontuação solta não vira trecho", () => {
    const chunks = splitSpeechChunks("こんにちは。今日は一緒に読みます。", 220, 0);
    expect(chunks.map((chunk) => chunk.text)).toEqual(["こんにちは。", "今日は一緒に読みます。"]);
    expect(splitSpeechChunks("— … —")).toEqual([]);
  });

  test("palavras: por espaço; japonês pelo segmentador", () => {
    expect(wordSpans("The cat sat.", "en").map((word) => word.text)).toEqual(["The", "cat", "sat."]);
    const ja = wordSpans("今日は一緒に読みます", "ja");
    expect(ja.length).toBeGreaterThan(1);
    expect(ja.map((word) => word.text).join("")).toBe("今日は一緒に読みます");
  });

  test("marcas crescem com o texto e respeitam o início de cada trecho", () => {
    const text = "One two three. Four five six.";
    const chunks = splitSpeechChunks(text, 220, 0);
    const marks = estimateWordMarks(text, "en", chunks, [
      { startMs: 0, durationMs: 1000, voicedStartMs: 100, voicedEndMs: 900 },
      { startMs: 1000, durationMs: 2000 },
    ]);
    expect(marks.map((mark) => mark.text)).toEqual(["One", "two", "three.", "Four", "five", "six."]);
    expect(marks[0]?.offsetMs).toBe(100);
    expect(marks[3]?.offsetMs).toBe(1000);
    for (let index = 1; index < marks.length; index += 1) {
      expect(marks[index]!.offsetMs).toBeGreaterThanOrEqual(marks[index - 1]!.offsetMs);
    }
    expect(marks[5]!.offsetMs).toBeLessThan(3000);
    expect(marks[4]?.charIndex).toBe(text.indexOf("five"));
  });

  test("silêncio das pontas detectado no PCM", () => {
    const samples = new Float32Array(24000);
    samples.fill(0.3, 2400, 21600);
    const bounds = voicedBounds(samples, 24000);
    expect(Math.round(bounds.startMs)).toBe(100);
    expect(Math.round(bounds.endMs)).toBe(900);
    expect(voicedBounds(new Float32Array(100), 1000)).toEqual({ startMs: 0, endMs: 100 });
  });

  test("duração estimada da fala do sistema cresce com o texto", () => {
    expect(estimateSpeechMs("こんにちは。今日は一緒に読みます。", "ja")).toBeGreaterThan(estimateSpeechMs("こんにちは。", "ja"));
  });
});

test.describe("Voz no aparelho: URLs e referências de clipe", () => {
  test("speech: guarda idioma, voz e texto", () => {
    const url = buildSpeechUrl("ja-JP", "webspeech:Microsoft Nanami Online (Natural)", "今日は & 明日?");
    expect(isSpeechUrl(url)).toBe(true);
    expect(parseSpeechUrl(url)).toEqual({ lang: "ja", voice: "webspeech:Microsoft Nanami Online (Natural)", text: "今日は & 明日?" });
    expect(parseSpeechUrl("speech:ja?voice=x&text=")).toBeNull();
    expect(isSpeechUrl("blob:http://x/1")).toBe(false);
  });

  test("referência de clipe ida e volta; bytes de áudio não são referência", () => {
    const ref = clipReferenceBytes("blob:http://127.0.0.1:8081/abc");
    expect(readClipReference(ref)?.url).toBe("blob:http://127.0.0.1:8081/abc");
    const segment = clipReferenceBytes("blob:http://x/seg", { temp: true, estStartMs: 1200, estEndMs: 2400, estTotalMs: 9000 });
    expect(readClipReference(segment)).toEqual({ url: "blob:http://x/seg", temp: true, estStartMs: 1200, estEndMs: 2400, estTotalMs: 9000 });
    expect(readClipReference(new TextEncoder().encode("prosa-clip:speech:ja?voice=v&text=t"))?.url).toBe("speech:ja?voice=v&text=t");
    expect(readClipReference(new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBeNull();
    expect(readClipReference(new Uint8Array([1]))).toBeNull();
    expect(readClipReference(new TextEncoder().encode("prosa-clip:{broken"))).toBeNull();
  });

  test("linha do tempo: trechos prontos com duração real, o resto por caractere", () => {
    const text = "Short one. A sentence that is twice as long.";
    const chunks = splitSpeechChunks(text, 220, 0);
    expect(chunks).toHaveLength(2);
    const timeline = estimateTimeline(chunks, [1000]);
    expect(timeline[0]).toEqual({ startMs: 0, durationMs: 1000 });
    expect(timeline[1]?.startMs).toBe(1000);
    const perChar = 1000 / (chunks[0]?.text.length ?? 1);
    expect(timeline[1]?.durationMs).toBeCloseTo((chunks[1]?.text.length ?? 0) * perChar, 5);
    expect(estimateTimeline(chunks, [])[0]?.durationMs).toBeGreaterThan(0);
  });

  test("sem Worker (Node) a síntese falha com erro honesto, sem travar", async () => {
    await expect(speechService.synthesize("Hello there.", "en")).rejects.toMatchObject({ code: "engine-unavailable" });
    await expect(speechService.synthesize("   ", "en")).rejects.toMatchObject({ code: "empty-text" });
    const clip = await speechService.synthesize("こんにちは。", "ja");
    expect(clip.engine).toBe("webspeech");
    expect(isSpeechUrl(clip.url)).toBe(true);
    expect(clip.words.length).toBeGreaterThan(0);
  });

  test("pedidos iguais em voo viram a mesma promessa", async () => {
    const before = speechService.stats().dedupes;
    const first = speechService.synthesize("同じ文です。", "ja");
    const second = speechService.synthesize("同じ文です。", "ja");
    const [a, b] = await Promise.all([first, second]);
    expect(a.url).toBe(b.url);
    expect(speechService.stats().dedupes).toBe(before + 1);
  });
});

test.describe("Cache LRU dos clipes", () => {
  test("despeja o mais antigo por quantidade e por bytes, avisando cada saída", () => {
    const evicted: string[] = [];
    const lru = new ClipLru<string>(3, 100, (entry: LruEntry<string>) => evicted.push(entry.key));
    lru.set("a", "A", 10);
    lru.set("b", "B", 10);
    lru.set("c", "C", 10);
    expect(lru.get("a")).toBe("A");
    lru.set("d", "D", 10);
    expect(evicted).toEqual(["b"]);
    lru.set("e", "E", 90);
    expect(lru.bytes).toBeLessThanOrEqual(100);
    expect(lru.has("e")).toBe(true);
    expect(evicted).toContain("a");
  });

  test("clipe em uso (preso) não sai; sai quando solto", () => {
    const evicted: string[] = [];
    const lru = new ClipLru<string>(1, 1_000, (entry) => evicted.push(entry.key));
    lru.set("playing", "P", 1);
    lru.pin("playing");
    lru.set("next", "N", 1);
    expect(lru.has("playing")).toBe(true);
    expect(lru.has("next")).toBe(true);
    expect(evicted).toEqual([]);
    lru.unpin("playing");
    expect(evicted).toEqual(["playing"]);
    expect(lru.size).toBe(1);
    expect(lru.has("next")).toBe(true);
  });

  test("o clipe recém-guardado nunca é despejado na hora, mesmo maior que o limite", () => {
    const evicted: string[] = [];
    const lru = new ClipLru<string>(4, 50, (entry) => evicted.push(entry.key));
    lru.set("small", "S", 10);
    lru.set("huge", "H", 80);
    expect(lru.has("huge")).toBe(true);
    expect(evicted).toEqual(["small"]);
  });

  test("chave do cache depende de texto, idioma e voz", () => {
    const base = audioCacheKey("Hello.", "en", "af_heart");
    expect(audioCacheKey("Hello.", "en", "af_heart")).toBe(base);
    expect(audioCacheKey("Hello.", "en", "bm_george")).not.toBe(base);
    expect(audioCacheKey("Hello.", "de", "af_heart")).not.toBe(base);
    expect(audioCacheKey("Hello!", "en", "af_heart")).not.toBe(base);
  });
});
