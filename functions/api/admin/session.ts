/**
 * /api/admin/session — auth-state probe & explicit keepalive endpoint.
 *
 * GET:
 *   Minimal auth-state probe for the admin SPA. Probes are non-mutating and pass
 *   isProbe: true so they never touch last_used_at. A background tab or passive
 *   polling will therefore NEVER keep an inactive session alive.
 *
 * POST:
 *   Explicit session keepalive (e.g. user clicks "Stay signed in" in the inactivity modal).
 *   Requires active CSRF header via requireMutationAuth. Immediately touches last_used_at
 *   and returns refreshed expiration timestamps.
 */

import type { AdminEnv } from '../../lib/auth-env'
import { jsonResponse, unauthorizedResponse } from '../../lib/http'
import { requireSession, requireMutationAuth } from '../../lib/session-auth'
import { forceTouchSession, findValidSession } from '../../lib/sessions'

type Env = AdminEnv

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  // Pass isProbe: true so background probes do not touch last_used_at
  const context = await requireSession(request, env.DB, { isProbe: true })

  if (!context) {
    return jsonResponse({ authenticated: false })
  }

  return jsonResponse({
    authenticated: true,
    csrfToken: context.csrfToken,
    expiresAt: context.expiresAt,
    idleExpiresAt: context.idleExpiresAt,
    absoluteExpiresAt: context.absoluteExpiresAt,
    lastUsedAt: context.lastUsedAt,
    createdAt: context.createdAt,
  })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireMutationAuth(request, env.DB)
  if (!context) {
    return unauthorizedResponse()
  }

  // Explicit user-driven refresh: immediately touch last_used_at
  await forceTouchSession(env.DB, context.tokenHash)
  const updated = await findValidSession(env.DB, context.sessionToken)

  return jsonResponse({
    ok: true,
    expiresAt: updated?.expiresAt ?? context.expiresAt,
    idleExpiresAt: updated?.idleExpiresAt ?? context.idleExpiresAt,
    absoluteExpiresAt: updated?.absoluteExpiresAt ?? context.absoluteExpiresAt,
    lastUsedAt: updated?.lastUsedAt ?? context.lastUsedAt,
  })
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: { Allow: 'GET, POST, OPTIONS' } })
