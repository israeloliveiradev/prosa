ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'learner';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_valid;
ALTER TABLE users
  ADD CONSTRAINT users_role_valid CHECK (role IN ('learner', 'admin'));
