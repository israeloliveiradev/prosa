import { GoogleGenAI, type ContentListUnion } from "@google/genai";
import { z } from "zod";
import { AppError } from "../http/errors.js";
import {
  journalEvaluationSchema,
  type EvaluateJournalBody,
  type JournalEvaluation,
} from "../schemas/journal.js";
import { lessonPayloadSchema, type LessonPayload, type LessonProfile } from "../schemas/lesson.js";
import { topicMatrixSchema } from "../schemas/onboarding.js";
import { grammarModelSchema, grammarVaryModelSchema, type GrammarBlock } from "../schemas/grammar.js";
import { reconstructionReportSchema, type ReconstructionBody, type ReconstructionReport } from "../schemas/reconstruction.js";
import { personaReplySchema } from "../schemas/persona.js";
import { mnemonicResponseSchema } from "../schemas/srs.js";
import { frequentVerbs, type CognateAnchor } from "./cognates.js";

const LESSON_INSTRUCTIONS = [
  "Write one daily language lesson.",
  "story_text is 130 to 170 words in the target language, at the requested CEFR level, about the topic.",
  "translation is the complete story in the native language, the language the learner studies through.",
  "vocabulary contains 6 to 8 items that appear in the story. example_sentence is in the target language.",
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

const JOURNAL_INSTRUCTIONS = [
  "Correct a language learner's journal entry.",
  "score is an integer from 0 to 100 for meaning, grammar and naturalness at the learner's CEFR level.",
  "corrections lists only real mistakes. Use an empty array when the text is already appropriate.",
  "reason is one short sentence in the native language.",
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
        },
        required: ["original", "corrected", "reason"],
      },
    },
    native_upgrade: { type: "string" },
  },
  required: ["score", "corrections", "native_upgrade"],
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

export class GeminiGateway {
  private client: GoogleGenAI | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateLesson(profile: LessonProfile, anchors: CognateAnchor[] = []): Promise<LessonPayload> {
    const lines = [
      `Target language: ${profile.target_lang}`,
      `Native language: ${profile.native_lang}`,
      `CEFR level: ${profile.level}`,
      `Topic: ${profile.topic}`,
    ];
    if (profile.interests.length > 0) {
      lines.push(`Learner interests: ${profile.interests.join(", ")}`);
      lines.push("Weave those interests into the story when they fit the topic.");
    }
    const trueCognates = anchors.filter((item) => item.kind === "true");
    const falseFriends = anchors.filter((item) => item.kind === "false");
    const instruction = trueCognates.length >= 8 ? COGNATE_INSTRUCTIONS : LESSON_INSTRUCTIONS;
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
    });
    const parsed = lessonPayloadSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Lesson response failed validation");
    }
    return parsed.data;
  }

  async evaluateJournal(input: EvaluateJournalBody): Promise<JournalEvaluation> {
    const completion = await this.generateStructured({
      systemInstruction: JOURNAL_INSTRUCTIONS,
      contents: [
        `Target language: ${input.target_lang}`,
        `Native language: ${input.native_lang}`,
        `CEFR level: ${input.level}`,
        `Prompt: ${input.journal_prompt}`,
        `Learner text: ${input.text}`,
      ].join("\n"),
      schema: JOURNAL_RESPONSE_SCHEMA,
      maxOutputTokens: 900,
      temperature: 0.2,
    });
    const parsed = journalEvaluationSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Journal response failed validation");
    }
    return parsed.data;
  }

  async reconstruct(input: ReconstructionBody): Promise<ReconstructionReport> {
    const completion = await this.generateStructured({
      systemInstruction: RECONSTRUCTION_INSTRUCTIONS,
      contents: [
        `Target language: ${input.target_lang}`,
        `Through language: ${input.through_lang}`,
        `CEFR level: ${input.level}`,
        `Translation the learner saw:\n${input.translation}`,
        `Ideal story:\n${input.story_text}`,
        `Learner rewrite:\n${input.attempt}`,
      ].join("\n"),
      schema: RECONSTRUCTION_RESPONSE_SCHEMA,
      maxOutputTokens: 1_200,
      temperature: 0.2,
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
  }

  async duelDrills(input: {
    targetLang: string;
    throughLang: string;
    level: string;
    interests: string[];
  }): Promise<{ drills: Array<{ prompt: string; options: string[]; answer: number }> }> {
    const completion = await this.generateStructured({
      systemInstruction: DUEL_INSTRUCTIONS,
      contents: [
        `Target language: ${input.targetLang}`,
        `Through language: ${input.throughLang}`,
        `CEFR level: ${input.level}`,
        `Interests: ${input.interests.length > 0 ? input.interests.join(", ") : "everyday conversation"}`,
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
        `Target language: ${input.targetLang}`,
        `CEFR level: ${input.level}`,
        `Interests: ${input.interests.join(", ")}`,
        input.goal ? `Goal: ${input.goal}` : "Goal: daily conversation",
      ].join("\n"),
      schema: TOPIC_RESPONSE_SCHEMA,
      maxOutputTokens: 500,
      temperature: 0.5,
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
        `Target language: ${input.targetLang}`,
        `Native language: ${input.nativeLang}`,
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
        `Target language: ${input.targetLang}`,
        `Native language: ${input.nativeLang}`,
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
        `Target language: ${input.targetLang}`,
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
  }): Promise<LessonPayload> {
    const completion = await this.generateStructured({
      systemInstruction: [
        "Turn one news item into a language lesson.",
        "story_text is 90 to 140 words in the target language, at the requested CEFR level.",
        "Use only the headline and summary. Do not add events that are not in them.",
        "translation is the complete story in the native language, the language the learner studies through.",
        "vocabulary contains 4 to 6 items that appear in the story.",
        "journal_prompt asks the learner to react in the target language in two sentences.",
      ].join(" "),
      contents: [
        `Target language: ${input.targetLang}`,
        `Native language: ${input.nativeLang}`,
        `CEFR level: ${input.level}`,
        `Headline: ${input.title}`,
        `Summary: ${input.summary || input.title}`,
      ].join("\n"),
      schema: LESSON_RESPONSE_SCHEMA,
      maxOutputTokens: 1_400,
      temperature: 0.3,
    });
    const parsed = lessonPayloadSchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "News lesson response failed validation");
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
    history: Array<{ role: "persona" | "learner"; text: string }>;
    userLine: string;
  }): Promise<{ reply: string; tone: "adequate" | "direct" | "informal" | "inadequate"; cultural_note: string }> {
    const names: Record<string, string> = {
      pt: "Portuguese",
      en: "English",
      es: "Spanish",
      de: "German",
      fr: "French",
      it: "Italian",
      ru: "Russian",
      ja: "Japanese",
    };
    const through = names[input.throughLang] ?? "Portuguese";
    const completion = await this.generateStructured({
      systemInstruction: [
        "You are one person in a real situation, speaking only the target language.",
        "Stay in the given role and place. Match the requested register: formal uses polite distance, informal uses the casual speech of that place.",
        "reply is one to three sentences at the learner CEFR level. Do not translate it. Do not add a teaching note inside the reply.",
        "Judge only the learner's latest line for politeness and cultural fit in this scene.",
        "tone is adequate when the politeness fits, direct when the line is too blunt, informal when it is too casual for this scene, inadequate when a custom of the place is missed.",
        `cultural_note is one or two sentences in ${through}, naming what fit or what to change. It is never empty.`,
      ].join(" "),
      contents: [
        `Target language: ${input.targetLang}`,
        `Through language: ${input.throughLang}`,
        `CEFR level: ${input.level}`,
        `Role: ${input.role}`,
        `Place: ${input.place}`,
        `Register: ${input.register}`,
        `Opening line you already said: ${input.opener}`,
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
    });
    const parsed = personaReplySchema.safeParse(completion);
    if (!parsed.success) {
      throw new AppError(502, "Persona response failed validation");
    }
    return parsed.data;
  }

  private requireClient(): GoogleGenAI {
    if (!this.apiKey) {
      throw new AppError(503, "GEMINI_API_KEY is not configured");
    }
    this.client ??= new GoogleGenAI({ apiKey: this.apiKey });
    return this.client;
  }

  private async generateStructured(input: {
    systemInstruction: string;
    contents: ContentListUnion;
    schema: Record<string, unknown>;
    maxOutputTokens: number;
    temperature: number;
  }): Promise<unknown> {
    const client = this.requireClient();
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
        throw new AppError(502, "Model returned an empty structured response");
      }
      try {
        return JSON.parse(text) as unknown;
      } catch (error) {
        throw new AppError(502, "Model response was not valid JSON", { cause: error });
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(502, "Model request failed", { cause: error });
    }
  }
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
