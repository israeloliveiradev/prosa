import { createHash } from "node:crypto";
import type { Redis } from "ioredis";
import { AppError } from "../http/errors.js";
import { neuralSpeechSchema, type SpeakBody, type WordMark } from "../schemas/speech.js";
import { resolveNarrationVoice } from "./voice-catalog.js";

export interface SpokenAudio {
  id: string;
  audioUrl: string;
  words: WordMark[];
}

export class NeuralVoice {
  constructor(
    private readonly redis: Redis,
    private readonly baseUrl: string,
    private readonly ttlSeconds: number,
    private readonly onSynthesize?: (ok: boolean, message: string) => void,
  ) {}

  async speak(input: SpeakBody): Promise<SpokenAudio> {
    const voice = resolveNarrationVoice(input.lang, input.voice);
    const id = createHash("sha256").update(`${input.lang}\n${voice.id}\n${input.text}`).digest("hex");
    const audioKey = this.audioKey(id);
    const wordsKey = this.wordsKey(id);
    const cached = await this.redis.getBuffer(audioKey);
    if (cached && cached.length > 0) {
      return {
        id,
        audioUrl: this.publicPath(id),
        words: await this.readWords(wordsKey),
      };
    }

    try {
      const spoken = await this.synthesize(input, voice.id);
      const audio = Buffer.from(spoken.audio_base64, "base64");
      if (audio.length === 0) {
        throw new AppError(502, "Neural voice returned no audio");
      }
      await this.redis.set(audioKey, audio, "EX", this.ttlSeconds);
      await this.redis.set(wordsKey, JSON.stringify(spoken.words), "EX", this.ttlSeconds);
      this.onSynthesize?.(true, `Synthesized ${input.lang}`);
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
}
