-- Phase 4: draft overlay columns.
--
-- Why: content UNIQUE(kind,key) + single data/state columns cannot hold a
-- draft and the currently-published version simultaneously (flipping state
-- to 'draft' would exclude the row from the public snapshot export).
-- The overlay keeps published `data` untouched until Phase 5 publish copies
-- draft_data into data — so admin edits can never leak into a build early.
--
-- Existing rows get NULL (passes the CHECK) — no data migration needed.

ALTER TABLE content ADD COLUMN draft_data TEXT
  CHECK (draft_data IS NULL OR json_valid(draft_data));
ALTER TABLE content ADD COLUMN draft_updated_at TEXT;
ALTER TABLE content ADD COLUMN draft_sort_order INTEGER;
