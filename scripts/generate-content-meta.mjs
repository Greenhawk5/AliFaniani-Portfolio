import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Generates dist/_content_meta.json from the canonical content snapshot —
 * the single source of truth for the Pages middleware. Contains ONLY what
 * the middleware needs (route list + project slugs); no content bodies.
 *
 * The middleware reads this via env.ASSETS with an in-isolate memo cache,
 * replacing the hand-maintained ROUTES/PROJECT_SLUGS/ROUTE_SHELLS lists.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const snapshot = JSON.parse(readFileSync(resolve(root, 'src/data/generated/content.json'), 'utf8'))

const meta = {
  schemaVersion: 1,
  staticRoutes: ['/', '/about', '/projects', '/contact', '/room'],
  projectSlugs: snapshot.projects.map((p) => p.slug),
}

const outDir = resolve(root, 'dist')
mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, '_content_meta.json'), JSON.stringify(meta) + '\n')
console.log(`✓ _content_meta.json generated — ${meta.projectSlugs.length} project slugs`)
