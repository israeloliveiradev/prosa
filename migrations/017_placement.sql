CREATE TABLE IF NOT EXISTS placement_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  through_lang text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('placement', 'progress')),
  status text NOT NULL CHECK (status IN ('started', 'completed', 'abandoned')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  correct_count integer,
  item_count integer,
  score integer,
  result_level text CHECK (result_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  previous_level text CHECK (previous_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  bands jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS placement_attempts_user_lang_idx
  ON placement_attempts (user_id, target_lang, started_at DESC);

CREATE INDEX IF NOT EXISTS placement_attempts_open_idx
  ON placement_attempts (user_id, target_lang, status)
  WHERE status = 'started';
