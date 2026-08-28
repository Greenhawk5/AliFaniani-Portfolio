import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Generates public/sitemap.xml from the real site routes.
 *
 * Project URLs are derived from src/data/projects.ts (the single source of
 * truth shared by the Projects page, detail pages and the 3D showcase board),
 * so the sitemap can no longer drift from the actual routes.
 *
 * Runs automatically before `npm run build` (see the "prebuild" script).
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const projectsSource = readFileSync(resolve(root, 'src/data/projects.ts'), 'utf8')
const slugs = [...new Set([...projectsSource.matchAll(/slug:\s*'([\w-]+)'/g)].map((m) => m[1]))]

if (slugs.length === 0) {
  throw new Error('No project slugs found in src/data/projects.ts — refusing to write an empty sitemap.')
}

const SITE_URL = 'https://alifaniani.ir'
const lastmod = new Date().toISOString().slice(0, 10)

// Order: homepage, main pages, project details, contact, room experience.
const paths = ['/', '/about', '/projects', ...slugs.map((slug) => `/projects/${slug}`), '/contact', '/room']

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
console.log(`✓ sitemap.xml generated — ${paths.length} URLs (${slugs.length} project routes)`)
