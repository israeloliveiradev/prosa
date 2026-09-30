import { GoogleGenAI, type ContentListUnion } from "@google/genai";
import { z } from "zod";
import { AppError } from "../http/errors.js";
import {
  journalEvaluationSchema,
  type EvaluateJournalBody,
  type JournalEvaluation,
} from "../schemas/journal.js";
import { ownlifeNoteSchema } from "../schemas/ownlife.js";
import { lessonPayloadSchema, type LessonPayload, type LessonProfile } from "../schemas/lesson.js";
import { topicMatrixSchema } from "../schemas/onboarding.js";
import { grammarModelSchema, grammarVaryModelSchema, type GrammarBlock } from "../schemas/grammar.js";
import { reconstructionReportSchema, type ReconstructionBody, type ReconstructionReport } from "../schemas/reconstruction.js";
import { personaReplySchema } from "../schemas/persona.js";
import { proseReplySchema } from "../schemas/prose.js";
import { mnemonicResponseSchema } from "../schemas/srs.js";
import { frequentVerbs, type CognateAnchor } from "./cognates.js";
import { lessonLeaksSpanish, namedLang, throughLabel } from "./through-lang.js";
import { groqTranscribe, openaiCompatibleJson, scrubSecrets, textOnlyPrompt } from "./chat-fallback.js";
import type { CostLane, UsageNote } from "./session-cost.js";
import { lessonVoicePrompt, DEFAULT_CAST } from "./minds.js";
import { modelBusy } from "./ops.js";

const LESSON_INSTRUCTIONS = [
  "Write one daily language lesson.",
  "story_text is 130 to 170 words in the target language, at the requested CEFR level, about the topic.",
  "translation is the complete story in the native language, the language the learner studies through.",
  "vocabulary.translation is also in that native language. Never write Spanish when the native language is Brazilian Portuguese: use ção and são, never ción, sión or ñ.",
  "vocabulary contains 6 to 8 items that appear in the story. example_sentence is in the target language.",
  "Two of those vocabulary items are chunks of two or three words, not single words.",
  "journal_prompt asks the learner to answer in the target language in two or three sentences.",
].join(" ");

const COGNATE_INSTRUCTIONS = [
  LESSON_INSTRUCTIONS,
  "This is an A1 cognate lesson.",
  "Build the story from the listed true cognates plus the high-frequency verbs, articles and pronouns.",
  "Do not add rare words outside that set.",
  "Do not use a false friend.",
].join(" ");

const RECONSTRUCTION_INSTRUCTIONS = [
  "The learner saw only the translation and rewrote the story in the target language.",
  "Compare the attempt with the ideal story. Meaning and natural wording matter more than a word-for-word copy.",
  "score is an integer from 0 to 100.",
  "grammar lists direct grammatical mistakes. Each reason is one short sentence in the through language. Use an empty array when grammar is already sound.",
  "literals lists calques: wording translated word for word from the through language that a native would say differently. phrase is the learner's wording. native_alternative is the natural target-language wording. reason is one short sentence in the through language. Use an empty array when nothing is a calque.",
].join(" ");

const RECONSTRUCTION_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    grammar: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          original: { type: "string" },
          corrected: { type: "string" },
          reason: { type: "string" },
        },
        required: ["original", "corrected", "reason"],
      },
    },
    literals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          phrase: { type: "string" },
          native_alternative: { type: "string" },
          reason: { type: "string" },
        },
        required: ["phrase", "native_alternative", "reason"],
      },
    },
  },
  required: ["score", "grammar", "literals"],
};

const DUEL_INSTRUCTIONS = [
  "Write twelve cloze drills for a language learner.",
  "Each prompt is one short sentence in the target language, at the CEFR level, tied to the learner interests.",
  "When weak categories are listed, most drills must test those categories. When the list is empty, use everyday connectors.",
  "The missing piece is a connector or another high-frequency word, written as exactly ____.",
  "options has exactly four short strings in the target language. Exactly one option completes the sentence.",
  "answer is the index of that option: 0, 1, 2, or 3.",
  "The other options are the same kind of word and must not also be correct.",
  "Do not translate the sentences or the options.",
].join(" ");

const DUEL_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    drills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          prompt: { type: "string" },
          options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
          answer: { type: "integer", minimum: 0, maximum: 3 },
        },
        required: ["prompt", "options", "answer"],
      },
    },
  },
  required: ["drills"],
};

const PLACEMENT_INSTRUCTIONS = [
  "Write a CEFR placement test with exactly 18 multiple-choice items.",
  "Exactly 3 items for each band: A1, A2, B1, B2, C1, C2.",
  "kind is vocab, grammar, or reading. Mix the three kinds inside each band.",
  "id is a short unique slug.",
  "prompt is the stem. hint is one short instruction in the through language.",
  "options has exactly four strings. Exactly one is correct. answer is 0, 1, 2, or 3.",
  "vocab: prompt is a word or short phrase in the target language; options are meanings in the through language.",
  "grammar: prompt is a sentence in the target language with ____ ; options are in the target language.",
  "reading: prompt is one or two sentences in the target language; hint asks a comprehension question in the through language; options are in the through language.",
  "Do not reuse the same word as the tested item.",
].join(" ");

const PLACEMENT_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          band: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
          kind: { type: "string", enum: ["vocab", "grammar", "reading"] },
          prompt: { type: "string" },
          hint: { type: "string" },
          options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
          answer: { type: "integer", minimum: 0, maximum: 3 },
        },
        required: ["id", "band", "kind", "prompt", "hint", "options", "answer"],
      },
    },
  },
  required: ["items"],
};

const JOURNAL_INSTRUCTIONS = [
  "Correct a language learner's journal entry.",
  "score is an integer from 0 to 100 for meaning, grammar and naturalness at the learner's CEFR level.",
  "corrections lists only real mistakes. Use an empty array when the text is already appropriate.",
  "kind is a short mistake category in the native language, such as verb tense or agreement. Use an empty string when there is no category.",
  "reason is one short sentence in the native language. Do not put the corrected sentence inside reason.",
  "native_upgrade rewrites the entry in the target language, natural for a speaker slightly above the learner's level, keeping the same meaning.",
].join(" ");

const LESSON_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    story_text: { type: "string" },
    translation: { type: "string" },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          word: { type: "string" },
          translation: { type: "string" },
          example_sentence: { type: "string" },
        },
        required: ["word", "translation", "example_sentence"],
      },
    },
    journal_prompt: { type: "string" },
  },
  required: ["title", "story_text", "translation", "vocabulary", "journal_prompt"],
};

const JOURNAL_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "number" },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          original: { type: "string" },
          corrected: { type: "string" },
          reason: { type: "string" },
          kind: { type: "string" },
        },
        required: ["original", "corrected", "reason", "kind"],
      },
    },
    native_upgrade: { type: "string" },
  },
  required: ["score", "corrections", "native_upgrade"],
};

function withJournalKinds(completion: unknown): unknown {
  if (!completion || typeof completion !== "object") {
    return completion;
  }
  const record = completion as { corrections?: unknown };
  if (!Array.isArray(record.corrections)) {
    return completion;
  }
  return {
    ...record,
    corrections: record.corrections.map((item) => {
      if (!item || typeof item !== "object") {
        return item;
      }
      const row = item as { kind?: unknown };
      return { ...row, kind: typeof row.kind === "string" ? row.kind : "" };
    }),
  };
}

const OWNLIFE_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: { type: "string" },
    through_note: { type: "string" },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          word: { type: "string" },
          translation: { type: "string" },
          example_sentence: { type: "string" },
        },
        required: ["word", "translation", "example_sentence"],
      },
    },
    mission: {
      type: "object",
      additionalProperties: false,
      properties: {
        prompt: { type: "string" },
        hold: { type: "string" },
      },
      required: ["prompt", "hold"],
    },
  },
  required: ["text", "through_note", "vocabulary", "mission"],
};

const TRANSCRIPTION_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    transcription: { type: "string" },
  },
  required: ["transcription"],
};

const PROSODY_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    transcription: { type: "string" },
    rhythm_score: { type: "integer", minimum: 0, maximum: 100 },
    words: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          duration_ms: { type: "integer", minimum: 0, maximum: 20000 },
        },
        required: ["text", "duration_ms"],
      },
    },
  },
  required: ["transcription", "rhythm_score"],
};

const TOPIC_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    topics: {
      type: "array",
      minItems: 4,
      maxItems: 8,
      items: { type: "string" },
    },
  },
  required: ["topics"],
};

const GEMINI_AUDIO_MIME_TYPES: Record<string, string> = {
  "audio/m4a": "audio/mp4",
  "audio/mp3": "audio/mpeg",
  "audio/mp4": "audio/mp4",
  "audio/mpeg": "audio/mpeg",
  "audio/ogg": "audio/ogg",
  "audio/wav": "audio/wav",
  "audio/webm": "audio/webm",
  "audio/x-m4a": "audio/mp4",
  "audio/x-wav": "audio/wav",
};

const EXTENSION_MIME_TYPES: Record<string, string> = {
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
  wav: "audio/wav",
  webm: "audio/webm",
};

export interface ModelFallbacks {
  groqApiKey: string;
  groqModel: string;
  openrouterApiKey: string;
  openrouterModel: string;
  referer: string;
}

const DEFAULT_FALLBACKS: ModelFallbacks = {
  groqApiKey: "",
  groqModel: "llama-3.3-70b-versatile",
  openrouterApiKey: "",
  openrouterModel: "openai/gpt-4o-mini",
  referer: "http://localhost:8081",
};

export class GeminiGateway {
  private client: GoogleGenAI | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly onFailure?: (input: { busy: boolean; message: string }) => void,
    private readonly fallbacks: ModelFallbacks = DEFAULT_FALLBACKS,
    private readonly onFallback?: (provider: "groq" | "openrouter") => void,
    private readonly onUsage?: (note: UsageNote) => void,
  ) {}

  async generateLesson(
    profile: LessonProfile,
    anchors: CognateAnchor[] = [],
    lexicon?: { known: string[]; due: string[]; avoid?: string[] },
  ): Promise<LessonPayload> {
    const through = throughLabel(profile.native_lang);
    const lines = [
      `Target language: ${throughLabel(profile.target_lang)} (${profile.target_lang})`,
      `Native language, the language of every gloss and of translation: ${through} (${profile.native_lang})`,
      `CEFR level: ${profile.level}`,
      `Topic: ${profile.topic}`,
    ];
    if (profile.native_lang === "pt") {
      lines.push("Glosses are Brazilian Portuguese. Extração, não Extracción. Percepção, não Percepción.");
    }
    if (profile.interests.length > 0) {
      lines.push(`Learner interests: ${profile.interests.join(", ")}`);
      lines.push("Weave those interests into the story when they fit the topic.");
    }
    lines.push(lessonVoicePrompt(profile.minds ?? DEFAULT_CAST));
    const trueCognates = anchors.filter((item) => item.kind === "true");
    const falseFriends = anchors.filter((item) => item.kind === "false");
    const instruction = trueCognates.length >= 8 ? COGNATE_INSTRUCTIONS : LESSON_INSTRUCTIONS;
    if (lexicon && lexicon.known.length > 0) {
      lines.push(
        `Words and chunks the learner already knows. About 95 to 98 percent of the story should be these, plus common function words: ${lexicon.known.slice(0, 100).join(", ")}.`,
      );
      lines.push("The vocabulary list is the only place for new words. Keep new words to at most six.");
    }
    if (lexicon && lexicon.due.length > 0) {
      lines.push(`These phrases must appear naturally in the story: ${lexicon.due.slice(0, 6).join(" | ")}.`);
    }
    if (lexicon?.avoid && lexicon.avoid.length > 0) {
      lines.push(`Do not use these words: ${lexicon.avoid.slice(0, 16).join(", ")}.`);
    }
    if (trueCognates.length >= 8) {
      lines.push(`High-frequency verbs you may use: ${frequentVerbs(profile.target_lang)}.`);
      lines.push(
        `True cognates, written as target = familiar: ${trueCognates.map((item) => `${item.word} = ${item.familiar}`).join(", ")}.`,
      );
      if (falseFriends.length > 0) {
        lines.push(
          `False friends to avoid: ${falseFriends.map((item) => `${item.word} is not ${item.familiar}; it means ${item.gloss}`).join("; ")}.`,
        );
      }
    }
    const completion = await this.generateStructured({
      systemInstruction: instruction,
      contents: lines.join("\n"),
      schema: LESSON_RESPONSE_SCHEMA,
      maxOutputTokens: 1_400,
      temperature: 0.4,
      task: "lesson",
      lane: "full",
    });
    const parsed = lessonPayloadSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Lesson response failed validation");
    }
    if (profile.native_lang === "pt") {
      return this.polishPortugueseLesson(parsed.data, instruction, lines.join("\n"), {
        temperature: 0.3,
        task: "lesson",
        lane: "full",
      });
    }
    return parsed.data;
  }

  async evaluateJournal(input: EvaluateJournalBody): Promise<JournalEvaluation> {
    const completion = await this.generateStructured({
      systemInstruction: JOURNAL_INSTRUCTIONS,
      contents: [
        `Target language: ${namedLang(input.target_lang)}`,
        `Native language, the language of every gloss: ${namedLang(input.native_lang)}`,
        `CEFR level: ${input.level}`,
        `Prompt: ${input.journal_prompt}`,
        `Learner text: ${input.text}`,
      ].join("\n"),
      schema: JOURNAL_RESPONSE_SCHEMA,
      maxOutputTokens: 900,
      temperature: 0.2,
    });
    const parsed = journalEvaluationSchema.safeParse(withJournalKinds(completion));
    if (!parsed.success) {
      throw new AppError(502, "Journal response failed validation");
    }
    return parsed.data;
  }

  async calibrateLife(input: {
    targetLang: string;
    nativeLang: string;
    level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
    source: string;
  }) {
    const completion = await this.generateStructured({
      systemInstruction: [
        "Rewrite the learner's own text at the requested CEFR level in the target language.",
        "Keep the facts. Do not invent people, prices or events that are not in the source.",
        "through_note is one sentence in the native language explaining a useful change.",
        "vocabulary has 4 to 6 items that appear in the rewrite. example_sentence is in the target language.",
        "mission.prompt is a real-world speaking task of about 20 seconds, in the native language.",
        "mission.hold is a short phrase in the target language the learner must say.",
      ].join(" "),
      contents: [
        `Target language: ${namedLang(input.targetLang)}`,
        `Native language, the language of every gloss: ${namedLang(input.nativeLang)}`,
        `CEFR level: ${input.level}`,
        `Source:\n${input.source}`,
      ].join("\n"),
      schema: OWNLIFE_RESPONSE_SCHEMA,
      maxOutputTokens: 900,
      temperature: 0.3,
    });
    const parsed = ownlifeNoteSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Life note failed validation");
    }
    return parsed.data;
  }

  async reconstruct(input: ReconstructionBody): Promise<ReconstructionReport> {
    const completion = await this.generateStructured({
      systemInstruction: RECONSTRUCTION_INSTRUCTIONS,
      contents: [
        `Target language: ${namedLang(input.target_lang)}`,
        `Through language: ${namedLang(input.through_lang)}`,
        `CEFR level: ${input.level}`,
        `Translation the learner saw:\n${input.translation}`,
        `Ideal story:\n${input.story_text}`,
        `Learner rewrite:\n${input.attempt}`,
      ].join("\n"),
      schema: RECONSTRUCTION_RESPONSE_SCHEMA,
      maxOutputTokens: 1_200,
      temperature: 0.2,
      task: "reconstruct",
      lane: "cheap",
    });
    const parsed = reconstructionReportSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Reconstruction response failed validation");
    }
    return parsed.data;
  }

  async transcribe(input: {
    audio: Buffer;
    filename: string;
    mimeType: string;
    language?: string;
  }): Promise<string> {
    const mimeType = geminiAudioMime(input.mimeType, input.filename);
    const languageLine = input.language ? `Language hint: ${input.language}.` : "Detect the spoken language.";
    try {
      const completion = await this.generateStructured({
        systemInstruction: [
          "Transcribe the spoken words verbatim.",
          languageLine,
          "Do not translate and do not invent words that were not spoken.",
          "If the audio contains no speech, set transcription to an empty string.",
        ].join(" "),
        contents: [
          {
            role: "user",
            parts: [
              { text: "Transcribe this recording." },
              {
                inlineData: {
                  mimeType,
                  data: input.audio.toString("base64"),
                },
              },
            ],
          },
        ],
        schema: TRANSCRIPTION_RESPONSE_SCHEMA,
        maxOutputTokens: 1_000,
        temperature: 0,
      });
      const parsed = transcriptionSchema.safeParse(completion);
      if (!parsed.success) {
        throw new AppError(502, "Transcription response failed validation");
      }
      return parsed.data.transcription.trim();
    } catch (error) {
      if (!this.fallbacks.groqApiKey) {
        throw error;
      }
      const spoken = await groqTranscribe({
        apiKey: this.fallbacks.groqApiKey,
        audio: input.audio,
        filename: input.filename,
        mimeType,
        language: input.language,
      });
      this.onFallback?.("groq");
      return spoken;
    }
  }

  async transcribeProsody(input: {
    audio: Buffer;
    filename: string;
    mimeType: string;
    referenceText: string;
    language?: string;
  }): Promise<{ transcription: string; rhythmScore: number; words: Array<{ text: string; durationMs: number }> }> {
    const mimeType = geminiAudioMime(input.mimeType, input.filename);
    const languageLine = input.language ? `Language hint: ${input.language}.` : "Detect the spoken language.";
    try {
      const completion = await this.generateStructured({
        systemInstruction: [
          "Transcribe the spoken words verbatim.",
          languageLine,
          "Do not translate and do not invent words that were not spoken.",
          "rhythm_score is an integer from 0 to 100 for how closely the pacing and stress follow a natural reading of the reference sentence.",
          "words lists each spoken word with duration_ms, how long that word lasted.",
          "Use an empty words list and rhythm_score 0 when the audio contains no speech.",
        ].join(" "),
        contents: [
          {
            role: "user",
            parts: [
              { text: `Reference sentence:\n${input.referenceText}` },
              {
                inlineData: {
                  mimeType,
                  data: input.audio.toString("base64"),
                },
              },
            ],
          },
        ],
        schema: PROSODY_RESPONSE_SCHEMA,
        maxOutputTokens: 1_000,
        temperature: 0,
      });
      const parsed = prosodySchema.safeParse(completion);
      if (!parsed.success) {
        throw new AppError(502, "Transcription response failed validation");
      }
      return {
        transcription: parsed.data.transcription.trim(),
        rhythmScore: Math.round(parsed.data.rhythm_score),
        words: (parsed.data.words ?? []).map((word) => ({ text: word.text, durationMs: word.duration_ms })),
      };
    } catch (error) {
      if (!this.fallbacks.groqApiKey) {
        throw error;
      }
      const transcription = await groqTranscribe({
        apiKey: this.fallbacks.groqApiKey,
        audio: input.audio,
        filename: input.filename,
        mimeType,
        language: input.language,
      });
      this.onFallback?.("groq");
      return { transcription, rhythmScore: transcription ? 70 : 0, words: [] };
    }
  }

  async duelDrills(input: {
    targetLang: string;
    throughLang: string;
    level: string;
    interests: string[];
    focus: string[];
  }): Promise<{ drills: Array<{ prompt: string; options: string[]; answer: number }> }> {
    const completion = await this.generateStructured({
      systemInstruction: DUEL_INSTRUCTIONS,
      contents: [
        `Target language: ${namedLang(input.targetLang)}`,
        `Through language: ${namedLang(input.throughLang)}`,
        `CEFR level: ${input.level}`,
        `Interests: ${input.interests.length > 0 ? input.interests.join(", ") : "everyday conversation"}`,
        input.focus.length > 0
          ? `Weak categories to hit in most drills: ${input.focus.join(", ")}.`
          : "No weak category yet. Stay with everyday connectors.",
      ].join("\n"),
      schema: DUEL_RESPONSE_SCHEMA,
      maxOutputTokens: 2_200,
      temperature: 0.4,
    });
    const parsed = z
      .object({
        drills: z.array(
          z.object({
            prompt: z.string(),
            options: z.array(z.string()).length(4),
            answer: z.number(),
          }),
        ),
      })
      .safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Duel response failed validation");
    }
    return parsed.data;
  }

  async placementExam(input: {
    targetLang: string;
    throughLang: string;
    interests: string[];
  }): Promise<{ items: Array<{ id: string; band: string; kind: string; prompt: string; hint: string; options: string[]; answer: number }> }> {
    const completion = await this.generateStructured({
      systemInstruction: PLACEMENT_INSTRUCTIONS,
      contents: [
        `Target language: ${namedLang(input.targetLang)}`,
        `Through language: ${namedLang(input.throughLang)}`,
        `Interests: ${input.interests.length > 0 ? input.interests.join(", ") : "everyday life"}`,
        "Cover A1 through C2. Keep options short.",
      ].join("\n"),
      schema: PLACEMENT_RESPONSE_SCHEMA,
      maxOutputTokens: 4_000,
      temperature: 0.35,
    });
    const parsed = z
      .object({
        items: z.array(
          z.object({
            id: z.string(),
            band: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
            kind: z.enum(["vocab", "grammar", "reading"]),
            prompt: z.string(),
            hint: z.string(),
            options: z.array(z.string()).length(4),
            answer: z.number().int().min(0).max(3),
          }),
        ),
      })
      .safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Placement response failed validation");
    }
    return parsed.data;
  }

  async placementBatch(input: {
    targetLang: string;
    throughLang: string;
    band: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
    interests: string[];
    avoid: string[];
  }): Promise<Array<{ id: string; band: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"; kind: "vocab" | "grammar" | "reading" | "listening"; prompt: string; hint: string; options: string[]; answer: number; passage: string; audio_text: string }>> {
    const completion = await this.generateStructured({
      systemInstruction: [
        "Write 8 original CEFR placement items. Do not copy published exams.",
        "Use everyday material: a shop sign, a short email, a timetable, a cafe order, a workplace note.",
        "kind is vocab, grammar, reading, or listening. Include at least two listening items and two reading items.",
        "Most items sit on the requested band. Two items may sit one band away.",
        "vocab tests a word or chunk in the target language. Options are meanings in the through language.",
        "grammar is a gapped sentence in the target language. Options are in the target language.",
        "reading: passage is a short notice in the target language. prompt is the question in the through language. Options are in the through language.",
        "listening: audio_text is one or two sentences to be spoken aloud in the target language. prompt is a question in the through language and must not quote audio_text. Options are in the through language.",
        "hint is one short instruction in the through language.",
        "options has exactly four strings and exactly one is correct. answer is 0, 1, 2, or 3.",
        "id is a short unique slug. Leave passage empty except for reading. Leave audio_text empty except for listening.",
      ].join(" "),
      contents: [
        `Target language: ${namedLang(input.targetLang)}`,
        `Through language: ${namedLang(input.throughLang)}`,
        `Focus band: ${input.band}`,
        `Interests: ${input.interests.length > 0 ? input.interests.join(", ") : "everyday life"}`,
        input.avoid.length > 0 ? `Do not reuse these stems: ${input.avoid.slice(0, 24).join(" | ")}` : "Write fresh stems.",
      ].join("\n"),
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                id: { type: "string" },
                band: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
                kind: { type: "string", enum: ["vocab", "grammar", "reading", "listening"] },
                prompt: { type: "string" },
                hint: { type: "string" },
                passage: { type: "string" },
                audio_text: { type: "string" },
                options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                answer: { type: "integer", minimum: 0, maximum: 3 },
              },
              required: ["id", "band", "kind", "prompt", "hint", "passage", "audio_text", "options", "answer"],
            },
          },
        },
        required: ["items"],
      },
      maxOutputTokens: 4_000,
      temperature: 0.7,
    });
    const parsed = z
      .object({
        items: z.array(
          z.object({
            id: z.string(),
            band: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
            kind: z.enum(["vocab", "grammar", "reading", "listening"]),
            prompt: z.string(),
            hint: z.string(),
            passage: z.string(),
            audio_text: z.string(),
            options: z.array(z.string()).length(4),
            answer: z.number().int().min(0).max(3),
          }),
        ),
      })
      .safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Placement response failed validation");
    }
    return parsed.data.items;
  }

  async suggestTopics(input: {
    interests: string[];
    goal?: string;
    targetLang: string;
    level: string;
  }): Promise<string[]> {
    const completion = await this.generateStructured({
      systemInstruction: [
        "Propose lesson topics for one language learner.",
        "Return 6 short topic titles in the target language.",
        "Each title must be concrete enough to become a 150-word story.",
        "Every topic must connect to the listed interests.",
      ].join(" "),
      contents: [
        `Target language: ${namedLang(input.targetLang)}`,
        `CEFR level: ${input.level}`,
        `Interests: ${input.interests.join(", ")}`,
        input.goal ? `Goal: ${input.goal}` : "Goal: daily conversation",
      ].join("\n"),
      schema: TOPIC_RESPONSE_SCHEMA,
      maxOutputTokens: 500,
      temperature: 0.5,
      task: "topics",
      lane: "cheap",
    });
    const parsed = topicMatrixSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Topic response failed validation");
    }
    return parsed.data.topics;
  }

  async mnemonic(input: {
    targetLang: string;
    nativeLang: string;
    word: string;
    translation: string;
    sentence: string;
    interests: string[];
  }): Promise<{ association_text: string }> {
    const completion = await this.generateStructured({
      systemInstruction: [
        "Create one vivid memory-palace association for a language learner.",
        "Connect the sound of the target word to a concrete object or scene in the native language, or to one of the learner interests.",
        "The scene must be absurd, sensory, and emotional. One paragraph.",
        "association_text is written in the native language.",
        "Do not define the word with a dictionary sentence.",
      ].join(" "),
      contents: [
        `Target language: ${namedLang(input.targetLang)}`,
        `Native language, the language of every gloss: ${namedLang(input.nativeLang)}`,
        `Word: ${input.word}`,
        `Translation: ${input.translation}`,
        `Sentence: ${input.sentence}`,
        `Interests: ${input.interests.join(", ") || "daily life"}`,
      ].join("\n"),
      schema: {
        type: "object",
        properties: { association_text: { type: "string" } },
        required: ["association_text"],
      },
      maxOutputTokens: 400,
      temperature: 0.7,
      task: "mnemonic",
      lane: "cheap",
    });
    const parsed = mnemonicResponseSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Mnemonic response failed validation");
    }
    return parsed.data;
  }

  async deconstructGrammar(input: {
    targetLang: string;
    nativeLang: string;
    level: string;
    sentence: string;
  }): Promise<{ blocks: GrammarBlock[] }> {
    const completion = await this.generateStructured({
      systemInstruction: [
        "Split one target-language sentence into exactly four building blocks, in this order: subject, connector, verb, object.",
        "subject is who or what does the action.",
        "connector is the tense, mood, or auxiliary piece. If the sentence has none, use the smallest grammatical marker that carries time or mode.",
        "verb is the main lexical verb.",
        "object is the complement. If the sentence has none, use a short natural complement that the sentence already implies.",
        "Each block text is a drop-in piece of the target language, not a translation.",
        "Each options list contains the current text plus one or two real alternatives a learner can swap: another subject, another tense, or another object.",
        "Do not explain the grammar.",
      ].join(" "),
      contents: [
        `Target language: ${namedLang(input.targetLang)}`,
        `Native language, the language of every gloss: ${namedLang(input.nativeLang)}`,
        `CEFR level: ${input.level}`,
        `Sentence: ${input.sentence}`,
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          blocks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["subject", "connector", "verb", "object"] },
                text: { type: "string" },
                options: { type: "array", items: { type: "string" } },
              },
              required: ["role", "text", "options"],
            },
          },
        },
        required: ["blocks"],
      },
      maxOutputTokens: 700,
      temperature: 0.2,
      task: "grammar",
      lane: "cheap",
    });
    const parsed = grammarModelSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Grammar response failed validation");
    }
    return parsed.data;
  }

  async varyGrammar(input: {
    targetLang: string;
    level: string;
    blocks: Array<{ role: GrammarBlock["role"]; text: string }>;
  }): Promise<{ sentence: string; blocks: Array<{ role: GrammarBlock["role"]; text: string }> }> {
    const completion = await this.generateStructured({
      systemInstruction: [
        "Rebuild one grammatical sentence in the target language from four blocks: subject, connector, verb, object.",
        "Keep each block's meaning. Adjust only the minimum needed for agreement.",
        "sentence is the full sentence.",
        "blocks echo the four roles with the final text used in the sentence.",
      ].join(" "),
      contents: [
        `Target language: ${namedLang(input.targetLang)}`,
        `CEFR level: ${input.level}`,
        ...input.blocks.map((block) => `${block.role}: ${block.text}`),
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          sentence: { type: "string" },
          blocks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["subject", "connector", "verb", "object"] },
                text: { type: "string" },
              },
              required: ["role", "text"],
            },
          },
        },
        required: ["sentence", "blocks"],
      },
      maxOutputTokens: 500,
      temperature: 0.2,
      task: "grammar",
      lane: "cheap",
    });
    const parsed = grammarVaryModelSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Grammar response failed validation");
    }
    return parsed.data;
  }

  async adaptNews(input: {
    targetLang: string;
    nativeLang: string;
    level: string;
    title: string;
    summary: string;
    published?: string;
  }): Promise<LessonPayload> {
    const instruction = [
      "Turn one current news item into a language lesson.",
      "story_text is 90 to 140 words in the target language, at the requested CEFR level.",
      "Write it as today's briefing. Use only the headline, the summary and the publication date.",
      "Do not invent older events, and do not turn the story into a timeless textbook example.",
      "translation is the complete story in the native language, the language the learner studies through.",
      "vocabulary contains 4 to 6 items that appear in the story.",
      "journal_prompt asks the learner to react in the target language in two sentences.",
    ].join(" ");
    const contents = [
      `Target language: ${namedLang(input.targetLang)}`,
      `Native language, the language of every gloss and of translation: ${namedLang(input.nativeLang)}`,
      `CEFR level: ${input.level}`,
      `Published: ${input.published ?? "today"}`,
      `Headline: ${input.title}`,
      `Summary: ${input.summary || input.title}`,
    ].join("\n");
    const completion = await this.generateStructured({
      systemInstruction: instruction,
      contents,
      schema: LESSON_RESPONSE_SCHEMA,
      maxOutputTokens: 1_400,
      temperature: 0.3,
    });
    const parsed = lessonPayloadSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "News lesson response failed validation");
    }
    if (input.nativeLang === "pt") {
      return this.polishPortugueseLesson(parsed.data, instruction, contents, { temperature: 0.2 });
    }
    return parsed.data;
  }

  async personaReply(input: {
    targetLang: string;
    throughLang: string;
    level: string;
    role: string;
    place: string;
    register: "formal" | "informal";
    opener: string;
    hitch: string;
    history: Array<{ role: "persona" | "learner"; text: string }>;
    userLine: string;
  }): Promise<{ reply: string; tone: "adequate" | "direct" | "informal" | "inadequate"; cultural_note: string }> {
    const through = throughLabel(input.throughLang);
    const completion = await this.generateStructured({
      systemInstruction: [
        "You are one person in a real situation, speaking only the target language.",
        "Stay in the given role and place. Match the requested register: formal uses polite distance, informal uses the casual speech of that place.",
        "There is a real hitch in this scene. Hold it. Do not give the learner what they first asked for. Make them negotiate: another option, another time, or a clear next step.",
        "Do not invent a second hitch. Do not resolve the hitch on the first learner turn.",
        "reply is one to three sentences at the learner CEFR level. Do not translate it. Do not add a teaching note inside the reply.",
        "Judge only the learner's latest line for politeness and cultural fit in this scene.",
        "tone is adequate when the politeness fits, direct when the line is too blunt, informal when it is too casual for this scene, inadequate when a custom of the place is missed.",
        `cultural_note is one or two sentences in ${through}, naming what fit or what to change. It is never empty.`,
      ].join(" "),
      contents: [
        `Target language: ${namedLang(input.targetLang)}`,
        `Through language: ${namedLang(input.throughLang)}`,
        `CEFR level: ${input.level}`,
        `Role: ${input.role}`,
        `Place: ${input.place}`,
        `Register: ${input.register}`,
        `Opening line you already said: ${input.opener}`,
        `Hitch you must hold: ${input.hitch}`,
        ...input.history.map((turn) => `${turn.role}: ${turn.text}`),
        `learner: ${input.userLine}`,
      ].join("\n"),
      schema: {
        type: "object",
        properties: {
          reply: { type: "string" },
          tone: { type: "string", enum: ["adequate", "direct", "informal", "inadequate"] },
          cultural_note: { type: "string" },
        },
        required: ["reply", "tone", "cultural_note"],
      },
      maxOutputTokens: 500,
      temperature: 0.4,
      task: "topics",
      lane: "cheap",
    });
    const parsed = personaReplySchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Persona response failed validation");
    }
    return parsed.data;
  }

  async proseTalk(input: {
    targetLang: string;
    throughLang: string;
    level: string;
    mindName: string;
    mindPrompt: string;
    topic: string;
    story: string;
    history: Array<{ role: "mind" | "learner"; text: string }>;
    userLine: string;
    memory: string;
  }): Promise<{ reply: string; through_note: string; mistake: string; fix: string; facts: string[]; goal: string; thread: string }> {
    const through = throughLabel(input.throughLang);
    const opening = input.history.length === 0 && !input.userLine.trim();
    const completion = await this.generateStructured({
      systemInstruction: [
        `You are ${input.mindName} in a short spoken conversation with a language learner.`,
        input.mindPrompt,
        "Stay in that exact historical personality. Do not become a mascot or a tutor with a clipboard.",
        `Speak only the target language in reply. One to three short sentences at CEFR ${input.level}.`,
        "This is a prosa: a living chat about today's topic, not a quiz and not a role-play in a shop.",
        "Understand what the learner just said and answer it. If the line is ambiguous, ask what they mean before you assume.",
        "Then ask one small follow-up when it helps them keep talking.",
        "Never praise the learner. No 'good job', 'great', 'well done', or the equivalent in any language.",
        "Do not lecture. Do not list vocabulary. Do not translate the reply.",
        "You remember this learner across days. Use one remembered fact only when it fits. Do not recite the memory list.",
        "If the latest line has a real language mistake, set mistake to a short category in the through language, such as verb tense or agreement. Otherwise mistake is empty.",
        "fix is the short corrected phrase in the target language, or empty when there is no mistake.",
        "When that mistake category has been seen fewer than two times before, do not put the corrected words inside reply. Stay in character and ask them to try that phrase once more.",
        "When it has been seen twice or more, you may offer the natural phrase once, still inside the conversation.",
        "facts lists up to two new durable facts about the learner's life, in the through language. Use an empty array when nothing new was said.",
        "goal is a goal they stated, in the through language, or empty.",
        "thread is one sentence in the through language about where the conversation stands, so you can continue it next time.",
        `through_note is one short sentence in ${through} only when a hard word or a cultural beat needs a hint. Use an empty string when the reply is already clear.`,
        "move is clarify when you need them to say what they mean, rephrase when you need the same idea in other words, or continue when the sense is already clear.",
        opening
          ? "The learner has not spoken yet. Open the conversation about the topic, inviting them to talk. move is continue."
          : "The learner just spoke. Answer that line first.",
      ].join(" "),
      contents: [
        `Target language: ${namedLang(input.targetLang)}`,
        `Through language: ${namedLang(input.throughLang)}`,
        `CEFR level: ${input.level}`,
        `Today's topic: ${input.topic}`,
        input.memory || "No memory yet.",
        input.story ? `Lesson excerpt:\n${input.story}` : "No lesson excerpt.",
        ...input.history.map((turn) => `${turn.role}: ${turn.text}`),
        opening
          ? "Begin the prosa. Leave mistake, fix, facts and goal empty. You may continue the remembered thread."
          : `learner: ${input.userLine}`,
      ].join("\n"),
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          reply: { type: "string" },
          through_note: { type: "string" },
          mistake: { type: "string" },
          fix: { type: "string" },
          facts: { type: "array", items: { type: "string" } },
          goal: { type: "string" },
          thread: { type: "string" },
          move: { type: "string", enum: ["clarify", "rephrase", "continue"] },
        },
        required: ["reply", "through_note", "mistake", "fix", "facts", "goal", "thread", "move"],
      },
      maxOutputTokens: 700,
      temperature: 0.5,
    });
    const record = completion && typeof completion === "object" ? (completion as Record<string, unknown>) : {};
    const facts = Array.isArray(record.facts)
      ? record.facts.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 3)
      : [];
    const parsed = proseReplySchema.safeParse({
      reply: record.reply,
      through_note: typeof record.through_note === "string" ? record.through_note : "",
      mistake: typeof record.mistake === "string" ? record.mistake : "",
      fix: typeof record.fix === "string" ? record.fix : "",
      facts,
      goal: typeof record.goal === "string" ? record.goal : "",
      thread: typeof record.thread === "string" ? record.thread : "",
      move: record.move === "clarify" || record.move === "rephrase" || record.move === "continue" ? record.move : "continue",
    });
    if (!parsed.success) {
      throw new AppError(502, "Prose response failed validation");
    }
    return parsed.data;
  }

  private async polishPortugueseLesson(
    draft: LessonPayload,
    instruction: string,
    contents: string,
    opts: { temperature: number; task?: string; lane?: CostLane },
  ): Promise<LessonPayload> {
    if (!lessonLeaksSpanish(draft)) {
      return draft;
    }
    const retry = await this.generateStructured({
      systemInstruction: instruction,
      contents: `${contents}\nThe previous draft used Spanish glosses. Rewrite every translation in Brazilian Portuguese.`,
      schema: LESSON_RESPONSE_SCHEMA,
      maxOutputTokens: 1_400,
      temperature: opts.temperature,
      ...(opts.task ? { task: opts.task } : {}),
      ...(opts.lane ? { lane: opts.lane } : {}),
    });
    const second = lessonPayloadSchema.safeParse(retry);
    if (second.success && !lessonLeaksSpanish(second.data)) {
      return second.data;
    }
    throw new AppError(502, "Lesson gloss leaked into another language");
  }

  private hasAnyModel(): boolean {
    return Boolean(this.apiKey || this.fallbacks.groqApiKey || this.fallbacks.openrouterApiKey);
  }

  private requireClient(): GoogleGenAI {
    if (!this.apiKey) {
      throw new AppError(503, "Lesson generation is unavailable");
    }
    this.client ??= new GoogleGenAI({ apiKey: this.apiKey });
    return this.client;
  }

  private async generateWithGemini(input: {
    systemInstruction: string;
    contents: ContentListUnion;
    schema: Record<string, unknown>;
    maxOutputTokens: number;
    temperature: number;
  }): Promise<unknown> {
    const client = this.requireClient();
    const attempts = this.fallbacks.groqApiKey || this.fallbacks.openrouterApiKey ? 2 : 3;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const response = await client.models.generateContent({
          model: this.model,
          contents: input.contents,
          config: {
            systemInstruction: input.systemInstruction,
            temperature: input.temperature,
            maxOutputTokens: input.maxOutputTokens,
            responseMimeType: "application/json",
            responseJsonSchema: input.schema,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        const text = response.text;
        if (!text) {
          lastError = new AppError(502, "Model returned an empty structured response");
          if (attempt < attempts - 1) {
            await wait(400);
            continue;
          }
          throw lastError;
        }
        try {
          return JSON.parse(text) as unknown;
        } catch (error) {
          throw new AppError(502, "Model response was not valid JSON", { cause: error instanceof Error ? error : undefined });
        }
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 415) {
          throw error;
        }
        lastError = error;
        if (attempt < attempts - 1) {
          await wait(modelBusy(error) ? 1_200 * (attempt + 1) : 400);
          continue;
        }
        if (error instanceof AppError) {
          throw error;
        }
        throw busyOrFailed(error);
      }
    }
    throw busyOrFailed(lastError);
  }

  private noteUsage(task: string, provider: UsageNote["provider"], lane: CostLane): void {
    this.onUsage?.({ task, provider, lane, cached: false });
  }

  private async generateStructured(input: {
    systemInstruction: string;
    contents: ContentListUnion;
    schema: Record<string, unknown>;
    maxOutputTokens: number;
    temperature: number;
    task?: string;
    lane?: CostLane;
  }): Promise<unknown> {
    if (!this.hasAnyModel()) {
      throw new AppError(503, "Lesson generation is unavailable");
    }
    const task = input.task ?? "model";
    const lane = input.lane ?? "full";
    const prompt = textOnlyPrompt(input.contents);
    let lastError: unknown;
    if (lane === "cheap" && this.fallbacks.groqApiKey && prompt) {
      try {
        const result = await openaiCompatibleJson({
          url: "https://api.groq.com/openai/v1/chat/completions",
          apiKey: this.fallbacks.groqApiKey,
          model: this.fallbacks.groqModel,
          systemInstruction: input.systemInstruction,
          userText: prompt,
          schema: input.schema,
          maxOutputTokens: input.maxOutputTokens,
          temperature: input.temperature,
        });
        this.noteUsage(task, "groq", lane);
        return result;
      } catch (error) {
        lastError = error;
      }
    }
    if (this.apiKey) {
      try {
        const result = await this.generateWithGemini(input);
        this.noteUsage(task, "gemini", lane);
        return result;
      } catch (error) {
        lastError = error;
        const busy = modelBusy(error) || (error instanceof AppError && error.statusCode === 503);
        this.onFailure?.({
          busy,
          message: scrubSecrets(error instanceof Error ? error.message : "Gemini request failed"),
        });
        if (error instanceof AppError && error.statusCode === 415) {
          throw error;
        }
      }
    }
    if (!prompt) {
      if (lastError instanceof AppError) {
        throw lastError;
      }
      throw busyOrFailed(lastError, this.onFailure);
    }
    if (this.fallbacks.groqApiKey && lane !== "cheap") {
      try {
        const result = await openaiCompatibleJson({
          url: "https://api.groq.com/openai/v1/chat/completions",
          apiKey: this.fallbacks.groqApiKey,
          model: this.fallbacks.groqModel,
          systemInstruction: input.systemInstruction,
          userText: prompt,
          schema: input.schema,
          maxOutputTokens: input.maxOutputTokens,
          temperature: input.temperature,
        });
        this.onFallback?.("groq");
        this.noteUsage(task, "groq", lane);
        return result;
      } catch (error) {
        lastError = error;
      }
    }
    if (this.fallbacks.openrouterApiKey) {
      try {
        const result = await openaiCompatibleJson({
          url: "https://openrouter.ai/api/v1/chat/completions",
          apiKey: this.fallbacks.openrouterApiKey,
          model: this.fallbacks.openrouterModel,
          systemInstruction: input.systemInstruction,
          userText: prompt,
          schema: input.schema,
          maxOutputTokens: input.maxOutputTokens,
          temperature: input.temperature,
          extraHeaders: {
            "HTTP-Referer": this.fallbacks.referer,
            "X-Title": "Prosa",
          },
        });
        this.onFallback?.("openrouter");
        this.noteUsage(task, "openrouter", lane);
        return result;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError instanceof AppError) {
      throw lastError;
    }
    throw busyOrFailed(lastError, this.onFailure);
  }
}

function busyOrFailed(error: unknown, onFailure?: (input: { busy: boolean; message: string }) => void): never {
  if (error instanceof AppError) {
    throw error;
  }
  const busy = modelBusy(error);
  const message = scrubSecrets(error instanceof Error ? error.message : "Model request failed");
  onFailure?.({ busy, message });
  if (busy) {
    throw new AppError(503, "The model is busy. Try again in a minute.", { cause: error instanceof Error ? error : undefined });
  }
  throw new AppError(502, "Model request failed", { cause: error instanceof Error ? error : undefined });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const transcriptionSchema = z.object({
  transcription: z.string(),
});

const prosodySchema = z.object({
  transcription: z.string(),
  rhythm_score: z.number().min(0).max(100),
  words: z
    .array(
      z.object({
        text: z.string().min(1),
        duration_ms: z.number().int().min(0).max(20_000),
      }),
    )
    .max(40)
    .optional(),
});

function geminiAudioMime(mimeType: string, filename: string): string {
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  const mapped = GEMINI_AUDIO_MIME_TYPES[normalized];
  if (mapped) {
    return mapped;
  }
  const extension = filename.toLowerCase().split(".").pop();
  const fromName = extension ? EXTENSION_MIME_TYPES[extension] : undefined;
  if (fromName) {
    return fromName;
  }
  throw new AppError(415, "Unsupported audio type");
}
