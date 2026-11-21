/**
 * /sitemap.xml — Dynamic sitemap with D1 live synchronization.
 * Serves static sitemap entries and dynamically merges any newly published
 * projects from D1 that have not yet had a Pages build run.
 */

import type { PagesEnv } from './lib/auth-env'

export const onRequestGet: PagesFunction<PagesEnv> = async ({ request, env }) => {
  let xml = ''
  try {
    const res = await env.ASSETS.fetch(new URL('/sitemap.xml', request.url).toString())
    if (res.status === 200) {
      xml = await res.text()
    }
  } catch {}

  if (!xml) {
    xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>`
  }

  if (env.DB) {
    try {
      const rows = await env.DB
        .prepare("SELECT key, updated_at FROM content WHERE kind = 'project' AND state = 'published'")
        .all<{ key: string; updated_at: string }>()

      const entriesToAdd: string[] = []
      for (const row of rows.results ?? []) {
        const loc = `https://alifaniani.ir/projects/${row.key}`
        if (!xml.includes(`<loc>${loc}</loc>`)) {
          const date = (row.updated_at || new Date().toISOString()).slice(0, 10)
          entriesToAdd.push(`  <url>\n    <loc>${loc}</loc>\n    <lastmod>${date}</lastmod>\n  </url>`)
        }
      }

      if (entriesToAdd.length > 0) {
        xml = xml.replace('</urlset>', `${entriesToAdd.join('\n')}\n</urlset>`)
      }
    } catch {}
  }

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
