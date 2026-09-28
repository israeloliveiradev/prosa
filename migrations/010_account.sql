ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS display_locale text NOT NULL DEFAULT 'pt',
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_hour smallint NOT NULL DEFAULT 8;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_display_name_len;
ALTER TABLE users
  ADD CONSTRAINT users_display_name_len CHECK (display_name IS NULL OR char_length(btrim(display_name)) BETWEEN 2 AND 40);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_display_locale_valid;
ALTER TABLE users
  ADD CONSTRAINT users_display_locale_valid CHECK (display_locale IN ('pt', 'en'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_reminder_hour_range;
ALTER TABLE users
  ADD CONSTRAINT users_reminder_hour_range CHECK (reminder_hour BETWEEN 0 AND 23);

CREATE INDEX IF NOT EXISTS idx_users_reminder_due
  ON users (reminder_hour)
  WHERE reminder_enabled;
