/**
 * GET /api/admin/analytics — authenticated administration metrics and popular projects.
 */

import { jsonResponse, unauthorizedResponse } from '../../lib/http'
import { requireSession } from '../../lib/session-auth'
import { getAdminAnalytics } from '../../lib/analytics'
import type { AdminEnv } from '../../lib/auth-env'

type Env = AdminEnv

export async function onRequestGet({
  request,
  env,
}: {
  request: Request
  env: Env
}): Promise<Response> {
  if (!env.DB) {
    return jsonResponse({ error: 'Database unavailable' }, 503)
  }

  const auth = await requireSession(request, env.DB)
  if (!auth) {
    return unauthorizedResponse()
  }

  const url = new URL(request.url)
  const daysParam = parseInt(url.searchParams.get('days') || '30', 10)
  const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 90 ? daysParam : 30

  const data = await getAdminAnalytics(env.DB, days)

  return jsonResponse(data, 200, {
    'Cache-Control': 'no-store',
  })
}
