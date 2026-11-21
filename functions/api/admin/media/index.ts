/**
 * /api/admin/media — Media Asset collection endpoint.
 *
 * GET: Lists media assets with search, category filtering, and pagination.
 */

import type { AdminEnv } from '../../../lib/auth-env'
import { jsonResponse, unauthorizedResponse } from '../../../lib/http'
import { requireSession } from '../../../lib/session-auth'
import { listMediaAssets } from '../../../lib/media-store'

type Env = AdminEnv

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireSession(request, env.DB)
  if (!context) return unauthorizedResponse()

  const url = new URL(request.url)
  const category = url.searchParams.get('category') || undefined
  const search = url.searchParams.get('search') || undefined
  const limit = url.searchParams.has('limit') ? Number(url.searchParams.get('limit')) : 50
  const offset = url.searchParams.has('offset') ? Number(url.searchParams.get('offset')) : 0

  const data = await listMediaAssets(env.DB, { category, search, limit, offset })
  return jsonResponse(data)
}
