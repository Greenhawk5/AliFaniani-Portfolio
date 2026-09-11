/**
 * Phase 6B — SEO & public integration E2E.
 *
 * Exercises the REAL pipeline end-to-end against LOCAL D1 only:
 *   login → draft edit/create → build (CMS_SNAPSHOT_LOCAL=1) → dist artifacts
 *   → publish → rebuild → verify new content → archive → rebuild → verify 404.
 *
 * No production D1, no deploy hook, no secrets. The deploy hook env var is
 * pointed at an unreachable local port so trigger failure (the expected path
 * in tests) is exercised honestly without touching Cloudflare.
 *
 * These tests drive real child processes (wrangler/vite) and are slower than
 * unit tests; they are excluded from the default run via the name filter
 * (run with: npx vitest run tests/seo-e2e.test.ts).
 */

import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { execSync, spawn } from 'node:child_process'
import { readFileSync, existsSync, rmSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const BASE = 'http://127.0.0.1:8791'
const TEST_PORT = 8791
const SNAPSHOT = resolve(root, 'src/data/generated/content.json')

let serverProcess: ReturnType<typeof spawn> | null = null

function run(cmd: string, env: Record<string, string> = {}) {
  execSync(cmd, { cwd: root, stdio: 'pipe', shell: process.platform === 'win32', env: { ...process.env, ...env } })
}

async function startServer() {
  stopServer()
  serverProcess = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--port', String(TEST_PORT)], {
    cwd: root,
    shell: process.platform === 'win32',
    stdio: 'ignore',
    detached: true,
  })
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 1000))
    try {
      const res = await fetch(BASE + '/')
      if (res.ok) return
    } catch {
      // retry
    }
  }
  throw new Error('dev server failed to start')
}

function stopServer() {
  if (serverProcess) {
    try {
      if (process.platform === 'win32') execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore', shell: true })
      else serverProcess.kill('SIGTERM')
    } catch {
      // already gone
    }
    serverProcess = null
  }
  // kill any leftover workerd listeners on the test port (Windows leaves orphans)
  try {
    if (process.platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${TEST_PORT} | findstr LISTENING`, { shell: true, encoding: 'utf8' })
      const pids = [...new Set(out.split('\n').map((l) => l.trim().split(/\s+/).pop()).filter((p) => p && /^\d+$/.test(p)))]
      for (const pid of pids) {
        try { execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore', shell: true }) } catch { /* gone */ }
      }
    }
  } catch {
    // nothing listening
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 15; attempt++) {
    try {
      const res = await fetch(BASE + '/_content_meta.json')
      if (res.ok) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('server did not restart after rebuild')
}

interface TestRecord {
  id: string
  kind: string
  key: string
  data: string
  sort_order: number
  state: string
  version: number
  created_at: string
  updated_at: string
  published_at: string | null
}

/** Read-only access to the local D1 through wrangler. */
function d1Rows(): TestRecord[] {
  const out = execSync(
    'npx wrangler d1 execute ali-faniani-portfolio-db --local --json --command "SELECT id, kind, key, data, sort_order, state, version, created_at, updated_at, published_at FROM content;"',
    { cwd: root, stdio: 'pipe', shell: process.platform === 'win32', encoding: 'utf8' }
  )
  const marker = out.indexOf('"results"')
  if (marker === -1) throw new Error('no results in wrangler output: ' + out.slice(0, 300))
  // find the enclosing JSON array of statement results
  const arrayStart = out.lastIndexOf('[', marker)
  // parse from the outermost bracket before "results"
  let depth = 0
  let start = -1
  for (let i = marker; i >= 0; i--) {
    if (out[i] === '[') {
      start = i
      break
    }
  }
  void arrayStart
  void depth
  // walk forward to the matching close bracket
  let end = -1
  let d = 0
  for (let i = start; i < out.length; i++) {
    if (out[i] === '[') d++
    else if (out[i] === ']') {
      d--
      if (d === 0) {
        end = i + 1
        break
      }
    }
  }
  const parsed = JSON.parse(out.slice(start, end))
  return (Array.isArray(parsed) ? parsed[0].results : parsed.results) as TestRecord[]
}

/** Restores the local D1 content table to the canonical 16-row seed
 * (seeds/seed_content_*.sql — the original production seed). Using the seed
 * rather than the current snapshot keeps the reset independent of whatever
 * the E2E tests did to D1/snapshot state. */
function resetLocalD1() {
  const seed = readdirSync(resolve(root, 'seeds')).find((f) => f.startsWith('seed_content_'))
  if (!seed) throw new Error('no seed file found in seeds/')
  mkdirSync(resolve(root, '.wrangler'), { recursive: true })
  const file = resolve(root, '.wrangler', 'e2e-reset.sql')
  writeFileSync(file, 'DELETE FROM content;\n' + readFileSync(resolve(root, 'seeds', seed), 'utf8'))
  run(`npx wrangler d1 execute ali-faniani-portfolio-db --local --file "${file}"`)
  rmSync(file)
  // Regenerate the snapshot from the restored D1 so file and DB agree.
  run('node scripts/export-d1-snapshot.mjs --local')
}

async function login(): Promise<string> {
  const login = await fetch(BASE + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'local-test-admin-password', turnstileToken: 'dummy' }),
  })
  if (!login.ok) throw new Error('login failed: ' + login.status)
  const cookies = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
  const csrf = ((await login.json()) as { csrfToken: string }).csrfToken
  return cookies + '|' + csrf
}

function cookieOf(auth: string): string {
  return auth.split('|')[0]
}

function csrfOf(auth: string): string {
  return auth.split('|')[1] ?? ''
}

async function putDraft(cookies: string, kind: string, key: string, data: unknown) {
  const res = await fetch(`${BASE}/api/admin/content/${kind}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookieOf(cookies), 'X-CSRF-Token': csrfOf(cookies) },
    body: JSON.stringify({ data }),
  })
  return res
}

async function createDraft(cookies: string, kind: string, key: string, data: unknown) {
  return fetch(BASE + '/api/admin/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieOf(cookies), 'X-CSRF-Token': csrfOf(cookies) },
    body: JSON.stringify({ kind, key, data }),
  })
}

async function archive(cookies: string, kind: string, key: string) {
  return fetch(`${BASE}/api/admin/content/${kind}/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Cookie: cookieOf(cookies), 'X-CSRF-Token': csrfOf(cookies) },
  })
}

async function publish(cookies: string) {
  const res = await fetch(BASE + '/api/admin/publish', {
    method: 'POST',
    headers: { Cookie: cookieOf(cookies), 'X-CSRF-Token': csrfOf(cookies) },
  })
  return res
}

/** A full build + server restart. Restarting mirrors production: each Pages
 * deployment runs in fresh isolates, so the middleware's per-isolate
 * _content_meta.json memo is refreshed exactly as it would be on redeploy. */
async function fullBuild() {
  run('npm run build', { CMS_SNAPSHOT_LOCAL: '1' })
  await startServer()
  await waitForServer()
}

async function get(path: string): Promise<{ status: number; body: string; headers: Headers }> {
  const res = await fetch(BASE + path)
  return { status: res.status, body: await res.text(), headers: res.headers }
}

const NEW_PROJECT = {
  slug: 'e2e-novel-project',
  title: 'E2E Novel Project',
  subtitle: 'Lifecycle proof',
  shortDescription: 'A project created by the Phase 6B E2E test.',
  overview: 'Overview of the E2E novel project used to prove the CMS-to-public pipeline.',
  category: 'Testing',
  year: 2026,
  banner: '/media/project/greenhawk-ai/banner-1280.webp',
  screenshots: [{ src: '/media/project/greenhawk-ai/banner-1280.webp', caption: 'Reuse existing manifest asset' }],
  technologies: ['Vitest'],
  techGroups: [{ label: 'Tooling', items: ['Vitest'] }],
  features: ['Deterministic E2E proof'],
  architecture: ['Local D1', 'Local build', 'Local dev server'],
  repository: 'https://github.com/Greenhawk5/e2e-fixture',
}

beforeAll(async () => {
  await startServer() // kills any stale server first (may hold the D1 file)
  resetLocalD1()
  await startServer() // restart so the middleware/snapshot reflect clean state
}, 300_000)

afterAll(() => {
  stopServer()
  // leave local D1 in the committed-snapshot state for other suites
  try { resetLocalD1() } catch { /* best effort */ }
})

describe('Phase 6B — critical E2E lifecycle', () => {
  it('draft edit → old content public → publish → new content public → archive → 404', async () => {
    // 0. deterministic start: reseed from the canonical seed + fresh build
    resetLocalD1()
    console.log('DEBUG rows after reset:', d1Rows().filter(r => r.kind === 'project').map(r => r.key + ':' + r.state).join(', '))
    await fullBuild()
    console.log('DEBUG snapshot after build:', JSON.parse(readFileSync(SNAPSHOT, 'utf8')).projects.map(p => p.slug).join(', '))
    const baselineSnapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    expect(baselineSnapshot.projects.map((p: { slug: string }) => p.slug).sort()).toEqual(
      expect.arrayContaining(['greenhawk-ai', 'hawkbucks', 'hawkbucks-bot'])
    )
    const originalTitle = baselineSnapshot.projects.find((p: { slug: string }) => p.slug === 'greenhawk-ai').title

    // 1+2. modify the published project as a draft
    const cookies = await login()
    const draftPayload = {
      ...baselineSnapshot.projects.find((p: { slug: string }) => p.slug === 'greenhawk-ai'),
      title: 'E2E Edited Title',
      subtitle: 'E2E draft subtitle',
    }
    const put = await putDraft(cookies, 'project', 'greenhawk-ai', draftPayload)
    expect(put.status).toBe(200)

    // 3+4+5. rebuild → OLD content still public, draft absent
    await fullBuild()
    const prePublic = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    const preProject = prePublic.projects.find((p: { slug: string }) => p.slug === 'greenhawk-ai')
    expect(preProject.title).toBe(originalTitle) // old content still public
    const preShell = await get('/projects/greenhawk-ai')
    expect(preShell.status).toBe(200)
    expect(preShell.body).not.toContain('E2E Edited Title') // draft absent from route HTML
    const preSitemap = (await get('/sitemap.xml')).body
    expect(preSitemap).toContain('/projects/greenhawk-ai')
    const preMeta = JSON.parse((await get('/_content_meta.json')).body)
    expect(preMeta.projectSlugs).toContain('greenhawk-ai')

    // 6+7+8. publish → rebuild → NEW content public
    const publishRes = await publish(cookies)
    expect(publishRes.status).toBe(200)
    const publishBody = (await publishRes.json()) as { ok: boolean; published: { projects: number } }
    expect(publishBody.ok).toBe(true)
    expect(publishBody.published.projects).toBe(1)
    await fullBuild()
    const postPublic = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    const postProject = postPublic.projects.find((p: { slug: string }) => p.slug === 'greenhawk-ai')
    expect(postProject.title).toBe('E2E Edited Title')

    // 9+10. sitemap + route HTML contain the project with NEW metadata
    const postSitemap = (await get('/sitemap.xml')).body
    expect(postSitemap).toContain('/projects/greenhawk-ai')
    const shell = await get('/projects/greenhawk-ai')
    expect(shell.status).toBe(200)
    expect(shell.body).toContain('E2E Edited Title')
    expect(shell.body).toContain('<link rel="canonical" href="https://alifaniani.ir/projects/greenhawk-ai"')
    expect(shell.body).toContain('og:title')
    expect(shell.body).toContain('application/ld+json')

    // 11+12+13. archive → publish → rebuild → absent
    const archived = await archive(cookies, 'project', 'greenhawk-ai')
    expect(archived.status).toBe(200)
    const publish2 = await publish(cookies)
    expect(publish2.status).toBe(200)
    await fullBuild()
    const finalSnapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    expect(finalSnapshot.projects.find((p: { slug: string }) => p.slug === 'greenhawk-ai')).toBeUndefined()

    // 14+15. sitemap + content-meta no longer contain it
    const finalSitemap = (await get('/sitemap.xml')).body
    expect(finalSitemap).not.toContain('/projects/greenhawk-ai')
    const finalMeta = JSON.parse((await get('/_content_meta.json')).body)
    expect(finalMeta.projectSlugs).not.toContain('greenhawk-ai')

    // 16. request → expected 404 behavior (real 404 + noindex)
    const gone = await get('/projects/greenhawk-ai')
    expect(gone.status).toBe(404)
    expect(gone.headers.get('x-robots-tag')).toBe('noindex')
  }, 600_000)

  it('TASK 3: new project — absent as draft, present after publish (route/meta/JSON-LD)', async () => {
    const cookies = await login()

    // create as draft
    const created = await createDraft(cookies, 'project', NEW_PROJECT.slug, NEW_PROJECT)
    expect(created.status).toBe(201)

    // build → absent everywhere
    await fullBuild()
    const preSnapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    expect(preSnapshot.projects.find((p: { slug: string }) => p.slug === NEW_PROJECT.slug)).toBeUndefined()
    const preSitemap = (await get('/sitemap.xml')).body
    expect(preSitemap).not.toContain(NEW_PROJECT.slug)
    const preRoute = await get(`/projects/${NEW_PROJECT.slug}`)
    expect(preRoute.status).toBe(404)

    // publish → rebuild → present with full SEO treatment
    const publishRes = await publish(cookies)
    expect(publishRes.status).toBe(200)
    await fullBuild()
    const postSnapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    const project = postSnapshot.projects.find((p: { slug: string }) => p.slug === NEW_PROJECT.slug)
    expect(project.title).toBe(NEW_PROJECT.title)

    const sitemap = (await get('/sitemap.xml')).body
    expect(sitemap).toContain(`<loc>https://alifaniani.ir/projects/${NEW_PROJECT.slug}</loc>`)

    const shell = await get(`/projects/${NEW_PROJECT.slug}`)
    expect(shell.status).toBe(200)
    expect(shell.body).toContain(`<title>${NEW_PROJECT.title}`)
    expect(shell.body).toContain(NEW_PROJECT.shortDescription)
    expect(shell.body).toContain(`<link rel="canonical" href="https://alifaniani.ir/projects/${NEW_PROJECT.slug}"`)
    expect(shell.body).toContain(`property="og:title"`)
    expect(shell.body).toContain(`property="og:description"`)
    expect(shell.body).toContain(`name="twitter:card"`)
    // JSON-LD: static shells carry the Person+WebSite bootstrap graph; the
    // per-project CreativeWork graph is injected at runtime by useJsonLd
    // (existing SEO architecture — Layer C), so it is not in the static shell.
    expect(shell.body).toContain('application/ld+json')

    // cleanup: archive + publish so later assertions see the standard set
    await archive(cookies, 'project', NEW_PROJECT.slug)
    await publish(cookies)
    await fullBuild()
  }, 600_000)
})

describe('Phase 6B — sitemap & metadata integrity (built artifacts)', () => {
  it('TASK 5/12/13: sitemap integrity — only public routes, valid XML, no admin/API/drafts', async () => {
    const sitemap = (await get('/sitemap.xml')).body
    expect(sitemap).toContain('<?xml version="1.0"')
    expect(sitemap).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')

    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs.length).toBeGreaterThan(0)
    // all URLs on the production origin, no duplicates
    expect(locs.every((u) => u.startsWith('https://alifaniani.ir/'))).toBe(true)
    expect(new Set(locs).size).toBe(locs.length)
    // public static routes present
    for (const route of ['https://alifaniani.ir/', 'https://alifaniani.ir/about', 'https://alifaniani.ir/projects', 'https://alifaniani.ir/contact', 'https://alifaniani.ir/room']) {
      expect(locs).toContain(route)
    }
    // every project URL matches a snapshot slug; no admin/API/anchor junk
    const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    const slugs = snapshot.projects.map((p: { slug: string }) => p.slug)
    const projectLocs = locs.filter((u) => u.includes('/projects/'))
    expect(projectLocs.map((u) => u.replace('https://alifaniani.ir/projects/', ''))).toEqual(slugs)
    expect(locs.some((u) => u.includes('/admin'))).toBe(false)
    expect(locs.some((u) => u.includes('/api/'))).toBe(false)
  })

  it('TASK 6/8/9: route HTML + About + Home SEO integrity', async () => {
    // per-project shells
    const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    for (const project of snapshot.projects) {
      const shell = await get(`/projects/${project.slug}`)
      expect(shell.status).toBe(200)
      expect(shell.body).toContain(`<title>${project.title}`)
      expect(shell.body).toContain(project.shortDescription) // meta description (multi-line formatted)
      expect(shell.body).toContain(`<link rel="canonical" href="https://alifaniani.ir/projects/${project.slug}"`)
      expect(shell.body).toContain('og:title')
      expect(shell.body).toContain('og:description')
      expect(shell.body).toContain('twitter:card')
      expect(shell.body).toContain('application/ld+json')
    }
    // About shell
    const about = await get('/about')
    expect(about.status).toBe(200)
    expect(about.body).toContain('<link rel="canonical" href="https://alifaniani.ir/about"')
    expect(about.body).toContain('og:title')
    expect(about.body).toContain('application/ld+json')
    // Home: static bootstrap intact (hero + JSON-LD + no stray canonical)
    const home = await get('/')
    expect(home.status).toBe(200)
    expect(home.body).toContain('application/ld+json')
    expect(home.body).toContain('Ali Faniani')
  })

  it('TASK 7: nonexistent / archived / draft slugs → 404 + noindex', async () => {
    const cookies = await login()
    // draft project that is never published
    await createDraft(cookies, 'project', 'e2e-never-published', NEW_PROJECT)
    await fullBuild()

    for (const slug of ['does-not-exist', 'e2e-never-published']) {
      const res = await get(`/projects/${slug}`)
      expect(res.status).toBe(404)
      expect(res.headers.get('x-robots-tag')).toBe('noindex')
    }
  }, 300_000)

  it('TASK 11: Room regression — loads, no D1/admin/Zod in room chunk graph', async () => {
    const room = await get('/room')
    expect(room.status).toBe(200)
    // Room shell carries its own metadata
    expect(room.body).toContain('Interactive 3D Portfolio')
    // the Room chunk exists and references no server-only modules
    const { readdirSync } = await import('node:fs')
    const assets = readdirSync(resolve(root, 'dist/assets')).filter((f) => f.endsWith('.js'))
    const roomChunk = assets.find((f) => /Room|Scene/i.test(f))
    expect(roomChunk).toBeTruthy()
    const roomCode = readFileSync(resolve(root, 'dist/assets', roomChunk!), 'utf8')
    expect(roomCode).not.toContain('/api/admin')
    expect(roomCode).not.toContain('api.cloudflare.com')
    expect(roomCode).not.toContain('ZodError')
  })

  it('TASK 12: /admin absent from sitemap + noindex; TASK 14: content-meta derivation', async () => {
    const sitemap = (await get('/sitemap.xml')).body
    expect(sitemap).not.toContain('/admin')

    const admin = await get('/admin')
    expect(admin.status).toBe(200)
    expect(admin.headers.get('x-robots-tag')).toBe('noindex')

    const meta = JSON.parse((await get('/_content_meta.json')).body)
    const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    expect(meta.projectSlugs).toEqual(snapshot.projects.map((p: { slug: string }) => p.slug))
    expect(meta.staticRoutes).toEqual(['/', '/about', '/projects', '/contact', '/room'])
  })

  it('TASK 15: canonical URL architecture — snapshot-driven, production origin', async () => {
    const shell = await get('/projects/hawkbucks')
    expect(shell.body).toContain('https://alifaniani.ir/projects/hawkbucks')
    // sitemap host matches the canonical host
    const sitemap = (await get('/sitemap.xml')).body
    expect(sitemap).toContain('https://alifaniani.ir/')
  })

  it('TASK 16: security headers regression', async () => {
    const home = await get('/')
    expect(home.headers.get('strict-transport-security')).toContain('includeSubDomains')
    expect(home.headers.get('x-content-type-options')).toBe('nosniff')
    expect(home.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(home.headers.get('content-security-policy')).toContain("default-src 'self'")
    expect(home.headers.get('content-security-policy')).toContain('worker-src')
    const room = await get('/room')
    expect(room.headers.get('cache-control')).toContain('no-store')
    const admin = await get('/admin')
    expect(admin.headers.get('cache-control')).toContain('no-store')
  })

  it('TASK 1: snapshot ↔ D1 published parity', async () => {
    const rows = d1Rows()
    const published = rows.filter((r) => r.state === 'published')
    const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
    // projects parity
    const publishedProjects = published.filter((r) => r.kind === 'project').map((r) => r.key).sort()
    expect(snapshot.projects.map((p: { slug: string }) => p.slug).sort()).toEqual(publishedProjects)
    // no draft overlays leaked into snapshot data: snapshot equals each published row's data
    for (const project of snapshot.projects) {
      const row = published.find((r) => r.kind === 'project' && r.key === project.slug)!
      expect(JSON.parse(row.data)).toEqual(project)
    }
    // links parity
    const publishedLinks = published.filter((r) => r.kind === 'link').map((r) => JSON.parse(r.data).label).sort()
    expect(snapshot.links.map((l: { label: string }) => l.label).sort()).toEqual(publishedLinks)
    // profile sections parity
    for (const [key, section] of Object.entries(snapshot.profile)) {
      const row = published.find((r) => r.kind === 'profile-section' && r.key === key)!
      expect(JSON.parse(row.data)).toEqual(section)
    }
    // archived rows exist in D1 but never in the snapshot
    const archived = rows.filter((r) => r.state === 'archived')
    for (const row of archived) {
      const inSnapshot =
        (row.kind === 'project' && snapshot.projects.some((p: { slug: string }) => p.slug === row.key)) ||
        (row.kind === 'link' && snapshot.links.some((l: { label: string }) => l.label === row.key))
      expect(inSnapshot).toBe(false)
    }
  })
})
