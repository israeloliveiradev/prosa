CREATE TABLE IF NOT EXISTS usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task text NOT NULL,
  provider text NOT NULL,
  lane text NOT NULL,
  cached boolean NOT NULL DEFAULT false,
  cost_micros integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usage_events_provider CHECK (provider IN ('gemini', 'groq', 'openrouter', 'cache', 'edge')),
  CONSTRAINT usage_events_lane CHECK (lane IN ('full', 'cheap')),
  CONSTRAINT usage_events_task CHECK (char_length(btrim(task)) BETWEEN 2 AND 32),
  CONSTRAINT usage_events_cost CHECK (cost_micros >= 0)
);

CREATE INDEX IF NOT EXISTS usage_events_created_idx ON usage_events (created_at DESC);
