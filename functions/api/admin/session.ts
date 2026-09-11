/**
 * GET /api/admin/session — minimal auth-state probe for the admin SPA.
 * Returns ONLY { authenticated } (plus csrf/expiry for the caller's own
 * session when authenticated). Never returns secrets, tokens, or D1 data.
 * Probes are not logged (they occur on every admin page load).
 */

import type { AdminEnv } from '../../lib/auth-env'
import { jsonResponse } from '../../lib/http'
import { requireSession } from '../../lib/session-auth'

type Env = AdminEnv

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireSession(request, env.DB)

  if (!context) {
    return jsonResponse({ authenticated: false })
  }

  return jsonResponse({
    authenticated: true,
    csrfToken: context.csrfToken,
    expiresAt: context.expiresAt,
  })
}
