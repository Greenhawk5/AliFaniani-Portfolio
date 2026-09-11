-- Ali Faniani Portfolio CMS — initial schema (v2.0.0 Phase 1)
-- Content model: JSON-blob-per-entity. `data` holds JSON validated against
-- the Zod content schemas at the admin API boundary and again at build time;
-- these CHECK constraints are the last-resort integrity layer.

CREATE TABLE content (
  id            TEXT PRIMARY KEY,                -- '{kind}:{key}' e.g. 'project:greenhawk-ai'
  kind          TEXT NOT NULL CHECK (kind IN ('project', 'profile-section', 'link')),
  key           TEXT NOT NULL,                   -- slug (projects) | section id (profile) | label (links)
  data          TEXT NOT NULL CHECK (json_valid(data)),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  state         TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'published', 'archived')),
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  published_at  TEXT,
  UNIQUE (kind, key)                             -- duplicate project slugs / section keys impossible
);

CREATE INDEX idx_content_public  ON content(kind, state, sort_order);
CREATE INDEX idx_content_updated ON content(updated_at);

-- Opaque sessions: D1 stores only SHA-256(token); the raw token lives solely
-- in the HttpOnly/Secure/SameSite=Strict cookie. csrf_hash backs the
-- X-CSRF-Token check on all mutating admin requests.
CREATE TABLE sessions (
  token_hash   TEXT PRIMARY KEY,
  csrf_hash    TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  ip           TEXT,
  ua           TEXT
);

CREATE INDEX idx_sessions_expiry ON sessions(expires_at);

-- Lightweight security audit trail for logins and admin writes.
CREATE TABLE auth_log (
  ts   TEXT NOT NULL,
  ip   TEXT,
  ok   INTEGER,
  note TEXT
);
