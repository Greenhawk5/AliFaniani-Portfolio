/**
 * /api/admin/media/stats — Aggregate Media Asset statistics.
 *
 * GET: Returns asset counts, storage bytes, and category breakdowns.
 */

import type { AdminEnv } from '../../../lib/auth-env'
import { jsonResponse, unauthorizedResponse } from '../../../lib/http'
import { requireSession } from '../../../lib/session-auth'
import { getMediaStats } from '../../../lib/media-store'

type Env = AdminEnv

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireSession(request, env.DB)
  if (!context) return unauthorizedResponse()

  const stats = await getMediaStats(env.DB)
  return jsonResponse(stats)
}

