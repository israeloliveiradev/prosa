ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_reading_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_memory_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_speech_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_journal_valid;

UPDATE users SET mind_reading = 'galileo' WHERE mind_reading = 'clara';
UPDATE users SET mind_memory = 'darwin' WHERE mind_memory = 'bento';
UPDATE users SET mind_speech = 'cicero' WHERE mind_speech = 'nuno';
UPDATE users SET mind_journal = 'aurelius' WHERE mind_journal = 'lia';

ALTER TABLE users
  ADD CONSTRAINT users_mind_reading_valid CHECK (mind_reading IN ('einstein', 'plato', 'newton', 'galileo'));
ALTER TABLE users
  ADD CONSTRAINT users_mind_memory_valid CHECK (mind_memory IN ('curie', 'aristotle', 'lovelace', 'darwin'));
ALTER TABLE users
  ADD CONSTRAINT users_mind_speech_valid CHECK (mind_speech IN ('feynman', 'socrates', 'tesla', 'cicero'));
ALTER TABLE users
  ADD CONSTRAINT users_mind_journal_valid CHECK (mind_journal IN ('davinci', 'confucius', 'hypatia', 'aurelius'));
