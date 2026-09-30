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

export interface SoundNote {
  word: string;
  sound: { pt: string; en: string };
  held: boolean;
  heard: string;
  hint: { pt: string; en: string };
}

export interface ShadowingResult {
  transcription: string;
  accuracy_score: number;
  mispronounced_words: string[];
  sounds?: SoundNote[];
  pitch_rhythm_match?: number;
  cadence_match?: number;
  bars?: CadenceBar[];
}

export type RepairStep = "none" | "prompt" | "hint" | "correction";

export interface JournalCorrection {
  original: string;
  corrected: string;
  reason: string;
  kind?: string;
  step?: RepairStep;
}

export interface RepairCard {
  front_phrase: string;
  back_translation: string;
  context_sentence: string;
}

export interface JournalEvaluation {
  score: number;
  corrections: JournalCorrection[];
  native_upgrade: string;
  step?: RepairStep;
  cards?: RepairCard[];
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
  step?: RepairStep;
  cards?: RepairCard[];
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
  stability?: number;
  difficulty?: number;
  due?: string;
  reviewed_at?: string;
}

export type PhaseId = "review" | "listen" | "reading" | "shadow" | "journal" | "note";

export interface LearnerProfile {
  reading: number;
  listening: number;
  vocabulary: number;
  grammar: number;
  pronunciation: number;
  fluency: number;
  writing: number;
  hearing: number;
  lexicon_size: number;
  coverage: number;
  error_kinds: string[];
  weak_sounds: string[];
  goal: string;
  weekly_aim: string;
  minutes_per_day: number;
  exam_track: string;
  fluency_wpm: number;
}

export interface ProfileNote {
  force: "listen" | "reading" | "none";
  gap: number;
  weak: keyof Pick<LearnerProfile, "reading" | "listening" | "vocabulary" | "grammar" | "pronunciation" | "fluency" | "writing"> | null;
}

export interface ClockHint {
  listeningGap: number;
  slowStart: boolean;
}

export interface CourseProfile {
  profile: LearnerProfile;
  note: ProfileNote;
  clock: ClockHint;
}

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
