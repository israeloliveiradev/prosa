CREATE TABLE IF NOT EXISTS duel_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  level text NOT NULL,
  score integer NOT NULL,
  best_combo integer NOT NULL,
  correct_count integer NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT duel_runs_score_range CHECK (score >= 0 AND score <= 20000),
  CONSTRAINT duel_runs_combo_range CHECK (best_combo >= 0 AND best_combo <= 40),
  CONSTRAINT duel_runs_correct_range CHECK (correct_count >= 0 AND correct_count <= 40),
  CONSTRAINT duel_runs_combo_within_correct CHECK (best_combo <= correct_count)
);

CREATE INDEX IF NOT EXISTS idx_duel_runs_board ON duel_runs (target_lang, user_id, score DESC);
