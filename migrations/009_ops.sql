CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_key_not_blank CHECK (char_length(btrim(key)) > 0)
);

INSERT INTO app_settings (key, value)
VALUES ('generation_paused', 'false')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS ops_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind text NOT NULL,
  status text NOT NULL,
  message text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_events_kind_valid CHECK (kind IN ('gemini', 'lesson', 'audio', 'news', 'billing')),
  CONSTRAINT ops_events_status_valid CHECK (status IN ('ok', 'error', 'paused')),
  CONSTRAINT ops_events_message_not_blank CHECK (char_length(btrim(message)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_ops_events_created ON ops_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_events_kind_created ON ops_events (kind, created_at DESC);
