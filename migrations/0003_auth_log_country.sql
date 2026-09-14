-- Phase: activity geo attribution.
-- Adds the authoritative edge country code (CF-IPCountry) to the audit
-- trail. NULL-safe: all historical rows keep NULL and the UI renders them
-- as "Not recorded". No data migration, no backfill, no row loss.
ALTER TABLE auth_log ADD COLUMN country TEXT;
