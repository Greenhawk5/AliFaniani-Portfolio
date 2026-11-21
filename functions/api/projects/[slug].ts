/**
 * GET /api/projects/:slug — public endpoint returning a single published project from D1.
 */

import type { PagesEnv } from '../../lib/auth-env'

export const onRequestGet: PagesFunction<PagesEnv, 'slug'> = async ({ params, env }) => {
  const slug = params.slug
  if (!env.DB || typeof slug !== 'string') {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'X-Robots-Tag': 'noindex' },
    })
  }

  try {
    const row = await env.DB
      .prepare("SELECT data FROM content WHERE kind = 'project' AND key = ? AND state = 'published'")
      .bind(slug)
      .first<{ data: string }>()

    if (!row || !row.data) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'X-Robots-Tag': 'noindex' },
      })
    }

    return new Response(row.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to retrieve project' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
