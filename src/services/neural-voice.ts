import { createHash } from "node:crypto";
import type { Redis } from "ioredis";
import { readSse } from "../http/sse.js";
import { AppError } from "../http/errors.js";
import { neuralSpeechSchema, type SpeakBody, type SpeakStreamBody, type WordMark } from "../schemas/speech.js";
import { resolveNarrationVoice } from "./voice-catalog.js";
import type { UsageMeter } from "./usage-meter.js";

export interface SpokenAudio {
  id: string;
  audioUrl: string;
  words: WordMark[];
}

export type NeuralStreamEvent =
  | { type: "audio"; bytes: Buffer }
  | { type: "word"; word: WordMark }
  | { type: "done"; id: string; audioUrl: string }
  | { type: "error"; message: string };

const CACHE_CHUNK = 16_384;

export class NeuralVoice {
  constructor(
    private readonly redis: Redis,
    private readonly baseUrl: string,
    private readonly ttlSeconds: number,
    private readonly onSynthesize?: (ok: boolean, message: string) => void,
    private readonly usage?: UsageMeter,
  ) {}

  async speak(input: SpeakBody): Promise<SpokenAudio> {
    const voice = resolveNarrationVoice(input.lang, input.voice);
    const id = this.idFor(input.lang, voice.id, input.text);
    const cached = await this.readCached(id);
    if (cached) {
      this.noteAudioCache();
      return cached;
    }

    try {
      const spoken = await this.synthesize(input, voice.id);
      const audio = Buffer.from(spoken.audio_base64, "base64");
      if (audio.length === 0) {
        throw new AppError(502, "Neural voice returned no audio");
      }
      await this.store(id, audio, spoken.words);
      this.onSynthesize?.(true, `Synthesized ${input.lang}`);
      this.noteAudioEdge();
      return {
        id,
        audioUrl: this.publicPath(id),
        words: spoken.words,
      };
    } catch (error) {
      this.onSynthesize?.(false, error instanceof Error ? error.message : "Neural voice failed");
      throw error;
    }
  }

  async *stream(input: SpeakStreamBody, signal?: AbortSignal): AsyncGenerator<NeuralStreamEvent> {
    const voice = resolveNarrationVoice(input.lang, input.voice);
    const id = this.idFor(input.lang, voice.id, input.text);
    const cached = await this.readCached(id);
    if (cached) {
      this.noteAudioCache();
      const audio = await this.read(id);
      if (audio) {
        for (const word of cached.words) {
          yield { type: "word", word };
        }
        for (let offset = 0; offset < audio.length; offset += CACHE_CHUNK) {
          if (signal?.aborted) {
            return;
          }
          yield { type: "audio", bytes: audio.subarray(offset, offset + CACHE_CHUNK) };
        }
        yield { type: "done", id, audioUrl: this.publicPath(id) };
        return;
      }
    }

    const audio = new Array<Buffer>();
    const words: WordMark[] = [];
    let failed = false;
    try {
      for await (const event of this.synthesizeStream(input, voice.id, signal)) {
        if (signal?.aborted) {
          return;
        }
        if (event.type === "audio") {
          audio.push(event.bytes);
          yield event;
          continue;
        }
        if (event.type === "word") {
          words.push(event.word);
          yield event;
          continue;
        }
        if (event.type === "error") {
          failed = true;
          yield event;
          return;
        }
      }
      const clip = Buffer.concat(audio);
      if (clip.length === 0) {
        failed = true;
        yield { type: "error", message: "Neural voice returned no audio" };
        return;
      }
      await this.store(id, clip, words);
      this.onSynthesize?.(true, `Streamed ${input.lang}`);
      this.noteAudioEdge();
      yield { type: "done", id, audioUrl: this.publicPath(id) };
    } catch {
      failed = true;
      yield { type: "error", message: "Neural voice is unavailable" };
    } finally {
      if (failed) {
        this.onSynthesize?.(false, "Neural voice failed");
      }
    }
  }

  async speakMany(inputs: SpeakBody[]): Promise<SpokenAudio[]> {
    const results = new Array<SpokenAudio>(inputs.length);
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < inputs.length) {
        const index = cursor;
        cursor += 1;
        const input = inputs[index];
        if (input) {
          results[index] = await this.speak(input);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, inputs.length) }, () => worker()));
    return results;
  }

  async read(id: string): Promise<Buffer | null> {
    if (!/^[a-f0-9]{64}$/.test(id)) {
      return null;
    }
    const audio = await this.redis.getBuffer(this.audioKey(id));
    if (!audio || audio.length === 0) {
      return null;
    }
    return audio;
  }

  private async readCached(id: string): Promise<SpokenAudio | null> {
    const audio = await this.redis.getBuffer(this.audioKey(id));
    if (!audio || audio.length === 0) {
      return null;
    }
    return {
      id,
      audioUrl: this.publicPath(id),
      words: await this.readWords(this.wordsKey(id)),
    };
  }

  private async store(id: string, audio: Buffer, words: WordMark[]): Promise<void> {
    await this.redis.set(this.audioKey(id), audio, "EX", this.ttlSeconds);
    await this.redis.set(this.wordsKey(id), JSON.stringify(words), "EX", this.ttlSeconds);
  }

  private idFor(lang: string, voiceId: string, text: string): string {
    return createHash("sha256").update(`${lang}\n${voiceId}\n${text}`).digest("hex");
  }

  private async synthesize(input: SpeakBody, voiceId: string): Promise<{ audio_base64: string; words: WordMark[] }> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/v1/speak`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: input.text, lang: input.lang, voice: voiceId }),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      throw new AppError(502, "Neural voice is unavailable", { cause: error });
    }
    if (!response.ok) {
      throw new AppError(502, "Neural voice is unavailable");
    }
    const parsed = neuralSpeechSchema.safeParse(await response.json());
    if (!parsed.success) {
      throw new AppError(502, "Neural voice returned an unexpected response");
    }
    return parsed.data;
  }

  private async *synthesizeStream(input: SpeakStreamBody, voiceId: string, signal?: AbortSignal): AsyncGenerator<NeuralStreamEvent> {
    const timeout = AbortSignal.timeout(90_000);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/v1/speak/stream`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ text: input.text, lang: input.lang, voice: voiceId }),
        signal: combined,
      });
    } catch (error) {
      throw new AppError(502, "Neural voice is unavailable", { cause: error });
    }
    if (!response.ok || !response.body) {
      throw new AppError(502, "Neural voice is unavailable");
    }
    for await (const frame of readSse(response.body)) {
      if (frame.event === "audio") {
        const bytes = Buffer.from(frame.data, "base64");
        if (bytes.length > 0) {
          yield { type: "audio", bytes };
        }
        continue;
      }
      if (frame.event === "word") {
        try {
          const parsed = JSON.parse(frame.data) as { text?: string; offset_ms?: number };
          if (typeof parsed.text === "string" && parsed.text.length > 0 && typeof parsed.offset_ms === "number") {
            yield { type: "word", word: { text: parsed.text, offset_ms: parsed.offset_ms } };
          }
        } catch {
          continue;
        }
        continue;
      }
      if (frame.event === "error") {
        yield { type: "error", message: "Neural voice is unavailable" };
        return;
      }
    }
  }

  private async readWords(key: string): Promise<WordMark[]> {
    const raw = await this.redis.get(key);
    if (!raw) {
      return [];
    }
    try {
      const parsed = neuralSpeechSchema.shape.words.safeParse(JSON.parse(raw) as unknown);
      return parsed.success ? parsed.data : [];
    } catch {
      return [];
    }
  }

  private audioKey(id: string): string {
    return `prosa:neural:v1:${id}`;
  }

  private wordsKey(id: string): string {
    return `prosa:neural:v1:${id}:words`;
  }

  private publicPath(id: string): string {
    return `/api/v1/audio/neural/${id}`;
  }

  private noteAudioCache(): void {
    void this.usage?.record({ task: "audio", provider: "cache", lane: "full", cached: true });
  }

  private noteAudioEdge(): void {
    void this.usage?.record({ task: "audio", provider: "edge", lane: "full", cached: false });
  }
}
