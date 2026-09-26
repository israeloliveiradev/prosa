BEGIN;

CREATE TABLE srs_sync_events (
  client_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES srs_cards (id) ON DELETE CASCADE,
  quality smallint NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT srs_sync_events_client_id_format CHECK (client_id ~ '^[a-zA-Z0-9_-]{8,80}$'),
  CONSTRAINT srs_sync_events_quality_valid CHECK (quality IN (0, 3, 4, 5))
);

CREATE INDEX idx_srs_sync_events_user_id ON srs_sync_events (user_id, applied_at DESC);

COMMIT;
