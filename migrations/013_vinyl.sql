ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_reading_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_memory_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_speech_valid;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_mind_journal_valid;

UPDATE users SET mind_reading = 'plato' WHERE mind_reading = 'sagan';
UPDATE users SET mind_reading = 'newton' WHERE mind_reading = 'hypatia';
UPDATE users SET mind_memory = 'aristotle' WHERE mind_memory = 'confucius';
UPDATE users SET mind_memory = 'lovelace' WHERE mind_memory = 'cajal';
UPDATE users SET mind_speech = 'socrates' WHERE mind_speech = 'cicero';
UPDATE users SET mind_speech = 'tesla' WHERE mind_speech = 'mandela';
UPDATE users SET mind_journal = 'davinci' WHERE mind_journal IN ('angelou', 'woolf');
UPDATE users SET mind_journal = 'confucius' WHERE mind_journal = 'machado';

ALTER TABLE users ALTER COLUMN mind_journal SET DEFAULT 'davinci';

ALTER TABLE users
  ADD CONSTRAINT users_mind_reading_valid CHECK (mind_reading IN ('einstein', 'plato', 'newton', 'clara'));
ALTER TABLE users
  ADD CONSTRAINT users_mind_memory_valid CHECK (mind_memory IN ('curie', 'aristotle', 'lovelace', 'bento'));
ALTER TABLE users
  ADD CONSTRAINT users_mind_speech_valid CHECK (mind_speech IN ('feynman', 'socrates', 'tesla', 'nuno'));
ALTER TABLE users
  ADD CONSTRAINT users_mind_journal_valid CHECK (mind_journal IN ('davinci', 'confucius', 'hypatia', 'lia'));
