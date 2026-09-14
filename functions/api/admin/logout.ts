/**
 * POST /api/admin/logout — invalidate the current session.
 * Requires a valid session + CSRF header (mutation). Deletes the D1 row
 * (immediate revocation), clears both cookies. Generic 401 when there is
 * nothing valid to log out — idempotent for the caller.
 */

import type { AdminEnv } from '../../lib/auth-env'
import { jsonResponse, unauthorizedResponse, clientIp } from '../../lib/http'
import { requireMutationAuth } from '../../lib/session-auth'
import { deleteSessionByToken, clearSessionCookie, clearCsrfCookie } from '../../lib/sessions'
import { logAuthEvent, requestCountry } from '../../lib/auth-log'

type Env = AdminEnv

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = clientIp(request)
  const country = requestCountry(request)
  const context = await requireMutationAuth(request, env.DB)
  if (!context) return unauthorizedResponse()

  await deleteSessionByToken(env.DB, context.sessionToken)
  await logAuthEvent(env.DB, 'logout', { ip, country, ok: true })

  const response = jsonResponse({ ok: true })
  response.headers.append('Set-Cookie', clearSessionCookie)
  response.headers.append('Set-Cookie', clearCsrfCookie)
  return response
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } })
