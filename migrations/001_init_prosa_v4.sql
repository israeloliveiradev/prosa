BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION fn_interests_valid(items text[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  item text;
BEGIN
  IF items IS NULL OR cardinality(items) > 12 THEN
    RETURN false;
  END IF;
  FOREACH item IN ARRAY items LOOP
    IF item IS NULL OR char_length(btrim(item)) NOT BETWEEN 1 AND 48 THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_interests_valid;
ALTER TABLE users
  ADD CONSTRAINT users_interests_valid CHECK (fn_interests_valid(interests));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_target_lang_supported;
ALTER TABLE users
  ADD CONSTRAINT users_target_lang_supported CHECK (
    target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')
  );

ALTER TABLE srs_cards
  ADD COLUMN IF NOT EXISTS target_lang text,
  ADD COLUMN IF NOT EXISTS visual_mnemonic_url text;

UPDATE srs_cards AS card
SET target_lang = users.target_lang
FROM users
WHERE card.user_id = users.id
  AND card.target_lang IS NULL;

ALTER TABLE srs_cards ALTER COLUMN target_lang SET DEFAULT 'en';
UPDATE srs_cards SET target_lang = 'en' WHERE target_lang IS NULL;
ALTER TABLE srs_cards ALTER COLUMN target_lang SET NOT NULL;

ALTER TABLE srs_cards DROP CONSTRAINT IF EXISTS srs_cards_target_lang_supported;
ALTER TABLE srs_cards
  ADD CONSTRAINT srs_cards_target_lang_supported CHECK (
    target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')
  );

CREATE INDEX IF NOT EXISTS idx_srs_cards_user_lang ON srs_cards (user_id, target_lang);

ALTER TABLE daily_lessons
  ADD COLUMN IF NOT EXISTS target_lang text,
  ADD COLUMN IF NOT EXISTS topic_category text;

UPDATE daily_lessons AS lesson
SET target_lang = users.target_lang
FROM users
WHERE lesson.user_id = users.id
  AND lesson.target_lang IS NULL;

ALTER TABLE daily_lessons ALTER COLUMN target_lang SET DEFAULT 'en';
UPDATE daily_lessons SET target_lang = 'en' WHERE target_lang IS NULL;
ALTER TABLE daily_lessons ALTER COLUMN target_lang SET NOT NULL;

UPDATE daily_lessons SET topic_category = 'everyday' WHERE topic_category IS NULL;
ALTER TABLE daily_lessons ALTER COLUMN topic_category SET DEFAULT 'everyday';
ALTER TABLE daily_lessons ALTER COLUMN topic_category SET NOT NULL;

ALTER TABLE daily_lessons DROP CONSTRAINT IF EXISTS daily_lessons_target_lang_supported;
ALTER TABLE daily_lessons
  ADD CONSTRAINT daily_lessons_target_lang_supported CHECK (
    target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')
  );

ALTER TABLE daily_lessons DROP CONSTRAINT IF EXISTS daily_lessons_topic_category_length;
ALTER TABLE daily_lessons
  ADD CONSTRAINT daily_lessons_topic_category_length CHECK (
    char_length(btrim(topic_category)) BETWEEN 1 AND 80
  );

CREATE INDEX IF NOT EXISTS idx_daily_lessons_user_lang_date
  ON daily_lessons (user_id, target_lang, lesson_date DESC);

CREATE TABLE IF NOT EXISTS news_feed_cache (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_lang text NOT NULL,
  level text NOT NULL,
  original_url text NOT NULL,
  simplified_text_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT news_feed_cache_lang_supported CHECK (
    target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')
  ),
  CONSTRAINT news_feed_cache_level_cefr CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  CONSTRAINT news_feed_cache_url_https CHECK (original_url ~ '^https://[^[:space:]]+$'),
  CONSTRAINT news_feed_cache_payload_is_object CHECK (jsonb_typeof(simplified_text_json) = 'object'),
  CONSTRAINT news_feed_cache_url_level_unique UNIQUE (target_lang, level, original_url)
);

CREATE INDEX IF NOT EXISTS idx_news_feed_cache_lang_level
  ON news_feed_cache (target_lang, level, created_at DESC);

DROP FUNCTION IF EXISTS fn_execute_sm2_review(uuid, smallint);

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
