-- Ali Faniani Portfolio — Analytics & Notifications Schema (v2.3.0)
-- 1. page_view_events: Raw privacy-preserving event stream (hashed session token, no raw IP)
-- 2. analytics_daily: Aggregated daily path metrics
-- 3. project_analytics_daily: Aggregated daily project stats
-- 4. admin_notifications: Persistent admin alert lifecycle

CREATE TABLE IF NOT EXISTS page_view_events (
  id              TEXT PRIMARY KEY,
  session_hash    TEXT NOT NULL,
  path            TEXT NOT NULL,
  referrer        TEXT,
  country         TEXT,
  device_type     TEXT,
  is_bot          INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_view_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_view_events(path);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON page_view_events(session_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS analytics_daily (
  date            TEXT NOT NULL,
  path            TEXT NOT NULL,
  views           INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, path)
);

CREATE TABLE IF NOT EXISTS project_analytics_daily (
  date            TEXT NOT NULL,
  project_slug    TEXT NOT NULL,
  views           INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, project_slug)
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('deploy', 'sync', 'security', 'content', 'system')),
  severity        TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  metadata        TEXT CHECK (metadata IS NULL OR json_valid(metadata)),
  state           TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'acknowledged', 'resolved', 'expired')),
  created_at      TEXT NOT NULL,
  acknowledged_at TEXT,
  resolved_at     TEXT,
  expires_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_state ON admin_notifications(state, created_at DESC);
