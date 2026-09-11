import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

/**
 * Build-time D1 snapshot exporter (v2.0.0 Phase 2).
 *
 * Production build path:
 *   Pages build → this script → D1 REST API (read-only token) →
 *   published rows → Zod + media-manifest validation → src/data/generated/content.json
 *
 * Modes (CMS_SNAPSHOT_MODE):
 *   - 'warn'  (default when production D1 env vars are absent): if the export
 *     cannot run, log a warning and fall back to the committed snapshot.
 *     Used during migration / local development / preview builds.
 *   - 'strict': any failure to retrieve or validate the snapshot exits
 *     non-zero and fails the build (post-cutover production behavior —
 *     no silent stale-content deployments).
 *
 * Security:
 *   - CLOUDFLARE_D1_READ_TOKEN is read from the environment only.
 *   - Never printed, never written to disk, never embedded in output.
 *   - Diagnostics print status codes and row counts only.
 *
 * The snapshot is deterministic apart from exportedAt: only published rows,
 * ordered by (kind, sort_order, key).
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT = resolve(root, 'src/data/generated/content.json')
const MEDIA_MANIFEST = resolve(root, 'public/media-manifest.json')

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const databaseId = process.env.D1_DATABASE_ID
const token = process.env.CLOUDFLARE_D1_READ_TOKEN

const hasD1Env = Boolean(accountId && databaseId && token)

// Strict mode is the production posture: any environment that carries
// production D1 credentials defaults to strict regardless of the
// CMS_SNAPSHOT_MODE variable (which may not reach the build process on all
// Pages configurations). Local/CI/preview environments — no credentials —
// keep the warn fallback to the committed snapshot.
const mode =
  process.env.CMS_SNAPSHOT_MODE ?? (hasD1Env ? 'strict' : 'warn')
const strict = mode === 'strict'
const local = process.argv.includes('--local')

function fail(message) {
  if (strict) {
    console.error(`✗ snapshot export failed: ${message}`)
    process.exit(1)
  }
  console.warn(`⚠ snapshot export fallback (${mode} mode): ${message}`)
}

function loadCommittedSnapshot() {
  if (!existsSync(OUTPUT)) {
    fail('no committed snapshot at src/data/generated/content.json')
    return null
  }
  try {
    return JSON.parse(readFileSync(OUTPUT, 'utf8'))
  } catch (error) {
    fail(`committed snapshot is not valid JSON: ${error.message}`)
    return null
  }
}

/** Fallback validation — exits 1 when the committed snapshot cannot be
 * validated; returns the validated snapshot (or null) otherwise. */
async function validateOrExitCommitted(manifest, schemas) {
  const committed = loadCommittedSnapshot()
  if (!committed) {
    console.error('✗ no fallback snapshot available — export cannot continue')
    process.exit(1)
  }
  try {
    const { parsed, errors } = validateSnapshot(committed, manifest, schemas)
    if (errors.length > 0) {
      console.error(`✗ committed snapshot failed validation:\n  - ${errors.join('\n  - ')}`)
      process.exit(1)
    }
    console.log(`✓ committed snapshot validated (${parsed.projects.length} projects)`)
    return parsed
  } catch (error) {
    if (error.issues) {
      const first = error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`)
      console.error(`✗ committed snapshot failed schema validation:\n  - ${first.join('\n  - ')}`)
    } else {
      console.error(`✗ committed snapshot validation error: ${error.message}`)
    }
    process.exit(1)
  }
}

async function fetchPublishedRows() {
  const sql = `SELECT id, kind, key, data, sort_order, state, version, created_at, updated_at, published_at
               FROM content WHERE state = 'published' ORDER BY kind, sort_order, key`
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    }
  )
  console.log(`snapshot: D1 REST request started (${response.status} from edge)`)
  if (!response.ok) {
    throw new Error(`D1 REST query returned HTTP ${response.status}`)
  }
  const payload = await response.json()
  if (payload.success !== true || !Array.isArray(payload.result)) {
    throw new Error(`D1 REST response unsuccessful: ${JSON.stringify(payload.errors ?? payload.messages ?? [])}`)
  }
  const rows = payload.result[0]?.results ?? []
  console.log(`snapshot: received ${rows.length} published rows`)
  return rows
}

/** Rows → parsed, per-kind-validated records. Throws with useful messages. */
function rowsToRecords(rows, { contentRowSchema, projectSchema, profileSectionSchemas, linkSchema }) {
  const records = { projects: [], profile: {}, links: [] }
  const seen = new Set()

  for (const raw of rows) {
    const row = contentRowSchema.parse(raw)
    const rowId = `${row.kind}:${row.key}`
    if (seen.has(rowId)) {
      throw new Error(`duplicate content row in snapshot: ${rowId} (UNIQUE(kind,key) violated upstream)`)
    }
    seen.add(rowId)

    let data
    try {
      data = JSON.parse(row.data)
    } catch (error) {
      throw new Error(`${rowId}: stored data is not valid JSON (${error.message})`)
    }

    if (row.kind === 'project') {
      const parsed = projectSchema.parse(data)
      if (parsed.slug !== row.key) {
        throw new Error(`${rowId}: project slug mismatch (data.slug='${parsed.slug}' vs key='${row.key}')`)
      }
      records.projects.push({ ...parsed, _sort: row.sort_order })
    } else if (row.kind === 'profile-section') {
      const sectionSchema = profileSectionSchemas[row.key]
      if (!sectionSchema) {
        throw new Error(`${rowId}: unknown profile-section key '${row.key}'`)
      }
      records.profile[row.key] = { ...sectionSchema.parse(data), _sort: row.sort_order }
    } else if (row.kind === 'link') {
      records.links.push({ ...linkSchema.parse(data), _sort: row.sort_order })
    }
  }

  // Stable ordering without leaking _sort into the validated output.
  records.projects.sort((a, b) => a._sort - b._sort || a.slug.localeCompare(b.slug))
  records.links.sort((a, b) => a._sort - b._sort || a.label.localeCompare(b.label))
  for (const key of Object.keys(records.profile)) {
    records.profile[key]._sortKey = key
  }
  for (const value of Object.values(records.profile)) delete value._sort
  return records
}

/** Snapshot invariants: required sections, unique slugs, media refs, Room needs. */
function validateSnapshot(snapshot, manifest, { contentSnapshotSchema }) {
  const parsed = contentSnapshotSchema.parse(snapshot)
  const errors = []
  const slugSet = new Set()

  for (const project of parsed.projects) {
    if (slugSet.has(project.slug)) errors.push(`duplicate project slug: ${project.slug}`)
    slugSet.add(project.slug)

    // Room BoardSlide contract (§6 of the architecture plan): the 3D project
    // board renders title/subtitle — both required by the schema already.
    const media = [project.banner, ...project.screenshots.map((s) => s.src)]
    for (const ref of media) {
      if (!ref.startsWith('/assets/') && !manifest.media[ref]) {
        errors.push(`${project.slug}: media reference not in manifest: ${ref}`)
      }
    }
  }

  for (const section of ['hero', 'about', 'focus', 'education', 'skills', 'technologies', 'certificates', 'experience']) {
    if (!parsed.profile[section]) errors.push(`missing required profile section: ${section}`)
  }
  if (parsed.profile.hero && !parsed.profile.hero.name) {
    errors.push('profile.hero.name is empty')
  }

  for (const [ref, entry] of Object.entries(parsed.profile.hero.avatarSrc ? { [parsed.profile.hero.avatarSrc]: 1 } : {})) {
    if (!ref.startsWith('/assets/') && !manifest.media[ref]) errors.push(`hero avatar not in manifest: ${ref}`)
  }
  for (const cert of parsed.profile.certificates?.items ?? []) {
    if (!cert.image.startsWith('/assets/') && !manifest.media[cert.image]) {
      errors.push(`certificate image not in manifest: ${cert.image}`)
    }
  }

  if (parsed.projects.length === 0) errors.push('snapshot has no published projects')
  return { parsed, errors }
}

/** Loads src/lib/content-schema.ts through Vite's SSR runner (same pattern
 * as generate-route-html.mjs) so Node can import the TS module. */
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

/** Local development path: reads the LOCAL D1 (wrangler-managed SQLite) via
 * `wrangler d1 execute --local --json`. No credentials required. */
async function fetchPublishedRowsLocal() {
  const { execFileSync } = await import('node:child_process')
  const sql = `SELECT id, kind, key, data, sort_order, state, version, created_at, updated_at, published_at FROM content WHERE state = 'published' ORDER BY kind, sort_order, key`

  let output
  try {
    output = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'ali-faniani-portfolio-db', '--local', '--json', '--command', sql],
      { encoding: 'utf8' }
    )
  } catch (error) {
    if (process.platform === 'win32') {
      // Windows sometimes fails to spawn npx directly; retry through cmd.
      output = execFileSync(
        'cmd',
        ['/c', 'npx', 'wrangler', 'd1', 'execute', 'ali-faniani-portfolio-db', '--local', '--json', '--command', sql],
        { encoding: 'utf8' }
      )
    } else {
      throw new Error('local D1 read failed: ' + String(error.stderr ?? error.message).slice(0, 300))
    }
  }

  const payload = JSON.parse(output)
  const rows = payload[0]?.results ?? []
  console.log(`snapshot: local D1 read (${rows.length} published rows)`)
  return rows
}

/** Shared transform → validate → write path for freshly-fetched rows. */
async function exportRows(rows, manifest, schemas) {
  try {
    const records = rowsToRecords(rows, schemas)
    const snapshot = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      projects: records.projects,
      profile: {
        hero: records.profile.hero,
        about: records.profile.about,
        focus: records.profile.focus,
        education: records.profile.education,
        skills: records.profile.skills,
        technologies: records.profile.technologies,
        certificates: records.profile.certificates,
        experience: records.profile.experience,
      },
      links: records.links,
    }
    const { parsed, errors } = validateSnapshot(snapshot, manifest, schemas)
    if (errors.length > 0) {
      throw new Error(`snapshot validation failed:\n  - ${errors.join('\n  - ')}`)
    }
    mkdirSync(dirname(OUTPUT), { recursive: true })
    writeFileSync(OUTPUT, JSON.stringify(parsed, null, 2) + '\n')
    console.log(`✓ snapshot exported — ${parsed.projects.length} projects, ${Object.keys(parsed.profile).length} profile sections, ${parsed.links.length} links`)
  } catch (error) {
    // Validation failure of live D1 data: strict = build must fail; warn = fall back.
    fail(`live snapshot invalid: ${error.message}`)
    await validateOrExitCommitted(manifest, schemas)
  }
}

async function main() {
  const schemas = await loadSchemas()

  const manifestRaw = readFileSync(MEDIA_MANIFEST, 'utf8')
  const manifest = JSON.parse(manifestRaw)

  // --local: read the local D1 directly (dev/CI parity path, no credentials).
  if (local) {
    const rowsLocal = await fetchPublishedRowsLocal()
    await exportRows(rowsLocal, manifest, schemas)
    return
  }

  // No credentials: strict = build fails (post-cutover guard); warn = committed snapshot.
  if (!hasD1Env) {
    fail(
      strict
        ? 'production D1 credentials missing (CLOUDFLARE_ACCOUNT_ID / D1_DATABASE_ID / CLOUDFLARE_D1_READ_TOKEN) — strict mode forbids stale fallback'
        : 'D1 credentials absent — using committed snapshot (local/preview behavior)'
    )
    await validateOrExitCommitted(manifest, schemas)
    return
  }

  // Fetch failure: strict = build fails; warn = committed snapshot fallback.
  let rows
  try {
    rows = await fetchPublishedRows()
  } catch (error) {
    fail(`D1 export error: ${error.message}`)
    await validateOrExitCommitted(manifest, schemas)
    return
  }

  await exportRows(rows, manifest, schemas)
}

main()
