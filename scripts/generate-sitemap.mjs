import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Generates public/sitemap.xml from the canonical content snapshot.
 *
 * Project URLs derive from src/data/generated/content.json — the same
 * validated snapshot consumed by the public app (v2.0.0 CMS architecture),
 * so the sitemap cannot drift from actual published routes. Drafts and
 * archived projects never appear in the snapshot and therefore never appear
 * in the sitemap.
 *
 * Runs in the build pipeline AFTER snapshot export (Guardrail A order).
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const snapshotPath = resolve(root, 'src/data/generated/content.json')
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))

const slugs = snapshot.projects.map((project) => project.slug)
const uniqueSlugs = [...new Set(slugs)]

if (uniqueSlugs.length !== slugs.length) {
  throw new Error('Duplicate project slugs in content snapshot — refusing to write sitemap.')
}
if (uniqueSlugs.length === 0) {
  throw new Error('Content snapshot has no published projects — refusing to write an empty sitemap.')
}

const SITE_URL = 'https://alifaniani.ir'
// Derived from the snapshot's exportedAt (itself derived from row timestamps),
// so the sitemap is byte-stable across re-runs of unchanged content —
// required for idempotent repository synchronization.
const lastmod = (snapshot.exportedAt ?? new Date().toISOString()).slice(0, 10)

// Order: homepage, main pages, project details, contact, room experience.
const paths = ['/', '/about', '/projects', ...uniqueSlugs.map((slug) => `/projects/${slug}`), '/contact', '/room']

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map(
    (path) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>
`

writeFileSync(resolve(root, 'public/sitemap.xml'), xml)
console.log(`✓ sitemap.xml generated from snapshot — ${paths.length} URLs (${uniqueSlugs.length} project routes)`)
