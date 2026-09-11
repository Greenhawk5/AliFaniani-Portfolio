import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

/**
 * Content migration: existing TypeScript data → D1 content rows.
 * Deterministic and idempotent (INSERT OR REPLACE on the UNIQUE(kind,key) id).
 *
 * Modes:
 *   --local   applies to the local D1 (wrangler d1 execute --local) [default]
 *   --remote  generates seeds/<timestamp>_seed_content.sql and prints the
 *             exact wrangler command to run against the REMOTE database.
 *             Seeds are explicit operations, never schema migrations —
 *             `wrangler d1 migrations apply` must not touch them.
 *             (The build token is read-only, so remote seeding goes through
 *             wrangler with your authenticated CLI session — no secrets in
 *             the repo, no extra write token needed.)
 *   --dry-run validates and prints the parity report without writing.
 *
 * Record layout (matches migrations/0001_init.sql):
 *   project:<slug>          kind=project          data=Project JSON
 *   profile-section:<key>   kind=profile-section  data=section JSON
 *   link:<label>            kind=link             data=Link JSON
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MEDIA_MANIFEST = resolve(root, 'public/media-manifest.json')

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const remote = args.has('--remote')

/* ------------------------------- load sources ------------------------------ */

async function loadContentSources() {
  const vite = await createServer({
    configFile: false,
    root,
    logLevel: 'error',
    resolve: { alias: { '@': resolve(root, 'src') } },
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
  })
  const loaded = await vite.ssrLoadModule('/scripts/lib/collect-current-content.ts')
  await vite.close()
  return loaded
}

async function loadSchemas() {
  const vite = await createServer({
    configFile: false,
    root,
    logLevel: 'error',
    resolve: { alias: { '@': resolve(root, 'src') } },
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
  })
  const schema = await vite.ssrLoadModule('/src/lib/content-schema.ts')
  await vite.close()
  return schema
}

/* --------------------------------- helpers -------------------------------- */

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function rowValues({ id, kind, key, data, sortOrder, state, version, createdAt, updatedAt, publishedAt }) {
  return [
    sqlString(id),
    sqlString(kind),
    sqlString(key),
    sqlString(data),
    String(sortOrder),
    sqlString(state),
    String(version),
    sqlString(createdAt),
    sqlString(updatedAt),
    publishedAt ? sqlString(publishedAt) : 'NULL',
  ].join(', ')
}

/**
 * Post-cutover source: the committed snapshot (src/data/generated/content.json).
 * Used when the TS data files are already generated facades (the normal state
 * after Phase 2) — re-seeding D1 from its own validated export.
 */
function collectFromSnapshot() {
  const snapshotPath = resolve(root, 'src/data/generated/content.json')
  if (!existsSync(snapshotPath)) {
    throw new Error('No committed snapshot at src/data/generated/content.json — nothing to seed from.')
  }
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))
  return {
    projects: snapshot.projects,
    profile: snapshot.profile,
    links: snapshot.links,
    sourceMeta: {
      projectCount: snapshot.projects.length,
      projectSlugs: snapshot.projects.map((p) => p.slug),
      profileKeys: Object.keys(snapshot.profile),
      linkCount: snapshot.links.length,
      source: 'committed snapshot (post-cutover)',
    },
  }
}

/* ----------------------------------- main ---------------------------------- */

const manifestRaw = readFileSync(MEDIA_MANIFEST, 'utf8')
const manifest = JSON.parse(manifestRaw)

const schemas = await loadSchemas()
const { projectSchema, profileSectionSchemas, linkSchema } = schemas

// The pre-CMS TS collector only works while src/data contains raw content.
// Once the facades shipped (Phase 2), the snapshot is the seed source.
// Detection: facades import the generated snapshot instead of docs/ images.
const projectsFacade = readFileSync(resolve(root, 'src/data/projects.ts'), 'utf8')
const isPostCutover = projectsFacade.includes("from './generated/content.json'")
const { projects, profile, links, sourceMeta } = isPostCutover
  ? collectFromSnapshot()
  : await (async () => {
      const { collectCurrentContent } = await loadContentSources()
      return collectCurrentContent()
    })()

console.log(`— seed source: ${sourceMeta.source ?? 'pre-CMS TypeScript data files'} —`)

// ---- transform + validate BEFORE any write (invalid data never enters D1) --
const rows = []
const now = new Date().toISOString()
const errors = []

// Remap docs-relative source paths (e.g. 'project/GreenHawk AI/banner-1280.webp')
// to stable /media/ URLs via the manifest's exact source→url index. Full
// area-relative paths are required — basenames alone are ambiguous
// (e.g. banner-1280.webp exists under multiple project dirs).
const remap = (value) => {
  const entry = Object.entries(manifest.media).find(([, meta]) => meta.source === `docs:${value}`)
  if (!entry) throw new Error(`no media manifest entry for docs source '${value}'`)
  return entry[0]
}

projects.forEach((project, index) => {
  const candidate = isPostCutover
    ? project // snapshot already carries /media/ refs — remap already applied
    : {
        ...project,
        banner: remap(project.banner),
        screenshots: project.screenshots.map((s) => ({ ...s, src: remap(s.src) })),
      }
  const parsed = projectSchema.safeParse(candidate)
  if (!parsed.success) {
    errors.push(`project '${project.slug}': ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
    return
  }
  const mediaRefs = [parsed.data.banner, ...parsed.data.screenshots.map((s) => s.src)]
  for (const ref of mediaRefs) {
    if (!manifest.media[ref]) errors.push(`project '${project.slug}': media reference not in manifest: ${ref}`)
  }
  rows.push({
    id: `project:${parsed.data.slug}`,
    kind: 'project',
    key: parsed.data.slug,
    data: JSON.stringify(parsed.data),
    sortOrder: index * 10,
    state: 'published',
    version: 1,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  })
})

for (const [sectionKey, sectionSchema] of Object.entries(profileSectionSchemas)) {
  const raw = profile[sectionKey]
  if (!raw) {
    errors.push(`profile section missing from source data: ${sectionKey}`)
    continue
  }
  const remapped =
    isPostCutover || sectionKey !== 'hero' && sectionKey !== 'certificates'
      ? raw
      : sectionKey === 'hero'
        ? { ...raw, avatarSrc: remap(raw.avatarSrc) }
        : { ...raw, items: raw.items.map((item) => ({ ...item, image: remap(item.image) })) }
  const parsed = sectionSchema.safeParse(remapped)
  if (!parsed.success) {
    errors.push(`profile-section '${sectionKey}': ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
    continue
  }
  rows.push({
    id: `profile-section:${sectionKey}`,
    kind: 'profile-section',
    key: sectionKey,
    data: JSON.stringify(parsed.data),
    sortOrder: 0,
    state: 'published',
    version: 1,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  })
}

links.forEach((link, index) => {
  const parsed = linkSchema.safeParse(link)
  if (!parsed.success) {
    errors.push(`link '${link.label}': ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
    return
  }
  rows.push({
    id: `link:${parsed.data.label}`,
    kind: 'link',
    key: parsed.data.label,
    data: JSON.stringify(parsed.data),
    sortOrder: index * 10,
    state: 'published',
    version: 1,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  })
})

if (errors.length > 0) {
  console.error('✗ migration aborted — validation errors (nothing written):\n  - ' + errors.join('\n  - '))
  process.exit(1)
}

/* ------------------------------ parity report ------------------------------ */

console.log('— migration parity report —')
console.log(`projects:    ${rows.filter((r) => r.kind === 'project').length} (source: ${sourceMeta.projectCount})`)
console.log(`profile:     ${rows.filter((r) => r.kind === 'profile-section').length} sections (source keys: ${sourceMeta.profileKeys.join(', ')})`)
console.log(`links:       ${rows.filter((r) => r.kind === 'link').length} (source: ${sourceMeta.linkCount})`)
for (const row of rows.filter((r) => r.kind === 'project')) {
  console.log(`  project ${row.key} → banner=${JSON.parse(row.data).banner} +${JSON.parse(row.data).screenshots.length} screenshots [sort=${row.sortOrder}]`)
}

if (dryRun) {
  console.log('✓ dry run complete — no writes performed')
  process.exit(0)
}

/* --------------------------------- writes ---------------------------------- */

const statements = rows.map((row) => ({
  sql: `INSERT OR REPLACE INTO content (id, kind, key, data, sort_order, state, version, created_at, updated_at, published_at) VALUES (${rowValues(row)})`,
}))

if (remote) {
  // Seeds are NOT D1 schema migrations — they live in seeds/ so
  // `wrangler d1 migrations apply` never picks them up. Apply explicitly
  // with `wrangler d1 execute --file`.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outDir = resolve(root, 'seeds')
  mkdirSync(outDir, { recursive: true })
  const outFile = resolve(outDir, `seed_content_${stamp}.sql`)
  const sqlText = [
    '-- Generated by scripts/migrate-content-to-d1.mjs (--remote seed).',
    '-- NOT a schema migration: apply explicitly, never via `d1 migrations apply`.',
    '-- Idempotent: INSERT OR REPLACE on the UNIQUE(kind,key) row id.',
    '-- Apply with:',
    '--   npx wrangler d1 execute ali-faniani-portfolio-db --remote --file seeds/<this-file>',
    ...statements.map((s) => `${s.sql};`),
  ].join('\n') + '\n'
  writeFileSync(outFile, sqlText)
  const fileName = outFile.split(/[\\/]/).pop()
  console.log(`✓ remote seed file written: seeds/${fileName}`)
  console.log('→ apply it with:')
  console.log(`    npx wrangler d1 execute ali-faniani-portfolio-db --remote --file seeds/${fileName}`)
  process.exit(0)
}

// Local mode: write a temp SQL file and run wrangler d1 execute --local.
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const tmpFile = resolve(root, '.wrangler', `seed_content_local_${stamp}.sql`)
writeFileSync(tmpFile, statements.map((s) => s.sql + ';').join('\n') + '\n')

const { execSync } = await import('node:child_process')
try {
  const output = execSync(
    `npx wrangler d1 execute ali-faniani-portfolio-db --local --file "${tmpFile}"`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  )
  const successCount = (output.match(/executed successfully/g) || []).length
  console.log(`✓ local seed applied (${successCount} statement batches)`)
} catch (error) {
  console.error('✗ local seed failed:', error.stderr?.toString().slice(0, 500) ?? error.message)
  process.exit(1)
} finally {
  const { unlinkSync } = await import('node:fs')
  try { unlinkSync(tmpFile) } catch { /* already gone */ }
}

console.log('✓ migration complete — D1 is now the seeded source for CMS content')
