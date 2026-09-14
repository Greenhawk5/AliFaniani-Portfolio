/**
 * Content CRUD over the D1 `content` table — the single implementation every
 * admin content endpoint calls. The canonical Zod schemas
 * (src/lib/content-schema.ts) are imported directly: wrangler bundles
 * Functions with esbuild, so the TS module compiles into the function bundle
 * (server-side only — the public Vite build never touches functions/).
 *
 * Data model (see migrations/0002_add_draft_columns.sql):
 *   - published/archived rows: `data` holds the LIVE content; edits go to the
 *     draft overlay (draft_data/draft_updated_at/draft_sort_order) so the
 *     public snapshot can never change until Phase 5 publish copies the
 *     overlay into `data`.
 *   - draft rows (never published): `data` IS the working copy — the overlay
 *     stays NULL until first publish.
 *
 * All statements are prepared with bound parameters; kind/key/state values
 * are enum-validated before they ever reach SQL.
 */

import {
  contentKindSchema,
  contentStateSchema,
  projectSchema,
  profileSectionSchemas,
  linkSchema,
  slugSchema,
} from '../../src/lib/content-schema'

export { contentKindSchema, contentStateSchema }

export type ContentKind = 'project' | 'profile-section' | 'link'
export type ContentState = 'draft' | 'published' | 'archived'

/** The authoritative schemas, re-exported for endpoint use. */
const schemas = { contentKindSchema, contentStateSchema, projectSchema, profileSectionSchemas, linkSchema, slugSchema }
export function getSchemas() {
  return schemas
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public issues: { path: string; message: string }[] = []
  ) {
    super(message)
  }
}

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

/** Formats Zod issues into stable, client-safe field errors. */
function zodIssues(error: { issues: unknown[] }): { path: string; message: string }[] {
  return (error.issues as { path: (string | number)[]; message: string }[]).map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }))
}

export interface ContentRecord {
  kind: ContentKind
  key: string
  state: ContentState
  /** live content (published) or working copy (draft rows) */
  data: unknown
  /** draft overlay when present (published/archived rows only) */
  draftData: unknown | null
  draftUpdatedAt: string | null
  sortOrder: number
  version: number
  updatedAt: string
  publishedAt: string | null
}

interface RawRow {
  id: string
  kind: string
  key: string
  data: string
  sort_order: number
  state: string
  version: number
  created_at: string
  updated_at: string
  published_at: string | null
  draft_data: string | null
  draft_updated_at: string | null
  draft_sort_order: number | null
}

function rowToRecord(row: RawRow): ContentRecord {
  return {
    kind: row.kind as ContentKind,
    key: row.key,
    state: row.state as ContentState,
    data: JSON.parse(row.data),
    draftData: row.draft_data ? JSON.parse(row.draft_data) : null,
    draftUpdatedAt: row.draft_updated_at,
    sortOrder: row.sort_order,
    version: row.version,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  }
}

/** Validates a data payload against the schema for its kind. Throws
 * ValidationError with field paths on failure. */
export function validatePayload(
  kind: ContentKind,
  key: string,
  data: unknown
): void {
  if (kind === 'project') {
    const result = schemas.projectSchema.safeParse(data)
    if (!result.success) throw new ValidationError('Validation failed.', zodIssues(result.error!))
    const parsed = result.data as { slug: string }
    if (parsed.slug !== key) {
      throw new ValidationError('Validation failed.', [
        { path: 'slug', message: `payload slug '${parsed.slug}' does not match record key '${key}'` },
      ])
    }
  } else if (kind === 'profile-section') {
    const section =
      schemas.profileSectionSchemas[key as keyof typeof schemas.profileSectionSchemas]
    if (!section) throw new ValidationError(`Unknown profile section '${key}'.`)
    const result = section.safeParse(data)
    if (!result.success) throw new ValidationError('Validation failed.', zodIssues(result.error!))
  } else {
    const result = schemas.linkSchema.safeParse(data)
    if (!result.success) throw new ValidationError('Validation failed.', zodIssues(result.error!))
  }
}

/* --------------------------------- queries --------------------------------- */

export async function listContent(db: D1Database): Promise<ContentRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT id, kind, key, data, sort_order, state, version, created_at, updated_at, published_at,
              draft_data, draft_updated_at, draft_sort_order
       FROM content
       ORDER BY kind, sort_order, key`
    )
    .all<RawRow>()
  return results.map(rowToRecord)
}

export async function getContent(db: D1Database, kind: ContentKind, key: string): Promise<ContentRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, kind, key, data, sort_order, state, version, created_at, updated_at, published_at,
              draft_data, draft_updated_at, draft_sort_order
       FROM content WHERE kind = ? AND key = ?`
    )
    .bind(kind, key)
    .first<RawRow>()
  return row ? rowToRecord(row) : null
}

/* -------------------------------- mutations -------------------------------- */

export interface UpsertInput {
  kind: ContentKind
  key: string
  data: unknown
  state?: ContentState
  sortOrder?: number
  /** client's last seen updated_at — reject stale writes (optimistic concurrency) */
  ifUnmodifiedSince?: string
}

/** Create or update a content record. Enforces the draft-overlay rules. */
export async function upsertContent(db: D1Database, input: UpsertInput): Promise<ContentRecord> {
  const kind = schemas.contentKindSchema.parse(input.kind) as ContentKind
  const key =
    kind === 'project' ? schemas.slugSchema.parse(input.key) : String(input.key).slice(0, 120)
  const state = (input.state ? schemas.contentStateSchema.parse(input.state) : 'draft') as ContentState

  const existing = await getContent(db, kind, key)

  // Optimistic concurrency: reject writes based on a stale read.
  if (existing && input.ifUnmodifiedSince && existing.updatedAt !== input.ifUnmodifiedSince) {
    throw new ConflictError('Record was modified by another request.')
  }

  const now = new Date().toISOString()

  if (!existing) {
    // New record: validate against its kind schema, insert as draft (or the
    // explicitly provided state). No overlay.
    validatePayload(kind, key, input.data)
    await db
      .prepare(
        `INSERT INTO content (id, kind, key, data, sort_order, state, version, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .bind(
        `${kind}:${key}`,
        kind,
        key,
        JSON.stringify(input.data),
        input.sortOrder ?? 0,
        state,
        now,
        now,
        state === 'published' ? now : null
      )
      .run()
    return (await getContent(db, kind, key))!
  }

  if (existing.state === 'published') {
    // Live content: edits go to the overlay; `data`/state stay untouched so
    // the public snapshot is unaffected until Phase 5 publish.
    validatePayload(kind, key, input.data)
    await db
      .prepare(
        `UPDATE content SET draft_data = ?, draft_updated_at = ?, draft_sort_order = ?, version = version + 1
         WHERE kind = ? AND key = ?`
      )
      .bind(JSON.stringify(input.data), now, input.sortOrder ?? existing.sortOrder, kind, key)
      .run()
  } else {
    // Draft or archived rows edit `data` directly (draft = working copy;
    // archived = not exported, so direct edits are safe).
    validatePayload(kind, key, input.data)
    await db
      .prepare(
        `UPDATE content SET data = ?, sort_order = ?, version = version + 1, updated_at = ?
         WHERE kind = ? AND key = ?`
      )
      .bind(JSON.stringify(input.data), input.sortOrder ?? existing.sortOrder, now, kind, key)
      .run()
  }
  return (await getContent(db, kind, key))!
}

/**
 * Discard unpublished changes — the inverse of the draft-overlay write path.
 * Clears draft_data/draft_updated_at/draft_sort_order so the record returns
 * to exactly its last published state. `data` is never read and never
 * written here: live content cannot change through this path by
 * construction. Draft-only rows (state 'draft') have no published baseline,
 * so discarding is a no-op that returns the record unchanged. Version is
 * bumped so optimistic-concurrency clients invalidate their stale reads.
 */
export async function discardDraft(db: D1Database, kind: ContentKind, key: string): Promise<ContentRecord> {
  const existing = await getContent(db, kind, key)
  if (!existing) throw new NotFoundError(`No ${kind} '${key}'.`)
  if (existing.state === 'draft') return existing
  await db
    .prepare(
      `UPDATE content SET draft_data = NULL, draft_updated_at = NULL, draft_sort_order = NULL,
       version = version + 1, updated_at = ? WHERE kind = ? AND key = ?`
    )
    .bind(new Date().toISOString(), kind, key)
    .run()
  return (await getContent(db, kind, key))!
}

/** Archive (soft delete) — preferred over hard delete per the content model. */
export async function archiveContent(db: D1Database, kind: ContentKind, key: string): Promise<ContentRecord> {
  const existing = await getContent(db, kind, key)
  if (!existing) throw new NotFoundError(`No ${kind} '${key}'.`)
  if (existing.draftData !== null) {
    throw new ConflictError('Record has unpublished draft changes — publish or discard them first.')
  }
  await db
    .prepare(`UPDATE content SET state = 'archived', version = version + 1, updated_at = ? WHERE kind = ? AND key = ?`)
    .bind(new Date().toISOString(), kind, key)
    .run()
  return (await getContent(db, kind, key))!
}

/** Hard delete: drafts and archived records only — never published content. */
export async function deleteContent(db: D1Database, kind: ContentKind, key: string): Promise<void> {
  const existing = await getContent(db, kind, key)
  if (!existing) throw new NotFoundError(`No ${kind} '${key}'.`)
  if (existing.state === 'published') {
    throw new ConflictError('Published content must be archived before deletion.')
  }
  await db.prepare(`DELETE FROM content WHERE kind = ? AND key = ?`).bind(kind, key).run()
}
