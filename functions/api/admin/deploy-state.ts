/**
 * GET /api/admin/deploy-state — minimal deployment status for the admin UI.
 * Reports only CMS-side truth (queued / trigger_failed + timestamp). The CMS
 * never claims deployed/failed — Cloudflare Pages state is external and the
 * dashboard is the source for build results.
 */

import type { AdminEnv } from '../../lib/auth-env'
import { jsonResponse, unauthorizedResponse } from '../../lib/http'
import { requireSession } from '../../lib/session-auth'
import { readDeployState } from '../../lib/deploy-state'

type Env = AdminEnv

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireSession(request, env.DB)
  if (!context) return unauthorizedResponse()

  const state = await readDeployState(env.RATE_LIMIT)
  return jsonResponse({
    status: state?.status ?? null,
    requestedAt: state?.requestedAt ?? null,
    lastError: state?.lastError,
  })
}
