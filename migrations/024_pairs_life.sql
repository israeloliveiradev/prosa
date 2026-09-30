CREATE TABLE IF NOT EXISTS journal_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES users (id) ON DELETE SET NULL,
  target_lang text NOT NULL,
  native_lang text NOT NULL,
  prompt text NOT NULL DEFAULT '',
  body text NOT NULL,
  understood text NOT NULL DEFAULT '',
  correction text NOT NULL DEFAULT '',
  question text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'offered' CHECK (status IN ('offered', 'taken', 'done')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT journal_pairs_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')),
  CONSTRAINT journal_pairs_native CHECK (native_lang IN ('pt', 'en', 'es', 'de', 'ru', 'fr', 'it', 'ja')),
  CONSTRAINT journal_pairs_author CHECK (author_id <> reviewer_id)
);

CREATE INDEX IF NOT EXISTS journal_pairs_reviewer_idx
  ON journal_pairs (reviewer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS journal_pairs_author_idx
  ON journal_pairs (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ownlife_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  source text NOT NULL,
  calibrated text NOT NULL,
  through_note text NOT NULL DEFAULT '',
  mission_prompt text NOT NULL,
  mission_hold text NOT NULL,
  mission_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ownlife_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja'))
);

CREATE INDEX IF NOT EXISTS ownlife_user_idx
  ON ownlife_notes (user_id, target_lang, created_at DESC);

ALTER TABLE learner_profile
  ADD COLUMN IF NOT EXISTS fluency_wpm smallint NOT NULL DEFAULT 0;
