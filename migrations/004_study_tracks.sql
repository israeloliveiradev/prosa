CREATE TABLE IF NOT EXISTS study_tracks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  through_lang text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT study_tracks_target_supported CHECK (
    target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')
  ),
  CONSTRAINT study_tracks_through_supported CHECK (
    through_lang IN ('pt', 'en', 'es', 'de', 'ru', 'fr', 'it', 'ja')
  ),
  CONSTRAINT study_tracks_distinct_pair CHECK (target_lang <> through_lang),
  CONSTRAINT study_tracks_user_pair_unique UNIQUE (user_id, target_lang, through_lang)
);

CREATE UNIQUE INDEX IF NOT EXISTS study_tracks_one_active
  ON study_tracks (user_id)
  WHERE active;

CREATE INDEX IF NOT EXISTS idx_study_tracks_user
  ON study_tracks (user_id, created_at);
