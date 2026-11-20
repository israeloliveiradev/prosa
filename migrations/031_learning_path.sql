-- M2: trilha híbrida (docs/12-trilha-contrato.md).
-- Aditiva e idempotente: pode rodar de novo sem efeito.

-- Estado de cada unidade por (aluno, idioma-alvo). Criado sob demanda no primeiro GET /path.
CREATE TABLE IF NOT EXISTS path_progress (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  unit_id text NOT NULL,
  status text NOT NULL,
  lessons_done integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_lang, unit_id),
  CONSTRAINT path_progress_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')),
  CONSTRAINT path_progress_status CHECK (status IN ('locked', 'active', 'mastered', 'validated')),
  CONSTRAINT path_progress_unit_format CHECK (unit_id ~ '^(a1|a2|b1|b2|c1)-[0-9]{2}$'),
  CONSTRAINT path_progress_lessons_nonnegative CHECK (lessons_done >= 0)
);

-- No máximo uma unidade ativa por curso.
CREATE UNIQUE INDEX IF NOT EXISTS path_progress_one_active
  ON path_progress (user_id, target_lang)
  WHERE status = 'active';

-- Tentativas do teste da unidade e do checkpoint da banda. O gabarito (items[].answer) fica só aqui.
CREATE TABLE IF NOT EXISTS path_unit_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  kind text NOT NULL DEFAULT 'unit',
  unit_id text,
  band text,
  source text NOT NULL DEFAULT 'ai',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'started',
  correct_count integer,
  item_count integer,
  score integer,
  passed boolean,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT path_unit_tests_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')),
  CONSTRAINT path_unit_tests_kind CHECK (kind IN ('unit', 'checkpoint')),
  CONSTRAINT path_unit_tests_source CHECK (source IN ('ai', 'fallback', 'mixed', 'bank')),
  CONSTRAINT path_unit_tests_status CHECK (status IN ('started', 'finished', 'abandoned')),
  CONSTRAINT path_unit_tests_target CHECK (
    (kind = 'unit' AND unit_id IS NOT NULL)
    OR (kind = 'checkpoint' AND band IN ('A1', 'A2', 'B1', 'B2', 'C1'))
  ),
  CONSTRAINT path_unit_tests_score CHECK (score IS NULL OR score BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS path_unit_tests_user_unit_idx
  ON path_unit_tests (user_id, target_lang, kind, unit_id, started_at DESC);

CREATE INDEX IF NOT EXISTS path_unit_tests_user_band_idx
  ON path_unit_tests (user_id, target_lang, kind, band, started_at DESC);

-- Sessão diária concluída: base da ofensiva no servidor e das lições da unidade.
CREATE TABLE IF NOT EXISTS session_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  date date NOT NULL,
  unit_id text,
  elapsed_seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_completions_once UNIQUE (user_id, target_lang, date),
  CONSTRAINT session_completions_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')),
  CONSTRAINT session_completions_elapsed CHECK (elapsed_seconds BETWEEN 0 AND 86400),
  CONSTRAINT session_completions_unit_format CHECK (unit_id IS NULL OR unit_id ~ '^(a1|a2|b1|b2|c1)-[0-9]{2}$')
);

CREATE INDEX IF NOT EXISTS session_completions_user_unit_idx
  ON session_completions (user_id, target_lang, unit_id);

CREATE INDEX IF NOT EXISTS session_completions_user_date_idx
  ON session_completions (user_id, date DESC);

-- Diário com a escada de correção fechada, registrado pelo servidor em /journal/evaluate.
-- unit_id é resolvido no servidor (lição do dia ou unidade ativa), nunca enviado pelo cliente.
CREATE TABLE IF NOT EXISTS journal_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  closed_on date NOT NULL DEFAULT CURRENT_DATE,
  unit_id text,
  attempt smallint NOT NULL DEFAULT 1,
  score smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_closures_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')),
  CONSTRAINT journal_closures_unit_format CHECK (unit_id IS NULL OR unit_id ~ '^(a1|a2|b1|b2|c1)-[0-9]{2}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS journal_closures_once
  ON journal_closures (user_id, target_lang, closed_on, (coalesce(unit_id, '')));

CREATE INDEX IF NOT EXISTS journal_closures_user_unit_idx
  ON journal_closures (user_id, target_lang, unit_id);

-- A lição gerada guarda a unidade que praticou.
ALTER TABLE daily_lessons
  ADD COLUMN IF NOT EXISTS unit_id text;
