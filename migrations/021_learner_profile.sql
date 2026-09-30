CREATE TABLE IF NOT EXISTS learner_profile (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  reading smallint NOT NULL DEFAULT 0,
  listening smallint NOT NULL DEFAULT 0,
  vocabulary smallint NOT NULL DEFAULT 0,
  grammar smallint NOT NULL DEFAULT 0,
  pronunciation smallint NOT NULL DEFAULT 0,
  fluency smallint NOT NULL DEFAULT 0,
  writing smallint NOT NULL DEFAULT 0,
  hearing smallint NOT NULL DEFAULT 0,
  lexicon_size integer NOT NULL DEFAULT 0,
  coverage smallint NOT NULL DEFAULT 0,
  error_kinds jsonb NOT NULL DEFAULT '[]'::jsonb,
  weak_sounds jsonb NOT NULL DEFAULT '[]'::jsonb,
  goal text NOT NULL DEFAULT '',
  weekly_aim text NOT NULL DEFAULT '',
  minutes_per_day smallint NOT NULL DEFAULT 20,
  due_at date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_lang),
  CONSTRAINT learner_profile_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')),
  CONSTRAINT learner_profile_scores CHECK (
    reading BETWEEN 0 AND 100
    AND listening BETWEEN 0 AND 100
    AND vocabulary BETWEEN 0 AND 100
    AND grammar BETWEEN 0 AND 100
    AND pronunciation BETWEEN 0 AND 100
    AND fluency BETWEEN 0 AND 100
    AND writing BETWEEN 0 AND 100
    AND hearing BETWEEN 0 AND 100
    AND coverage BETWEEN 0 AND 100
    AND lexicon_size >= 0
    AND minutes_per_day BETWEEN 5 AND 120
  )
);
