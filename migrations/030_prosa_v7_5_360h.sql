-- Migration 030: Prosa V7.5 Flexible Sessions, 360h Fluency Meter & Save State

ALTER TABLE learner_profile
  ADD COLUMN IF NOT EXISTS session_duration_mode text NOT NULL DEFAULT 'lite_20',
  ADD COLUMN IF NOT EXISTS total_active_seconds bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paused_session_state jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS milestones_30h jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE learner_profile
  DROP CONSTRAINT IF EXISTS learner_profile_duration_mode_check;

ALTER TABLE learner_profile
  ADD CONSTRAINT learner_profile_duration_mode_check
  CHECK (session_duration_mode IN ('lite_20', 'pro_40', 'sprint_60'));
