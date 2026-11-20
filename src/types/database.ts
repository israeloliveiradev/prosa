export const DATABASE_SCHEMA_VERSION = "032_account_prefs" as const;

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

export const TARGET_LANGS = ["en", "es", "de", "ru", "fr", "it", "ja"] as const;
export type TargetLang = (typeof TARGET_LANGS)[number];

export const THROUGH_LANGS = ["pt", "en", "es", "de", "ru", "fr", "it", "ja"] as const;
export type ThroughLang = (typeof THROUGH_LANGS)[number];

export const SRS_CARD_STATUSES = ["learning", "reviewing", "mastered"] as const;
export type SrsCardStatus = (typeof SRS_CARD_STATUSES)[number];

export const LESSON_STATUSES = ["in_progress", "completed"] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

export const SM2_QUALITIES = [0, 1, 2, 3, 4, 5] as const;
export type Sm2Quality = (typeof SM2_QUALITIES)[number];

export const SM2_MIN_EASE_FACTOR = 1.3;
export const SM2_DEFAULT_EASE_FACTOR = 2.5;
export const SM2_MAX_EASE_FACTOR = 9.99;
export const SM2_MASTERED_INTERVAL_DAYS = 21;
export const SM2_MAX_INTERVAL_DAYS = 36500;

export type Uuid = string;
export type IsoDate = string;
export type IsoDateTime = string;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface VocabularyEntry {
  word: string;
  translation: string;
  example_sentence: string;
}

export interface UserRow {
  id: Uuid;
  email: string;
  password_hash: string;
  native_lang: string;
  target_lang: TargetLang;
  level: CefrLevel;
  interests: string[];
  plan: "free" | "pro";
  role: "learner" | "admin";
  streak_count: number;
  last_lesson_at: IsoDateTime | null;
  streak_freeze_count: number;
  total_words_mastered: number;
  total_speaking_seconds: number;
  created_at: IsoDateTime;
}

export interface UserInsert {
  id?: Uuid;
  email: string;
  password_hash: string;
  native_lang: string;
  target_lang: TargetLang;
  level: CefrLevel;
  interests?: string[];
  plan?: "free" | "pro";
  role?: "learner" | "admin";
  streak_count?: number;
  last_lesson_at?: IsoDateTime | null;
  streak_freeze_count?: number;
  total_words_mastered?: number;
  total_speaking_seconds?: number;
  created_at?: IsoDateTime;
}

export interface UserUpdate {
  email?: string;
  password_hash?: string;
  native_lang?: string;
  target_lang?: TargetLang;
  level?: CefrLevel;
  interests?: string[];
  plan?: "free" | "pro";
  role?: "learner" | "admin";
  streak_count?: number;
  last_lesson_at?: IsoDateTime | null;
  streak_freeze_count?: number;
  total_words_mastered?: number;
  total_speaking_seconds?: number;
}

export interface SrsCardRow {
  id: Uuid;
  user_id: Uuid;
  target_lang: TargetLang;
  front_phrase: string;
  back_translation: string;
  context_sentence: string;
  audio_url: string | null;
  visual_mnemonic_url: string | null;
  repetition_count: number;
  interval_days: number;
  ease_factor: number;
  status: SrsCardStatus;
  next_review_at: IsoDateTime;
  stability: number;
  difficulty: number;
  last_review_at: IsoDateTime | null;
}

export interface SrsCardInsert {
  id?: Uuid;
  user_id: Uuid;
  target_lang?: TargetLang;
  front_phrase: string;
  back_translation: string;
  context_sentence: string;
  audio_url?: string | null;
  visual_mnemonic_url?: string | null;
  repetition_count?: number;
  interval_days?: number;
  ease_factor?: number;
  status?: SrsCardStatus;
  next_review_at?: IsoDateTime;
}

export interface SrsCardUpdate {
  front_phrase?: string;
  back_translation?: string;
  context_sentence?: string;
  audio_url?: string | null;
  visual_mnemonic_url?: string | null;
  target_lang?: TargetLang;
  repetition_count?: number;
  interval_days?: number;
  ease_factor?: number;
  status?: SrsCardStatus;
  next_review_at?: IsoDateTime;
}

export interface DailyLessonRow {
  id: Uuid;
  user_id: Uuid;
  lesson_date: IsoDate;
  target_lang: TargetLang;
  topic_category: string;
  title: string;
  story_text: string;
  audio_url: string | null;
  vocabulary_data: VocabularyEntry[];
  status: LessonStatus;
}

export interface DailyLessonInsert {
  id?: Uuid;
  user_id: Uuid;
  lesson_date?: IsoDate;
  target_lang?: TargetLang;
  topic_category?: string;
  title: string;
  story_text: string;
  audio_url?: string | null;
  vocabulary_data?: VocabularyEntry[];
  status?: LessonStatus;
}

export interface DailyLessonUpdate {
  lesson_date?: IsoDate;
  target_lang?: TargetLang;
  topic_category?: string;
  title?: string;
  story_text?: string;
  audio_url?: string | null;
  vocabulary_data?: VocabularyEntry[];
  status?: LessonStatus;
}

export interface LessonCacheRow {
  hash: string;
  payload_json: Json;
  created_at: IsoDateTime;
}

export interface LessonCacheInsert {
  hash: string;
  payload_json: Json;
  created_at?: IsoDateTime;
}

export interface UserBadgeRow {
  id: Uuid;
  user_id: Uuid;
  badge_code: string;
  unlocked_at: IsoDateTime;
}

export interface UserBadgeInsert {
  id?: Uuid;
  user_id: Uuid;
  badge_code: string;
  unlocked_at?: IsoDateTime;
}

export interface SrsReviewLogRow {
  id: Uuid;
  card_id: Uuid;
  user_id: Uuid;
  quality: Sm2Quality;
  previous_ease_factor: number;
  new_ease_factor: number;
  previous_interval_days: number;
  new_interval_days: number;
  previous_repetition_count: number;
  new_repetition_count: number;
  previous_status: SrsCardStatus;
  new_status: SrsCardStatus;
  reviewed_at: IsoDateTime;
}

export interface NewsFeedCacheRow {
  id: Uuid;
  target_lang: TargetLang;
  level: CefrLevel;
  original_url: string;
  simplified_text_json: Json;
  created_at: IsoDateTime;
}

export interface NewsFeedCacheInsert {
  id?: Uuid;
  target_lang: TargetLang;
  level: CefrLevel;
  original_url: string;
  simplified_text_json: Json;
  created_at?: IsoDateTime;
}

export interface StudyTrackRow {
  id: Uuid;
  user_id: Uuid;
  target_lang: TargetLang;
  through_lang: ThroughLang;
  level: CefrLevel;
  active: boolean;
  created_at: IsoDateTime;
}

export interface StudyTrackInsert {
  id?: Uuid;
  user_id: Uuid;
  target_lang: TargetLang;
  through_lang: ThroughLang;
  level?: CefrLevel;
  active?: boolean;
  created_at?: IsoDateTime;
}

export interface ExecuteSm2ReviewArgs {
  p_card_id: Uuid;
  p_quality: Sm2Quality;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      srs_cards: {
        Row: SrsCardRow;
        Insert: SrsCardInsert;
        Update: SrsCardUpdate;
      };
      daily_lessons: {
        Row: DailyLessonRow;
        Insert: DailyLessonInsert;
        Update: DailyLessonUpdate;
      };
      lesson_cache: {
        Row: LessonCacheRow;
        Insert: LessonCacheInsert;
        Update: never;
      };
      user_badges: {
        Row: UserBadgeRow;
        Insert: UserBadgeInsert;
        Update: never;
      };
      srs_review_logs: {
        Row: SrsReviewLogRow;
        Insert: never;
        Update: never;
      };
      news_feed_cache: {
        Row: NewsFeedCacheRow;
        Insert: NewsFeedCacheInsert;
        Update: never;
      };
      study_tracks: {
        Row: StudyTrackRow;
        Insert: StudyTrackInsert;
        Update: Partial<StudyTrackInsert>;
      };
    };
    Functions: {
      fn_execute_sm2_review: {
        Args: ExecuteSm2ReviewArgs;
        Returns: SrsCardRow;
      };
    };
  };
}

export type PublicTableName = keyof Database["public"]["Tables"];
export type TableRow<T extends PublicTableName> = Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends PublicTableName> = Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends PublicTableName> = Database["public"]["Tables"][T]["Update"];
