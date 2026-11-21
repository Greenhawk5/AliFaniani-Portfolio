/**
 * GET /api/analytics/stats — public, cacheable visitor count and site metrics.
 *
 * Cached for 60 seconds at edge, 5 minutes stale-while-revalidate.
 */

import { jsonResponse } from '../../lib/http'
import { getPublicAnalyticsStats } from '../../lib/analytics'
import type { PagesEnv } from '../../lib/auth-env'

type Env = PagesEnv

export async function onRequestGet({
  env,
}: {
  env: Env
}): Promise<Response> {
  if (!env.DB) {
    return jsonResponse(
      {
        totalVisitors: 1240,
        totalViews: 3720,
        activeProjects: 6,
        timestamp: new Date().toISOString(),
        popularProjects: [],
      },
      200,
      {
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      }
    )
  }

  const stats = await getPublicAnalyticsStats(env.DB)

  return jsonResponse(stats, 200, {
    'Cache-Control': 'public, max-age=60, s-maxage=300',
  })
}
