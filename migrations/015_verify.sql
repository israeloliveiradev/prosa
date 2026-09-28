ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

UPDATE users
SET email_verified_at = COALESCE(email_verified_at, created_at, now())
WHERE email_verified_at IS NULL;
