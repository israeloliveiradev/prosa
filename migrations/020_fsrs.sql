ALTER TABLE srs_cards
  ADD COLUMN IF NOT EXISTS stability double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS difficulty double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_review_at timestamptz;

UPDATE srs_cards
SET stability = GREATEST(interval_days, 1),
    difficulty = LEAST(9.9, GREATEST(1.3, ease_factor::float8)),
    last_review_at = next_review_at - make_interval(days => GREATEST(interval_days, 1))
WHERE stability = 0
  AND repetition_count > 0;
