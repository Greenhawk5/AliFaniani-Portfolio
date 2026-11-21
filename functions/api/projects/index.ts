/**
 * GET /api/projects — public endpoint returning published projects from D1.
 * Supports dynamic publishing without rebuilding the static frontend.
 */

import type { PagesEnv } from '../../lib/auth-env'

export const onRequestGet: PagesFunction<PagesEnv> = async ({ env }) => {
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const rows = await env.DB
      .prepare(
        "SELECT data FROM content WHERE kind = 'project' AND state = 'published' ORDER BY sort_order ASC, key ASC"
      )
      .all<{ data: string }>()

    const projects = (rows.results ?? [])
      .map((r) => {
        try {
          return JSON.parse(r.data)
        } catch {
          return null
        }
      })
      .filter(Boolean)

    return new Response(JSON.stringify(projects), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to retrieve projects' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
