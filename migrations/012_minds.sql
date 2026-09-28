ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mind_reading text NOT NULL DEFAULT 'einstein',
  ADD COLUMN IF NOT EXISTS mind_memory text NOT NULL DEFAULT 'curie',
  ADD COLUMN IF NOT EXISTS mind_speech text NOT NULL DEFAULT 'feynman',
  ADD COLUMN IF NOT EXISTS mind_journal text NOT NULL DEFAULT 'angelou';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_reading_valid;
ALTER TABLE users
  ADD CONSTRAINT users_mind_reading_valid CHECK (mind_reading IN ('einstein', 'sagan', 'hypatia', 'clara'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_memory_valid;
ALTER TABLE users
  ADD CONSTRAINT users_mind_memory_valid CHECK (mind_memory IN ('curie', 'confucius', 'cajal', 'bento'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_speech_valid;
ALTER TABLE users
  ADD CONSTRAINT users_mind_speech_valid CHECK (mind_speech IN ('feynman', 'cicero', 'mandela', 'nuno'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_journal_valid;
ALTER TABLE users
  ADD CONSTRAINT users_mind_journal_valid CHECK (mind_journal IN ('angelou', 'machado', 'woolf', 'lia'));
