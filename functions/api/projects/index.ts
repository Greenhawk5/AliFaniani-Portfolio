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

    // Aggregate real views per project from project_analytics_daily
    const viewsMap = new Map<string, number>()
    try {
      const viewRows = await env.DB
        .prepare(
          'SELECT project_slug, SUM(views) as total_views FROM project_analytics_daily GROUP BY project_slug'
        )
        .all<{ project_slug: string; total_views: number }>()
      for (const row of viewRows.results ?? []) {
        if (row.project_slug) {
          viewsMap.set(row.project_slug, row.total_views || 0)
        }
      }
    } catch {
      // Non-fatal if analytics table is not populated
    }

    const projects = (rows.results ?? [])
      .map((r) => {
        try {
          const p = JSON.parse(r.data)
          if (p && typeof p === 'object' && p.slug) {
            p.views = viewsMap.get(p.slug) ?? 0
          }
          return p
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
