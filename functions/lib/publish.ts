/**
 * Publish pipeline (Phase 5): promotes validated draft overlays into the
 * published `data` column atomically, then triggers the Pages deploy hook.
 *
 * Semantics:
 *   - ALL validation happens BEFORE any write: every row carrying draft_data
 *     is validated against the canonical Zod schemas and the media manifest.
 *     Any failure aborts the whole publish (nothing is promoted).
 *   - Promotion runs through db.batch([...]) — D1 executes batched statements
 *     atomically, so a mid-batch failure cannot leave half-published content.
 *   - Rows keep their state on publish: published rows stay published with
 *     the overlay content; archived rows keep archived (still excluded from
 *     the snapshot). Draft-only rows have no overlay, so publish is a no-op
 *     for them — publishing NEW content requires an explicit state change,
 *     which arrives with the content state endpoint in a later phase.
 *   - DEPLOY_HOOK_URL is read from the environment only — never returned,
 *     never logged. Trigger failure does NOT roll back the D1 publish.
 */

import { listContent, validatePayload, ValidationError } from './content-store'
export { ValidationError }
import type { ContentKind, ContentRecord } from './content-store'

export interface PublishTarget {
  kind: ContentKind
  key: string
  record: ContentRecord
}

export interface PublishPlan {
  targets: PublishTarget[]
}

/** Rows that publish will touch: records with a draft overlay (edits to
 * published content) AND draft-only records (never published — `data` is
 * their working copy). Both shapes promote in the same atomic batch. */
export function selectPublishTargets(records: ContentRecord[]): PublishTarget[] {
  return records
    .filter((r) => r.draftData !== null || r.state === 'draft')
    .map((record) => ({ kind: record.kind, key: record.key, record }))
}

/**
 * Validates all publish targets: per-kind Zod schema (slug↔key match
 * included) + media references against the manifest (except bundled
 * /assets/ Vite output). Throws ValidationError with aggregated issues.
 */
export function validatePublishTargets(
  targets: PublishTarget[],
  mediaManifest: Record<string, unknown>
): void {
  const issues: { path: string; message: string }[] = []

  for (const { kind, key, record } of targets) {
    // The working copy: draft overlay for published rows, data for draft-only rows.
    const draft = record.draftData ?? record.data
    try {
      validatePayload(kind, key, draft)
    } catch (error) {
      if (error instanceof ValidationError) {
        issues.push(
          ...error.issues.map((i) => ({ path: `${kind}:${key}.${i.path}`, message: i.message }))
        )
        continue
      }
      throw error
    }

    // Media references: banner/screenshots for projects, avatar for hero,
    // certificate images.
    const refs: string[] = []
    const draftObj = draft as Record<string, unknown>
    if (kind === 'project') {
      if (typeof draftObj.banner === 'string') refs.push(draftObj.banner)
      for (const shot of (draftObj.screenshots as { src?: string }[] | undefined) ?? []) {
        if (typeof shot?.src === 'string') refs.push(shot.src)
      }
    } else if (kind === 'profile-section' && key === 'hero') {
      if (typeof draftObj.avatarSrc === 'string') refs.push(draftObj.avatarSrc)
    } else if (kind === 'profile-section' && key === 'certificates') {
      for (const cert of (draftObj.items as { image?: string }[] | undefined) ?? []) {
        if (typeof cert?.image === 'string') refs.push(cert.image)
      }
    }
    for (const ref of refs) {
      if (!ref.startsWith('/assets/') && !mediaManifest[ref]) {
        issues.push({ path: `${kind}:${key}`, message: `media reference not in manifest: ${ref}` })
      }
    }
  }

  if (issues.length > 0) {
    throw new ValidationError('Publish validation failed.', issues)
  }
}

/** The atomic batch. Two shapes:
 *   - overlay promotion (published rows): draft_data → data, overlay cleared,
 *     state untouched;
 *   - draft-only promotion: state 'draft' → 'published', data already holds
 *     the working copy. Both bump version + set updated_at/published_at. */
export function buildPublishStatements(
  targets: PublishTarget[],
  nowIso: string
): { sql: string; params: unknown[] }[] {
  return targets.map(({ kind, key, record }) => {
    if (record.state === 'draft') {
      return {
        sql: `UPDATE content
              SET state = 'published', version = version + 1, updated_at = ?, published_at = ?
              WHERE kind = ? AND key = ? AND state = 'draft'`,
        params: [nowIso, nowIso, kind, key],
      }
    }
    const overlay = record as ContentRecord & { draftSortOrder?: number | null }
    const sortOrder = overlay.draftSortOrder ?? record.sortOrder
    return {
      sql: `UPDATE content
            SET data = ?, draft_data = NULL, draft_updated_at = NULL, draft_sort_order = NULL,
                sort_order = ?, version = version + 1, updated_at = ?, published_at = ?
            WHERE kind = ? AND key = ?`,
      params: [JSON.stringify(record.draftData), sortOrder, nowIso, nowIso, kind, key],
    }
  })
}

/** Convenience wrapper used by the endpoint: validates + returns the batch. */
export async function preparePublish(
  db: D1Database,
  mediaManifest: Record<string, unknown>,
  nowIso = new Date().toISOString()
): Promise<{ plan: PublishPlan; statements: unknown[] }> {
  const records = await listContent(db)
  const plan = { targets: selectPublishTargets(records) }
  if (plan.targets.length === 0) {
    return { plan, statements: [] }
  }
  validatePublishTargets(plan.targets, mediaManifest)
  return { plan, statements: buildPublishStatements(plan.targets, nowIso) as unknown[] }
}
