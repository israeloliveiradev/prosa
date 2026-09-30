ALTER TABLE learner_profile
  ADD COLUMN IF NOT EXISTS exam_track text NOT NULL DEFAULT '';

ALTER TABLE learner_profile
  DROP CONSTRAINT IF EXISTS learner_profile_exam_track;

ALTER TABLE learner_profile
  ADD CONSTRAINT learner_profile_exam_track
  CHECK (exam_track IN ('', 'toefl', 'ielts', 'dele', 'delf', 'goethe', 'jlpt', 'torfl'));

CREATE TABLE IF NOT EXISTS exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  exam_id text NOT NULL,
  predicted double precision NOT NULL,
  raw_score double precision NOT NULL,
  band text NOT NULL,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  finished_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_attempts_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')),
  CONSTRAINT exam_attempts_exam CHECK (exam_id IN ('toefl', 'ielts', 'dele', 'delf', 'goethe', 'jlpt', 'torfl'))
);

CREATE INDEX IF NOT EXISTS exam_attempts_user_idx
  ON exam_attempts (user_id, target_lang, exam_id, finished_at DESC);
