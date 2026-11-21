-- Ali Faniani Portfolio — Migration 0007: Support 'dismissed' in admin_notifications lifecycle
CREATE TABLE IF NOT EXISTS admin_notifications_dg_tmp (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('deploy', 'sync', 'security', 'content', 'system')),
  severity        TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  metadata        TEXT CHECK (metadata IS NULL OR json_valid(metadata)),
  state           TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'acknowledged', 'dismissed', 'resolved', 'expired')),
  created_at      TEXT NOT NULL,
  acknowledged_at TEXT,
  resolved_at     TEXT,
  expires_at      TEXT
);

INSERT INTO admin_notifications_dg_tmp SELECT * FROM admin_notifications;
DROP TABLE admin_notifications;
ALTER TABLE admin_notifications_dg_tmp RENAME TO admin_notifications;
CREATE INDEX IF NOT EXISTS idx_notifications_state ON admin_notifications(state, created_at DESC);
