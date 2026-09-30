ALTER TABLE study_tracks
  ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'A2';

ALTER TABLE study_tracks
  DROP CONSTRAINT IF EXISTS study_tracks_level_cefr;

ALTER TABLE study_tracks
  ADD CONSTRAINT study_tracks_level_cefr CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, target_lang
           ORDER BY active DESC, created_at DESC
         ) AS rn
  FROM study_tracks
)
DELETE FROM study_tracks
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

ALTER TABLE study_tracks
  DROP CONSTRAINT IF EXISTS study_tracks_user_pair_unique;

ALTER TABLE study_tracks
  DROP CONSTRAINT IF EXISTS study_tracks_user_target_unique;

ALTER TABLE study_tracks
  ADD CONSTRAINT study_tracks_user_target_unique UNIQUE (user_id, target_lang);

UPDATE study_tracks AS track
SET level = users.level
FROM users
WHERE track.user_id = users.id
  AND track.active;
