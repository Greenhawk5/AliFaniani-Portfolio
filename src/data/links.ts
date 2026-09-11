import snapshot from './generated/content.json'
import type { LinkItem } from './types'

/**
 * GENERATED FACADE — do not edit content here.
 *
 * CMS-managed content lives in D1 and reaches this module via the build-time
 * content snapshot (src/data/generated/content.json, produced by
 * scripts/export-d1-snapshot.mjs). During the Phase 2 migration window the
 * committed snapshot is kept in git; after cutover it is regenerated from
 * production D1 on every production build (fallback rules documented in the
 * exporter).
 *
 * Same named exports as the pre-CMS data module, so consumers are unchanged.
 */
export const socialLinks: readonly LinkItem[] = snapshot.links
