CREATE TABLE IF NOT EXISTS srs_mnemonics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES srs_cards (id) ON DELETE CASCADE,
  association_text text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT srs_mnemonics_card_unique UNIQUE (card_id),
  CONSTRAINT srs_mnemonics_association_not_blank CHECK (char_length(btrim(association_text)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_srs_mnemonics_card_id ON srs_mnemonics (card_id);

CREATE TABLE IF NOT EXISTS user_retention_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  words_mastered integer NOT NULL DEFAULT 0,
  words_decaying integer NOT NULL DEFAULT 0,
  retention_score numeric(5, 2) NOT NULL DEFAULT 100.00,
  CONSTRAINT user_retention_logs_user_date_unique UNIQUE (user_id, log_date),
  CONSTRAINT user_retention_logs_counts_nonnegative CHECK (words_mastered >= 0 AND words_decaying >= 0),
  CONSTRAINT user_retention_logs_score_range CHECK (retention_score >= 0 AND retention_score <= 100)
);

CREATE INDEX IF NOT EXISTS idx_retention_logs_date ON user_retention_logs (user_id, log_date DESC);

CREATE INDEX IF NOT EXISTS idx_srs_cards_failure_rate ON srs_cards (user_id, ease_factor, repetition_count);
