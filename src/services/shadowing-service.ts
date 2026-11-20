import type { GeminiGateway } from "./gemini-gateway.js";
import type { NeuralVoice } from "./neural-voice.js";
import { cadenceReport } from "./cadence.js";
import { pronunciationReport } from "./levenshtein.js";
import { soundNotes } from "./sound-feedback.js";
import type { PhoneticShadowingResult, ShadowingResult } from "../schemas/shadowing.js";

/** Abaixo disso a frase não foi reconhecida o bastante para julgar ritmo/cadência. */
export const MIN_ACCURACY_FOR_RHYTHM = 30;

export class ShadowingService {
  constructor(
    private readonly gemini: GeminiGateway,
    private readonly neural: NeuralVoice,
  ) {}

  async analyze(input: {
    audio: Buffer;
    filename: string;
    mimeType: string;
    referenceText: string;
    language?: string;
  }): Promise<ShadowingResult> {
    const transcription = await this.gemini.transcribe({
      audio: input.audio,
      filename: input.filename,
      mimeType: input.mimeType,
      ...(input.language ? { language: input.language.slice(0, 2) } : {}),
    });
    return this.report(input.referenceText, transcription, input.language);
  }

  async analyzePhonetic(input: {
    audio: Buffer;
    filename: string;
    mimeType: string;
    referenceText: string;
    language?: string;
  }): Promise<PhoneticShadowingResult> {
    const prosody = await this.gemini.transcribeProsody({
      audio: input.audio,
      filename: input.filename,
      mimeType: input.mimeType,
      referenceText: input.referenceText,
      ...(input.language ? { language: input.language.slice(0, 2) } : {}),
    });
    const base = this.report(input.referenceText, prosody.transcription, input.language);
    // Sem fala reconhecida não há o que pontuar: tudo zero (nada de ritmo "de cortesia").
    if (!prosody.transcription.trim() || base.accuracy_score === 0) {
      return { ...base, accuracy_score: 0, pitch_rhythm_match: 0, cadence_match: 0, bars: [] };
    }
    // Ritmo e cadência só valem quando a frase foi reconhecida em boa parte: o ritmo de
    // outra coisa (ex.: um "Hello" alucinado sobre silêncio) não é o ritmo desta frase.
    if (base.accuracy_score < MIN_ACCURACY_FOR_RHYTHM) {
      return { ...base, pitch_rhythm_match: 0, cadence_match: 0, bars: [] };
    }
    let cadence = { score: prosody.rhythmScore, bars: [] as ReturnType<typeof cadenceReport>["bars"] };
    try {
      const reference = await this.neural.speak({
        text: input.referenceText,
        lang: (input.language ?? "en").slice(0, 2).toLowerCase(),
      });
      cadence = cadenceReport(
        reference.words.map((word) => ({ offsetMs: word.offset_ms })),
        prosody.words.map((word) => ({ durationMs: word.durationMs })),
      );
    } catch {
      cadence = { score: prosody.rhythmScore, bars: [] };
    }
    return {
      ...base,
      pitch_rhythm_match: prosody.rhythmScore,
      cadence_match: cadence.bars.length > 0 ? cadence.score : prosody.rhythmScore,
      bars: cadence.bars,
    };
  }

  async transcribe(input: {
    audio: Buffer;
    filename: string;
    mimeType: string;
    language?: string;
  }): Promise<{ transcription: string }> {
    const transcription = await this.gemini.transcribe({
      audio: input.audio,
      filename: input.filename,
      mimeType: input.mimeType,
      ...(input.language ? { language: input.language.slice(0, 2) } : {}),
    });
    return { transcription };
  }

  private report(referenceText: string, transcription: string, language?: string): ShadowingResult {
    const report = pronunciationReport(referenceText, transcription);
    return {
      transcription,
      accuracy_score: report.accuracyScore,
      mispronounced_words: report.mispronouncedWords,
      sounds: soundNotes(referenceText, transcription, language ?? ""),
    };
  }
}
