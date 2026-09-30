CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sector text NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_name_len CHECK (char_length(btrim(name)) BETWEEN 2 AND 40),
  CONSTRAINT organizations_sector CHECK (sector IN ('technology', 'health', 'sales'))
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role text NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id),
  UNIQUE (user_id),
  CONSTRAINT org_members_role CHECK (role IN ('owner', 'hr', 'member'))
);

CREATE TABLE IF NOT EXISTS org_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  target_lang text NOT NULL,
  phrase text NOT NULL,
  gloss text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, target_lang, phrase),
  CONSTRAINT org_terms_lang CHECK (target_lang IN ('en', 'es', 'de', 'ru', 'fr', 'it', 'ja')),
  CONSTRAINT org_terms_phrase_len CHECK (char_length(btrim(phrase)) BETWEEN 2 AND 40)
);

CREATE INDEX IF NOT EXISTS org_members_org_idx ON org_members (org_id);
CREATE INDEX IF NOT EXISTS org_terms_org_lang_idx ON org_terms (org_id, target_lang);
