/**
 * /api/admin/content — authenticated CMS content collection endpoint.
 *
 *   GET  → list all content records (any state), trimmed response shape
 *   POST → create a record (draft by default; state validated against enum)
 *
 * Every request passes requireSession; POST additionally requires the CSRF
 * header via requireMutationAuth. Responses are no-store; errors are
 * client-safe (no D1 internals).
 */

import { z } from 'zod'
import type { AdminEnv } from '../../lib/auth-env'
import { jsonResponse, unauthorizedResponse, badRequestResponse, clientIp } from '../../lib/http'
import { requireSession, requireMutationAuth } from '../../lib/session-auth'
import { listContent, upsertContent, ValidationError, ConflictError } from '../../lib/content-store'
import { logAuthEvent, requestCountry } from '../../lib/auth-log'

type Env = AdminEnv

/** Trimmed list item: identity + state + freshness, no payload bodies. */
function listItem(record: Awaited<ReturnType<typeof listContent>>[number]) {
  return {
    kind: record.kind,
    key: record.key,
    state: record.state,
    sortOrder: record.sortOrder,
    version: record.version,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    hasDraft: record.draftData !== null,
    draftUpdatedAt: record.draftUpdatedAt,
  }
}

const createSchema = z.object({
  kind: z.enum(['project', 'profile-section', 'link']),
  key: z.string().min(1).max(120),
  data: z.unknown(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
})

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireSession(request, env.DB)
  if (!context) return unauthorizedResponse()

  const records = await listContent(env.DB)
  return jsonResponse({ items: records.map(listItem) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireMutationAuth(request, env.DB)
  if (!context) return unauthorizedResponse()
  const ip = clientIp(request)
  const country = requestCountry(request)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequestResponse('Invalid request body.')
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse(
      { ok: false, error: 'Validation failed.', issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
      400
    )
  }

  try {
    const record = await upsertContent(env.DB, {
      kind: parsed.data.kind,
      key: parsed.data.key,
      data: parsed.data.data,
      state: 'draft',
      sortOrder: parsed.data.sortOrder,
    })
    await logAuthEvent(env.DB, 'content_created', { ip, country, ok: true, note: `${record.kind}:${record.key}` })
    return jsonResponse({ content: { kind: record.kind, key: record.key, state: record.state } }, 201)
  } catch (error) {
    if (error instanceof ValidationError) {
      return jsonResponse({ ok: false, error: error.message, issues: error.issues }, 400)
    }
    if (error instanceof ConflictError) {
      return jsonResponse({ ok: false, error: error.message }, 409)
    }
    // Unknown/unsupported input failures (e.g. Zod enum throws) → 400
    return badRequestResponse('Could not create content.')
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: { Allow: 'GET, POST, OPTIONS' } })
