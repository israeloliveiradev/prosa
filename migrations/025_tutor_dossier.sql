CREATE TABLE IF NOT EXISTS tutor_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  share_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_lang),
  CONSTRAINT tutor_dossiers_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja'))
);

CREATE TABLE IF NOT EXISTS tutor_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES tutor_dossiers (id) ON DELETE CASCADE,
  focus text NOT NULL,
  note text NOT NULL DEFAULT '',
  due_on date,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tutor_checkpoints_dossier_idx
  ON tutor_checkpoints (dossier_id, created_at DESC);
