BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_plan_valid'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_plan_valid CHECK (plan IN ('free', 'pro'));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_sessions_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT auth_sessions_token_hash_hex CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT auth_sessions_expiry_after_create CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions (user_id);

COMMIT;
