CREATE TABLE IF NOT EXISTS placement_items (
  id text NOT NULL,
  target_lang text NOT NULL,
  through_lang text NOT NULL,
  band text NOT NULL CHECK (band IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  kind text NOT NULL CHECK (kind IN ('vocab', 'grammar', 'reading', 'listening')),
  prompt text NOT NULL,
  hint text NOT NULL,
  options jsonb NOT NULL,
  answer integer NOT NULL CHECK (answer BETWEEN 0 AND 3),
  passage text,
  audio_text text,
  difficulty double precision NOT NULL,
  shown_count integer NOT NULL DEFAULT 0,
  hit_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, through_lang)
);

CREATE INDEX IF NOT EXISTS placement_items_lang_idx
  ON placement_items (target_lang, through_lang, difficulty);

CREATE TABLE IF NOT EXISTS placement_seen (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  item_id text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE placement_attempts
  ADD COLUMN IF NOT EXISTS state jsonb NOT NULL DEFAULT '{}'::jsonb;
