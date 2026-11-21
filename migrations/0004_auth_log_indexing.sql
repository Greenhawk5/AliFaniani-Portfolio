-- Migration 0004: Index auth_log for chronological Activity queries.
-- Speeds up Activity timeline and summary retrieval; prevents table scans.

CREATE INDEX IF NOT EXISTS idx_auth_log_ts ON auth_log(ts DESC);

