export interface VocabularyEntry {
  word: string;
  translation: string;
  example_sentence: string;
}

export interface CognateAnchor {
  word: string;
  familiar: string;
  gloss: string;
  kind: "true" | "false";
}

export interface LessonPayload {
  title: string;
  story_text: string;
  translation: string;
  vocabulary: VocabularyEntry[];
  journal_prompt: string;
  anchors?: CognateAnchor[];
}

export interface CadenceBar {
  reference: number;
  spoken: number;
  drift: boolean;
  note: "apressou" | "alongou" | "no tempo";
}

export interface ShadowingResult {
  transcription: string;
  accuracy_score: number;
  mispronounced_words: string[];
  pitch_rhythm_match?: number;
  cadence_match?: number;
  bars?: CadenceBar[];
}

export interface JournalCorrection {
  original: string;
  corrected: string;
  reason: string;
}

export interface JournalEvaluation {
  score: number;
  corrections: JournalCorrection[];
  native_upgrade: string;
}

export interface ReconstructionNote {
  original: string;
  corrected: string;
  reason: string;
}

export interface ReconstructionLiteral {
  phrase: string;
  native_alternative: string;
  reason: string;
}

export interface ReconstructionReport {
  score: number;
  grammar: ReconstructionNote[];
  literals: ReconstructionLiteral[];
}

export type CardStatus = "learning" | "reviewing" | "mastered";

export interface SessionCard {
  id: string;
  front_phrase: string;
  back_translation: string;
  context_sentence: string;
  repetition_count: number;
  interval_days: number;
  ease_factor: number;
  status: CardStatus;
}

export type PhaseId = "reading" | "review" | "shadow" | "journal";

export interface LessonRequest {
  target_lang: string;
  native_lang: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  topic: string;
  mind_reading?: string;
  mind_memory?: string;
  mind_speech?: string;
  mind_journal?: string;
}
