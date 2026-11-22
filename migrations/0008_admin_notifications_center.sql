-- Ali Faniani Portfolio — Migration 0008: Advanced Admin Notification Center
-- Adds read/archive tracking, pinning, custom administrator notifications,
-- destination links, priority levels, and deterministic deduplication source keys.

CREATE TABLE IF NOT EXISTS admin_notifications_dg_tmp (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('deploy', 'sync', 'security', 'content', 'system', 'custom')),
  severity        TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'normal', 'important')),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  metadata        TEXT CHECK (metadata IS NULL OR json_valid(metadata)),
  state           TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'acknowledged', 'dismissed', 'resolved', 'expired', 'archived', 'deleted')),
  created_at      TEXT NOT NULL,
  acknowledged_at TEXT,
  resolved_at     TEXT,
  expires_at      TEXT,
  read_at         TEXT,
  archived_at     TEXT,
  is_pinned       INTEGER NOT NULL DEFAULT 0,
  link_url        TEXT,
  source_key      TEXT,
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'critical'))
);

INSERT INTO admin_notifications_dg_tmp (
  id, type, severity, title, message, metadata, state, created_at, acknowledged_at, resolved_at, expires_at
)
SELECT id, type, severity, title, message, metadata, state, created_at, acknowledged_at, resolved_at, expires_at
FROM admin_notifications;

DROP TABLE admin_notifications;
ALTER TABLE admin_notifications_dg_tmp RENAME TO admin_notifications;

CREATE INDEX IF NOT EXISTS idx_notifications_state ON admin_notifications(state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_pinned ON admin_notifications(is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_source_key ON admin_notifications(source_key);

