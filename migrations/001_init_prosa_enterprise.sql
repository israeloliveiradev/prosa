BEGIN;

DO $$
BEGIN
  IF current_setting('server_version_num')::integer < 160000 THEN
    RAISE EXCEPTION 'Prosa requires PostgreSQL 16 or newer (found %)',
      current_setting('server_version');
  END IF;
END
$$;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  password_hash text NOT NULL,
  native_lang text NOT NULL,
  target_lang text NOT NULL,
  level text NOT NULL,
  streak_count integer NOT NULL DEFAULT 0,
  last_lesson_at timestamptz,
  streak_freeze_count integer NOT NULL DEFAULT 0,
  total_words_mastered integer NOT NULL DEFAULT 0,
  total_speaking_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT users_email_format CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT users_password_hash_argon2id CHECK (
    password_hash LIKE '$argon2id$%'
    AND char_length(password_hash) >= 64
  ),
  CONSTRAINT users_native_lang_length CHECK (char_length(native_lang) BETWEEN 2 AND 16),
  CONSTRAINT users_target_lang_length CHECK (char_length(target_lang) BETWEEN 2 AND 16),
  CONSTRAINT users_level_cefr CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  CONSTRAINT users_streak_count_nonnegative CHECK (streak_count >= 0),
  CONSTRAINT users_streak_freeze_count_nonnegative CHECK (streak_freeze_count >= 0),
  CONSTRAINT users_total_words_mastered_nonnegative CHECK (total_words_mastered >= 0),
  CONSTRAINT users_total_speaking_seconds_nonnegative CHECK (total_speaking_seconds >= 0)
);

CREATE INDEX idx_users_last_lesson_at ON users (last_lesson_at);

CREATE TABLE srs_cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  front_phrase text NOT NULL,
  back_translation text NOT NULL,
  context_sentence text NOT NULL,
  audio_url text,
  repetition_count integer NOT NULL DEFAULT 0,
  interval_days integer NOT NULL DEFAULT 0,
  ease_factor numeric(3, 2) NOT NULL DEFAULT 2.50,
  status text NOT NULL DEFAULT 'learning',
  next_review_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT srs_cards_front_phrase_not_blank CHECK (char_length(btrim(front_phrase)) > 0),
  CONSTRAINT srs_cards_back_translation_not_blank CHECK (char_length(btrim(back_translation)) > 0),
  CONSTRAINT srs_cards_context_sentence_not_blank CHECK (char_length(btrim(context_sentence)) > 0),
  CONSTRAINT srs_cards_repetition_count_nonnegative CHECK (repetition_count >= 0),
  CONSTRAINT srs_cards_interval_days_nonnegative CHECK (interval_days >= 0),
  CONSTRAINT srs_cards_ease_factor_range CHECK (ease_factor >= 1.30 AND ease_factor <= 9.99),
  CONSTRAINT srs_cards_status_valid CHECK (status IN ('learning', 'reviewing', 'mastered'))
);

CREATE INDEX idx_srs_cards_user_id ON srs_cards (user_id);
CREATE INDEX idx_srs_cards_next_review_at ON srs_cards (next_review_at);
CREATE INDEX idx_srs_cards_user_due ON srs_cards (user_id, next_review_at) INCLUDE (status);
CREATE INDEX idx_srs_cards_user_status ON srs_cards (user_id, status);

CREATE TABLE daily_lessons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  lesson_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  story_text text NOT NULL,
  audio_url text,
  vocabulary_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'in_progress',
  CONSTRAINT daily_lessons_title_not_blank CHECK (char_length(btrim(title)) > 0),
  CONSTRAINT daily_lessons_story_text_not_blank CHECK (char_length(btrim(story_text)) > 0),
  CONSTRAINT daily_lessons_vocabulary_is_array CHECK (jsonb_typeof(vocabulary_data) = 'array'),
  CONSTRAINT daily_lessons_status_valid CHECK (status IN ('in_progress', 'completed'))
);

CREATE INDEX idx_daily_lessons_lesson_date ON daily_lessons (lesson_date);
CREATE INDEX idx_daily_lessons_user_date ON daily_lessons (user_id, lesson_date DESC);
CREATE INDEX idx_daily_lessons_user_status ON daily_lessons (user_id, status);

CREATE TABLE lesson_cache (
  hash text PRIMARY KEY,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_cache_hash_not_blank CHECK (char_length(btrim(hash)) > 0),
  CONSTRAINT lesson_cache_payload_is_object CHECK (jsonb_typeof(payload_json) = 'object')
);

COMMENT ON TABLE lesson_cache IS
  'Semantic cache for generated lessons. Primary key format: target_lang:level:topic_hash.';

CREATE INDEX idx_lesson_cache_created_at ON lesson_cache (created_at);

CREATE TABLE user_badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  badge_code text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_badges_user_code_unique UNIQUE (user_id, badge_code),
  CONSTRAINT user_badges_code_format CHECK (badge_code ~ '^[a-z0-9_]{2,64}$')
);

CREATE INDEX idx_user_badges_user_id ON user_badges (user_id);

CREATE TABLE srs_review_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES srs_cards (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  quality smallint NOT NULL,
  previous_ease_factor numeric(3, 2) NOT NULL,
  new_ease_factor numeric(3, 2) NOT NULL,
  previous_interval_days integer NOT NULL,
  new_interval_days integer NOT NULL,
  previous_repetition_count integer NOT NULL,
  new_repetition_count integer NOT NULL,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT srs_review_logs_quality_range CHECK (quality BETWEEN 0 AND 5),
  CONSTRAINT srs_review_logs_previous_status_valid CHECK (
    previous_status IN ('learning', 'reviewing', 'mastered')
  ),
  CONSTRAINT srs_review_logs_new_status_valid CHECK (
    new_status IN ('learning', 'reviewing', 'mastered')
  )
);

CREATE INDEX idx_srs_review_logs_card_reviewed_at ON srs_review_logs (card_id, reviewed_at DESC);
CREATE INDEX idx_srs_review_logs_user_reviewed_at ON srs_review_logs (user_id, reviewed_at DESC);

CREATE OR REPLACE FUNCTION fn_execute_sm2_review(
  p_card_id uuid,
  p_quality smallint
)
RETURNS srs_cards
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_card srs_cards%ROWTYPE;
  v_prev_ease numeric(3, 2);
  v_prev_interval integer;
  v_prev_reps integer;
  v_prev_status text;
  v_ease_raw numeric;
  v_new_ease numeric(3, 2);
  v_new_interval integer;
  v_new_reps integer;
  v_new_status text;
  v_quality_gap integer;
BEGIN
  IF p_card_id IS NULL OR p_quality IS NULL THEN
    RAISE EXCEPTION 'card_id and quality are required'
      USING ERRCODE = '22023';
  END IF;

  IF p_quality < 0 OR p_quality > 5 THEN
    RAISE EXCEPTION 'quality must be an integer between 0 and 5'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_card
  FROM srs_cards
  WHERE id = p_card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'srs card % not found', p_card_id
      USING ERRCODE = 'P0002';
  END IF;

  v_prev_ease := v_card.ease_factor;
  v_prev_interval := v_card.interval_days;
  v_prev_reps := v_card.repetition_count;
  v_prev_status := v_card.status;

  IF p_quality < 3 THEN
    v_new_ease := v_prev_ease;
    v_new_reps := 0;
    v_new_interval := 1;
    v_new_status := 'learning';
  ELSE
    v_quality_gap := 5 - p_quality;
    v_ease_raw := v_prev_ease + (
      0.1 - (v_quality_gap * (0.08 + (v_quality_gap * 0.02)))
    );

    IF v_ease_raw < 1.30 THEN
      v_ease_raw := 1.30;
    ELSIF v_ease_raw > 9.99 THEN
      v_ease_raw := 9.99;
    END IF;

    v_new_ease := round(v_ease_raw, 2)::numeric(3, 2);

    IF v_prev_reps = 0 THEN
      v_new_interval := 1;
    ELSIF v_prev_reps = 1 THEN
      v_new_interval := 6;
    ELSE
      v_new_interval := round(v_prev_interval * v_new_ease)::integer;
      IF v_new_interval < 1 THEN
        v_new_interval := 1;
      ELSIF v_new_interval > 36500 THEN
        v_new_interval := 36500;
      END IF;
    END IF;

    v_new_reps := v_prev_reps + 1;

    IF v_new_interval >= 21 THEN
      v_new_status := 'mastered';
    ELSE
      v_new_status := 'reviewing';
    END IF;
  END IF;

  UPDATE srs_cards
  SET
    ease_factor = v_new_ease,
    interval_days = v_new_interval,
    repetition_count = v_new_reps,
    status = v_new_status,
    next_review_at = now() + make_interval(days => v_new_interval)
  WHERE id = p_card_id
  RETURNING * INTO v_card;

  IF v_prev_status IS DISTINCT FROM 'mastered' AND v_new_status = 'mastered' THEN
    UPDATE users
    SET total_words_mastered = total_words_mastered + 1
    WHERE id = v_card.user_id;
  ELSIF v_prev_status = 'mastered' AND v_new_status IS DISTINCT FROM 'mastered' THEN
    UPDATE users
    SET total_words_mastered = GREATEST(0, total_words_mastered - 1)
    WHERE id = v_card.user_id;
  END IF;

  INSERT INTO srs_review_logs (
    card_id,
    user_id,
    quality,
    previous_ease_factor,
    new_ease_factor,
    previous_interval_days,
    new_interval_days,
    previous_repetition_count,
    new_repetition_count,
    previous_status,
    new_status
  ) VALUES (
    v_card.id,
    v_card.user_id,
    p_quality,
    v_prev_ease,
    v_new_ease,
    v_prev_interval,
    v_new_interval,
    v_prev_reps,
    v_new_reps,
    v_prev_status,
    v_new_status
  );

  RETURN v_card;
END;
$$;

COMMENT ON FUNCTION fn_execute_sm2_review(uuid, smallint) IS
  'Atomic SM-2 review. EF'' = max(1.3, EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))). '
  'q >= 3 schedules 1 day, 6 days, then round(previous_interval * EF''), and marks mastered when interval >= 21. '
  'q < 3 resets repetition to 0, keeps EF, sets interval to 1 day and status to learning. '
  'Card update, mastered counter and review log commit in the same transaction.';

REVOKE ALL ON FUNCTION fn_execute_sm2_review(uuid, smallint) FROM PUBLIC;

COMMIT;
