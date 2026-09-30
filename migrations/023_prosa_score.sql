CREATE TABLE IF NOT EXISTS prosa_score_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  through_lang text NOT NULL,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'abandoned')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  timings jsonb NOT NULL DEFAULT '{}'::jsonb,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  writing text NOT NULL DEFAULT '',
  speaking text NOT NULL DEFAULT '',
  score smallint,
  band text,
  theta double precision,
  sections jsonb,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  share_token text UNIQUE,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT prosa_score_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')),
  CONSTRAINT prosa_score_through CHECK (through_lang IN ('pt', 'en', 'es', 'de', 'ru', 'fr', 'it', 'ja'))
);

CREATE INDEX IF NOT EXISTS prosa_score_user_idx
  ON prosa_score_attempts (user_id, target_lang, finished_at DESC);

CREATE INDEX IF NOT EXISTS prosa_score_share_idx
  ON prosa_score_attempts (share_token)
  WHERE share_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS prosa_score_seen (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  item_id text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);
