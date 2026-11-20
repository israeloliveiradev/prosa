-- Migration 032: account preferences (M2)
-- Objetivo, nota do objetivo e minutos por dia passam a morar na conta, e o
-- idioma de interface aceita os 7 idiomas (antes só pt/en).
-- Aditiva e idempotente: pode rodar de novo sem efeito.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS goal text,
  ADD COLUMN IF NOT EXISTS goal_note text,
  ADD COLUMN IF NOT EXISTS daily_minutes smallint NOT NULL DEFAULT 20;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_goal_valid;
ALTER TABLE users
  ADD CONSTRAINT users_goal_valid
  CHECK (goal IS NULL OR goal IN ('career', 'travel', 'studies', 'culture', 'family', 'relocation'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_goal_note_len;
ALTER TABLE users
  ADD CONSTRAINT users_goal_note_len
  CHECK (goal_note IS NULL OR char_length(goal_note) <= 200);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_daily_minutes_valid;
ALTER TABLE users
  ADD CONSTRAINT users_daily_minutes_valid
  CHECK (daily_minutes IN (10, 20, 30));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_display_locale_valid;
ALTER TABLE users
  ADD CONSTRAINT users_display_locale_valid
  CHECK (display_locale IN ('pt', 'en', 'de', 'fr', 'es', 'it', 'ja'));

COMMIT;
