/**
 * /api/admin/content/:kind/:key — authenticated CMS content item endpoint.
 *
 *   GET     → full record (live data + draft overlay when present)
 *   PUT     → save edits (published rows go to the draft overlay; draft/
 *             archived rows edit data directly) — never publishes
 *   DELETE  → archive preferred (POST /archive); hard delete allowed only
 *             for draft/archived records
 *
 * Route params are validated against the content-kind enum and record
 * schemas before any SQL runs. All statements are prepared/bound.
 */

import { z } from 'zod'
import type { AdminEnv } from '../../../../lib/auth-env'
import { jsonResponse, unauthorizedResponse, badRequestResponse, clientIp } from '../../../../lib/http'
import { requireSession, requireMutationAuth } from '../../../../lib/session-auth'
import {
  getContent,
  upsertContent,
  archiveContent,
  discardDraft,
  deleteContent,
  ValidationError,
  NotFoundError,
  ConflictError,
  contentKindSchema,
} from '../../../../lib/content-store'
import { logAuthEvent, requestCountry } from '../../../../lib/auth-log'

type Env = AdminEnv

interface Params {
  kind: string
  key: string
}

/**
 * Route-param decoding differs across Pages runtimes: production hands
 * handlers percent-DECODED params, while miniflare (`wrangler pages dev`)
 * passes the RAW encoded segment through. A key like "Hugging Face"
 * therefore arrives as "Hugging%20Face" locally and misses the D1 row,
 * while in production it arrives already decoded.
 *
 * Decode at most once, guarded: only when the value still carries a
 * well-formed percent-escape. A literal '%' in a decoded key (which would
 * make decodeURIComponent throw) is returned untouched, so this can never
 * double-decode — 'Hugging%20Face' → 'Hugging Face', and 'Hugging Face' or
 * '100%sure' pass through unchanged. Verified: both shapes resolve to the
 * same D1 row (tests/admin-content.test.ts).
 */
function decodeParam(raw: string): string {
  if (/%[0-9A-Fa-f]{2}/.test(raw)) {
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  return raw
}

const updateSchema = z.object({
  data: z.unknown(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  ifUnmodifiedSince: z.string().datetime().optional(),
})

const discardSchema = z.object({ action: z.literal('discard') })

function parseParams(params: Params): { kind: 'project' | 'profile-section' | 'link'; key: string } | null {
  const kind = contentKindSchema.safeParse(params.kind)
  if (!kind.success) return null
  const key = decodeParam(params.key)
  if (!key || key.length > 120) return null
  return { kind: kind.data, key }
}

function errorResponse(error: unknown): Response {
  if (error instanceof ValidationError) {
    return jsonResponse({ ok: false, error: error.message, issues: error.issues }, 400)
  }
  if (error instanceof NotFoundError) {
    return jsonResponse({ ok: false, error: 'Content not found.' }, 404)
  }
  if (error instanceof ConflictError) {
    return jsonResponse({ ok: false, error: error.message }, 409)
  }
  return badRequestResponse('Could not modify content.')
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const context = await requireSession(request, env.DB)
  if (!context) return unauthorizedResponse()

  const parsed = parseParams(params as unknown as Params)
  if (!parsed) return badRequestResponse('Unknown content kind or invalid key.')

  const record = await getContent(env.DB, parsed.kind, parsed.key)
  if (!record) return jsonResponse({ ok: false, error: 'Content not found.' }, 404)

  return jsonResponse({
    content: {
      kind: record.kind,
      key: record.key,
      state: record.state,
      data: record.draftData ?? record.data, // editor edits the working copy
      liveData: record.state === 'published' ? record.data : null,
      hasDraft: record.draftData !== null,
      sortOrder: record.sortOrder,
      version: record.version,
      updatedAt: record.updatedAt,
      draftUpdatedAt: record.draftUpdatedAt,
      publishedAt: record.publishedAt,
    },
  })
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const context = await requireMutationAuth(request, env.DB)
  if (!context) return unauthorizedResponse()
  const ip = clientIp(request)
  const country = requestCountry(request)

  const parsed = parseParams(params as unknown as Params)
  if (!parsed) return badRequestResponse('Unknown content kind or invalid key.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequestResponse('Invalid request body.')
  }
  const bodyParsed = updateSchema.safeParse(body)
  if (!bodyParsed.success) {
    return jsonResponse(
      { ok: false, error: 'Validation failed.', issues: bodyParsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
      400
    )
  }

  try {
    const record = await upsertContent(env.DB, {
      kind: parsed.kind,
      key: parsed.key,
      data: bodyParsed.data.data,
      sortOrder: bodyParsed.data.sortOrder,
      ifUnmodifiedSince: bodyParsed.data.ifUnmodifiedSince,
    })
    await logAuthEvent(env.DB, 'content_updated', { ip, country, ok: true, note: `${record.kind}:${record.key}` })
    return jsonResponse({
      content: {
        kind: record.kind,
        key: record.key,
        state: record.state,
        hasDraft: record.draftData !== null,
        version: record.version,
        updatedAt: record.updatedAt,
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}

/**
 * POST with no (or unrecognized) body → archive (soft delete, existing
 * behavior). POST with { action: 'discard' } → discard unpublished changes:
 * clears the draft overlay (published/archived rows) so the record returns
 * to its last published state. `data` is NEVER modified; the published row,
 * the record itself, archives, media, and all other content are untouched.
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const context = await requireMutationAuth(request, env.DB)
  if (!context) return unauthorizedResponse()
  const ip = clientIp(request)
  const country = requestCountry(request)

  const parsed = parseParams(params as unknown as Params)
  if (!parsed) return badRequestResponse('Unknown content kind or invalid key.')

  // Archive calls send an empty POST (no body); discard sends a JSON body
  // with { action: 'discard' }. An empty JSON object '{}' is the legacy
  // archive shape (existing tests + older clients) and must still archive —
  // only a non-empty JSON object is interpreted as a discard attempt.
  let body: Record<string, unknown> | null = null
  try {
    const text = await request.text()
    if (text) body = JSON.parse(text) as Record<string, unknown>
  } catch {
    return badRequestResponse('Invalid request body.')
  }
  if (body !== null && Object.keys(body).length > 0) {
    const discard = discardSchema.safeParse(body)
    if (!discard.success) return badRequestResponse('Invalid request body.')
    try {
      const record = await discardDraft(env.DB, parsed.kind, parsed.key)
      await logAuthEvent(env.DB, 'content_draft_discarded', { ip, country, ok: true, note: `${record.kind}:${record.key}` })
      return jsonResponse({
        content: {
          kind: record.kind,
          key: record.key,
          state: record.state,
          hasDraft: record.draftData !== null,
          version: record.version,
          updatedAt: record.updatedAt,
        },
      })
    } catch (error) {
      return errorResponse(error)
    }
  }

  try {
    const record = await archiveContent(env.DB, parsed.kind, parsed.key)
    await logAuthEvent(env.DB, 'content_archived', { ip, country, ok: true, note: `${record.kind}:${record.key}` })
    return jsonResponse({ content: { kind: record.kind, key: record.key, state: record.state } })
  } catch (error) {
    return errorResponse(error)
  }
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const context = await requireMutationAuth(request, env.DB)
  if (!context) return unauthorizedResponse()
  const ip = clientIp(request)
  const country = requestCountry(request)

  const parsed = parseParams(params as unknown as Params)
  if (!parsed) return badRequestResponse('Unknown content kind or invalid key.')

  try {
    await deleteContent(env.DB, parsed.kind, parsed.key)
    await logAuthEvent(env.DB, 'content_deleted', { ip, country, ok: true, note: `${parsed.kind}:${parsed.key}` })
    return jsonResponse({ ok: true })
  } catch (error) {
    return errorResponse(error)
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: { Allow: 'GET, PUT, POST, DELETE, OPTIONS' } })
