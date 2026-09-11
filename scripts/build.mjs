import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Build orchestrator — enforces the mandatory Guardrail A pipeline order
 * explicitly (no reliance on npm script chaining):
 *
 *   1. generate-version        (src/version.ts from package.json)
 *   2. generate media manifest (before snapshot validation)
 *   3. export D1 snapshot      (REST in production; --local/--committed elsewhere)
 *   4. validate snapshot       (inside the exporter: Zod + media manifest)
 *   5. generate sitemap        (from the canonical snapshot)
 *   6. TypeScript check + Vite build (also copies media into dist/media/)
 *   7. generate route HTML shells
 *   8. generate _content_meta.json (from the same snapshot)
 *   9. final verification      (bundle isolation, _routes.json, media copy)
 *
 * Snapshot mode: CMS_SNAPSHOT_MODE=strict → snapshot failures fail the build
 * (post-cutover production). Default 'warn' → committed snapshot fallback
 * (migration window, local dev, previews).
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function step(name, args, { env = {}, optional = false } = {}) {
  console.log(`\n=== ${name} ===`)
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  if (result.status !== 0) {
    if (optional) {
      console.warn(`⚠ ${name} failed (continuing)`)
      return false
    }
    console.error(`✗ ${name} failed — build aborted`)
    process.exit(result.status ?? 1)
  }
  return true
}

/* 1 — version */
step('generate version', ['scripts/generate-version.mjs'])

/* 2 — media manifest (must exist before snapshot validation) */
step('generate media manifest', ['scripts/generate-media-manifest.mjs'])

/* 3+4 — snapshot export + validation (order enforced inside the exporter) */
if (process.env.CMS_SNAPSHOT_LOCAL === '1') {
  step('export D1 snapshot (local)', ['scripts/export-d1-snapshot.mjs', '--local'])
} else {
  step('export D1 snapshot', ['scripts/export-d1-snapshot.mjs'])
}

/* 5 — sitemap from the canonical snapshot */
step('generate sitemap', ['scripts/generate-sitemap.mjs'])

/* 6 — TypeScript + Vite */
const tsc = spawnSync('npx', ['tsc', '-b'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
if (tsc.status !== 0) {
  console.error('✗ TypeScript build failed — build aborted')
  process.exit(tsc.status ?? 1)
}
const vite = spawnSync('npx', ['vite', 'build'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' })
if (vite.status !== 0) {
  console.error('✗ vite build failed — build aborted')
  process.exit(vite.status ?? 1)
}

/* 6b — copy media into dist/media/ (stable /media/ URLs) */
step('copy media to dist', ['scripts/copy-media.mjs'])

/* 7 — route HTML shells */
step('generate route HTML', ['scripts/generate-route-html.mjs'])

/* 8 — _content_meta.json from the canonical snapshot */
step('generate content meta', ['scripts/generate-content-meta.mjs'])

/* 9 — final verification */
step('final verification', ['scripts/verify-build.mjs'])

console.log('\n✓ build complete')
