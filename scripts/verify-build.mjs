import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Final build verification (Guardrail A step 9).
 * Fails the build when any check fails — no silent passes.
 *
 * Checks:
 *   1. dist/_routes.json present (Functions invocation bypass for statics)
 *   2. dist/_content_meta.json present and consistent with the snapshot
 *   3. dist/media/ populated (every manifest entry exists as a file)
 *   4. Bundle isolation: public chunks contain NO zod runtime, no server
 *      secret names, no admin-only markers
 *   5. sitemap.xml present with the snapshot's project URLs
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')

const failures = []
const check = (ok, message) => {
  console.log(`${ok ? '✓' : '✗'} ${message}`)
  if (!ok) failures.push(message)
}

/* 1 — _routes.json */
const routesPath = join(dist, '_routes.json')
check(existsSync(routesPath), '_routes.json present in dist')
if (existsSync(routesPath)) {
  const routes = JSON.parse(readFileSync(routesPath, 'utf8'))
  check(
    Array.isArray(routes.exclude) && routes.exclude.length > 0,
    '_routes.json excludes static assets from Function invocation'
  )
}

/* 2 — _content_meta.json consistency */
const metaPath = join(dist, '_content_meta.json')
check(existsSync(metaPath), '_content_meta.json present in dist')
if (existsSync(metaPath) && existsSync(resolve(root, 'src/data/generated/content.json'))) {
  const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
  const snapshot = JSON.parse(readFileSync(resolve(root, 'src/data/generated/content.json'), 'utf8'))
  const same =
    meta.projectSlugs.length === snapshot.projects.length &&
    meta.projectSlugs.every((slug, i) => slug === snapshot.projects[i]?.slug)
  check(same, '_content_meta.json slugs match the canonical snapshot')
}

/* 3 — media copied */
const manifestPath = resolve(root, 'public/media-manifest.json')
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const missing = Object.keys(manifest.media).filter((url) => !existsSync(join(dist, url.replace(/^\//, ''))))
  check(missing.length === 0, `dist/media complete (${Object.keys(manifest.media).length} files)${missing.length ? ' — missing: ' + missing.slice(0, 3).join(', ') : ''}`)
} else {
  failures.push('media manifest missing')
}

/* 4 — bundle isolation */
const assetsDir = join(dist, 'assets')
const jsChunks = existsSync(assetsDir)
  ? readdirSync(assetsDir).filter((f) => f.endsWith('.js')).map((f) => join(assetsDir, f))
  : []
const forbidden = [
  { needle: 'ADMIN_PASSWORD', label: 'ADMIN_PASSWORD secret name' },
  { needle: 'DEPLOY_HOOK_URL', label: 'DEPLOY_HOOK_URL secret name' },
  { needle: 'CLOUDFLARE_D1_READ_TOKEN', label: 'CLOUDFLARE_D1_READ_TOKEN secret name' },
  { needle: 'GITHUB_SYNC_TOKEN', label: 'GITHUB_SYNC_TOKEN secret name' },
  { needle: 'api.cloudflare.com/client/v4', label: 'Cloudflare API endpoint (server-only)' },
  { needle: 'af_admin', label: 'admin session cookie marker' },
]
// Zod runtime markers (distinctive strings from the zod bundle)
const zodMarkers = ['ZodError', 'invalid_type', 'ZodFirstPartyTypeKind', 'get error message']
let zodHits = []
for (const chunk of jsChunks) {
  const content = readFileSync(chunk, 'utf8')
  for (const { needle, label } of forbidden) {
    if (content.includes(needle)) failures.push(`${label} found in public chunk ${chunk.split(/[\\/]/).pop()}`)
  }
  for (const marker of zodMarkers) {
    if (content.includes(marker)) zodHits.push(`${marker} in ${chunk.split(/[\\/]/).pop()}`)
  }
}
check(jsChunks.length > 0, `scanned ${jsChunks.length} public JS chunks for secrets/admin markers`)
check(zodHits.length === 0, `no zod runtime in public chunks${zodHits.length ? ' — ' + zodHits.join('; ') : ''}`)

/* 5 — sitemap */
const sitemap = existsSync(join(dist, 'sitemap.xml')) ? readFileSync(join(dist, 'sitemap.xml'), 'utf8') : ''
check(sitemap.includes('<urlset'), 'sitemap.xml present')
if (existsSync(resolve(root, 'src/data/generated/content.json'))) {
  const snapshot = JSON.parse(readFileSync(resolve(root, 'src/data/generated/content.json'), 'utf8'))
  const missingUrls = snapshot.projects.filter((p) => !sitemap.includes(`/projects/${p.slug}`))
  check(missingUrls.length === 0, `sitemap covers all ${snapshot.projects.length} published project URLs`)
}

if (failures.length > 0) {
  console.error(`\n✗ build verification FAILED (${failures.length}):\n  - ${failures.join('\n  - ')}`)
  process.exit(1)
}
console.log('\n✓ build verification passed')
