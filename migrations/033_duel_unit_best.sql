-- Migration 033: duelo da unidade e recorde pessoal (M3)
-- A rodada do duelo pode ser a rodada-chefe de uma unidade da trilha (unit_id). O recorde
-- pessoal é o maior score por (aluno, idioma-alvo, unidade); sem unit_id é o modo livre.
-- Aditiva e idempotente: pode rodar de novo sem efeito.

BEGIN;

ALTER TABLE duel_runs
  ADD COLUMN IF NOT EXISTS unit_id text;

ALTER TABLE duel_runs DROP CONSTRAINT IF EXISTS duel_runs_unit_format;
ALTER TABLE duel_runs
  ADD CONSTRAINT duel_runs_unit_format
  CHECK (unit_id IS NULL OR unit_id ~ '^(a1|a2|b1|b2|c1)-[0-9]{2}$');

CREATE INDEX IF NOT EXISTS idx_duel_runs_best
  ON duel_runs (user_id, target_lang, unit_id, score DESC);

COMMIT;
