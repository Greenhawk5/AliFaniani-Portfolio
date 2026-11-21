-- Ali Faniani Portfolio CMS — Media Assets schema (v2.2.0 Phase 2)
-- Tracks Cloudflare R2 uploaded media, metadata, dimensions, and reference state.

CREATE TABLE media_assets (
  id             TEXT PRIMARY KEY,
  r2_key         TEXT NOT NULL UNIQUE,
  url            TEXT NOT NULL UNIQUE,
  original_name  TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  mime_type      TEXT NOT NULL,
  bytes          INTEGER NOT NULL,
  width          INTEGER,
  height         INTEGER,
  category       TEXT NOT NULL CHECK (category IN ('project', 'profile', 'certificate', 'misc')),
  associated_key TEXT,
  state          TEXT NOT NULL DEFAULT 'ready' CHECK (state IN ('ready', 'deleting', 'deleted')),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_category ON media_assets(category);
CREATE INDEX IF NOT EXISTS idx_media_created  ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_state    ON media_assets(state);
CREATE INDEX IF NOT EXISTS idx_media_r2_key   ON media_assets(r2_key);
