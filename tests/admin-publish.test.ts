/**
 * Phase 5 publish pipeline tests — real handlers over stub D1/KV/ASSETS/fetch.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  FakeD1Database,
  FakeKV,
  interceptFetch,
  installFetchStub,
  clearInterceptors,
  turnstileHandler,
  makeEnv,
  makeContext,
  postJson,
  type TestEnv,
} from './helpers'
import { onRequestPost as loginHandler } from '../functions/api/admin/login'
import { onRequestPost as publishHandler } from '../functions/api/admin/publish'
import { onRequestPost as createHandler } from '../functions/api/admin/content'
import { onRequestPut as putHandler } from '../functions/api/admin/content/[kind]/[key]'
import { onRequestPost as archiveHandler } from '../functions/api/admin/content/[kind]/[key]'
import { resetBurstLimiterForTests } from '../functions/lib/rate-limit'
import { sha256Hex } from '../functions/lib/crypto'

let db: FakeD1Database
let kv: FakeKV
let env: TestEnv & { DEPLOY_HOOK_URL?: string; ASSETS: Fetcher }

const MANIFEST = {
  media: {
    '/media/project/test-project/banner.webp': { width: 100, height: 50 },
    '/media/project/test-project/a.webp': { width: 100, height: 50 },
  },
}

function assetsStub(manifest: object | null = MANIFEST): Fetcher {
  return {
    fetch: async (url: string | URL) => {
      if (String(url).includes('media-manifest.json')) {
        if (manifest === null) return new Response('missing', { status: 404 })
        return new Response(JSON.stringify(manifest), { status: 200 })
      }
      return new Response('not found', { status: 404 })
    },
  } as unknown as Fetcher
}

const PROJECT = {
  slug: 'test-project',
  title: 'Test Project',
  subtitle: 'A test',
  shortDescription: 'Short',
  overview: 'Overview text',
  category: 'Test',
  year: 2026,
  banner: '/media/project/test-project/banner.webp',
  screenshots: [{ src: '/media/project/test-project/a.webp', caption: 'A' }],
  technologies: ['X'],
  techGroups: [{ label: 'L', items: ['X'] }],
  features: ['F'],
  architecture: ['Ar'],
  repository: 'https://github.com/x/y',
}

/** Seeds a published project row with an optional draft overlay. */
function seedPublished(slug: string, overrides: Record<string, unknown> = {}, draft?: Record<string, unknown> | null) {
  db.tables.content ??= []
  db.tables.content.push({
    id: `project:${slug}`,
    kind: 'project',
    key: slug,
    data: JSON.stringify({ ...PROJECT, slug, ...overrides }),
    sort_order: 30,
    state: 'published',
    version: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    published_at: '2026-01-01T00:00:00.000Z',
    draft_data: draft ? JSON.stringify(draft) : null,
    draft_updated_at: draft ? '2026-09-11T00:00:00.000Z' : null,
    draft_sort_order: null,
  })
}

async function loginCtx(ip = '203.0.113.90') {
  interceptFetch(turnstileHandler(true))
  const response = await loginHandler(
    makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' }, {}, ip), env)
  )
  const cookies = response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
  const csrf = ((await response.json()) as { csrfToken: string }).csrfToken
  return { cookies, csrf }
}

function publishRequest(cookies: string, csrf: string, ip = '203.0.113.90') {
  return postJson('/api/admin/publish', {}, { Cookie: cookies, 'X-CSRF-Token': csrf }, ip)
}

/** Creates a real draft overlay through the content API (integration path). */
async function editPublishedProject(cookies: string, csrf: string, slug: string, title: string) {
  return putHandler(
    makeContext(
      {
        request: new Request(`https://x/api/admin/content/project/${slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Cookie: cookies, 'X-CSRF-Token': csrf },
          body: JSON.stringify({ data: { ...PROJECT, slug, title } }),
        }),
        env,
        params: { kind: 'project', key: slug },
      },
      env
    )
  )
}

beforeEach(() => {
  resetBurstLimiterForTests()
  db = new FakeD1Database()
  kv = new FakeKV()
  env = { ...makeEnv(db, kv), DEPLOY_HOOK_URL: 'https://api.cloudflare.com/deploy-hooks/hook-id', ASSETS: assetsStub() }
  installFetchStub()
})

afterEach(() => {
  clearInterceptors()
  vi.unstubAllGlobals()
})

/* ------------------------------ core publish ------------------------------ */

describe('POST /api/admin/publish', () => {
  it('A: no drafts → safe no-op, no deploy trigger', async () => {
    seedPublished('live-proj')
    let hookCalled = false
    interceptFetch((url) => {
      if (url.includes('deploy-hooks')) {
        hookCalled = true
        return new Response('ok', { status: 200 })
      }
      return turnstileHandler(true)(url)
    })
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { published: { projects: number }; deployment: { status: string } }
    expect(body.published.projects).toBe(0)
    expect(body.deployment.status).toBe('idle')
    expect(hookCalled).toBe(false)
    // live data untouched
    const row = db.tables.content![0] as Record<string, unknown>
    expect(JSON.parse(row.data as string).title).toBe('Test Project')
  })

  it('B: one project draft → promoted atomically, overlay cleared, published_at updated', async () => {
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', title: 'Draft Title' })
    interceptFetch((url) => (url.includes('deploy-hooks') ? new Response('ok', { status: 200 }) : turnstileHandler(true)(url)))
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { published: { projects: number }; deployment: { status: string } }
    expect(body.published.projects).toBe(1)
    expect(body.deployment.status).toBe('queued')

    const row = db.tables.content![0] as Record<string, unknown>
    expect(JSON.parse(row.data as string).title).toBe('Draft Title')
    expect(row.draft_data).toBeNull()
    expect(row.draft_updated_at).toBeNull()
    expect(row.published_at).not.toBe('2026-01-01T00:00:00.000Z')
  })

  it('C: multiple drafts across kinds → all promoted in one batch', async () => {
    seedPublished('proj-a', {}, { ...PROJECT, slug: 'proj-a', title: 'A2' })
    seedPublished('proj-b', {}, { ...PROJECT, slug: 'proj-b', title: 'B2' })
    db.tables.content!.push({
      id: 'link:X', kind: 'link', key: 'X', data: JSON.stringify({ label: 'X', href: 'https://x.io' }),
      sort_order: 90, state: 'published', version: 1, created_at: 't', updated_at: 't', published_at: 't',
      draft_data: JSON.stringify({ label: 'X', href: 'https://edited.io' }), draft_updated_at: 'd', draft_sort_order: null,
    })
    interceptFetch((url) => (url.includes('deploy-hooks') ? new Response('ok', { status: 200 }) : turnstileHandler(true)(url)))
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    const body = (await response.json()) as { published: { projects: number; links: number } }
    expect(body.published.projects).toBe(2)
    expect(body.published.links).toBe(1)
    // all overlays cleared, all data promoted
    for (const row of db.tables.content!) {
      expect(row.draft_data).toBeNull()
    }
    expect(JSON.parse((db.tables.content!.find((r) => r.key === 'proj-a') as Record<string, unknown>).data as string).title).toBe('A2')
    expect(JSON.parse((db.tables.content!.find((r) => r.key === 'X') as Record<string, unknown>).data as string).href).toBe('https://edited.io')
  })

  it('D: invalid draft payload → 400, NOTHING published', async () => {
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', repository: 'not-a-url' })
    seedPublished('other-proj', {}, { ...PROJECT, slug: 'other-proj', title: 'Valid Draft' })
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(400)
    const body = (await response.json()) as { issues: { path: string }[] }
    expect(body.issues.some((i) => i.path.startsWith('project:live-proj'))).toBe(true)
    // the VALID draft in the same batch was also not promoted (atomicity)
    const other = db.tables.content!.find((r) => r.key === 'other-proj') as Record<string, unknown>
    expect(other.draft_data).not.toBeNull()
  })

  it('E: invalid media reference → 400, nothing published', async () => {
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', banner: '/media/missing/banner.webp' })
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(400)
    const body = (await response.json()) as { issues: { message: string }[] }
    expect(body.issues.some((i) => i.message.includes('/media/missing/banner.webp'))).toBe(true)
    const row = db.tables.content![0] as Record<string, unknown>
    expect(row.draft_data).not.toBeNull()
  })

  it('F: batch failure → 500, no partial publication', async () => {
    seedPublished('proj-a', {}, { ...PROJECT, slug: 'proj-a', title: 'A2' })
    seedPublished('proj-b', {}, { ...PROJECT, slug: 'proj-b', title: 'B2' })
    db.failNextBatch = true
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(500)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('nothing was published')
    // neither row was promoted
    for (const row of db.tables.content!) {
      expect(row.draft_data).not.toBeNull()
      expect(JSON.parse(row.data as string).title).toBe('Test Project')
    }
  })

  it('G: unauthenticated publish → 401', async () => {
    const response = await publishHandler(makeContext(postJson('/api/admin/publish', {}), env))
    expect(response.status).toBe(401)
  })

  it('H: missing CSRF → 401', async () => {
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', title: 'Draft' })
    const { cookies } = await loginCtx()
    const response = await publishHandler(makeContext(postJson('/api/admin/publish', {}, { Cookie: cookies }), env))
    expect(response.status).toBe(401)
    // nothing published
    const row = db.tables.content![0] as Record<string, unknown>
    expect(row.draft_data).not.toBeNull()
  })

  it('I: deploy hook success → deployment queued', async () => {
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', title: 'Draft' })
    interceptFetch((url) => (url.includes('deploy-hooks') ? new Response('{ "success": true }', { status: 200 }) : turnstileHandler(true)(url)))
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    const body = (await response.json()) as { deployment: { status: string } }
    expect(body.deployment.status).toBe('queued')
    const state = JSON.parse(kv.store.get('deploy:state')!)
    expect(state.status).toBe('queued')
  })

  it('J: deploy hook failure → content STILL published, trigger_failed reported, no secret leakage', async () => {
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', title: 'Draft' })
    interceptFetch((url) => (url.includes('deploy-hooks') ? new Response('server error', { status: 500 }) : turnstileHandler(true)(url)))
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    const body = (await response.json()) as { ok: boolean; deployment: { status: string } }
    expect(body.ok).toBe(true) // D1 publish succeeded
    expect(body.deployment.status).toBe('trigger_failed')
    // D1 state reflects the promotion
    const row = db.tables.content![0] as Record<string, unknown>
    expect(JSON.parse(row.data as string).title).toBe('Draft')
    expect(row.draft_data).toBeNull()
    // no secret leakage anywhere in the response
    const raw = JSON.stringify(body)
    expect(raw).not.toContain('deploy-hooks')
    expect(raw).not.toContain('test-admin-password')
  })

  it('J2: hook URL not configured → trigger_failed with not_configured, no crash', async () => {
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', title: 'Draft' })
    env.DEPLOY_HOOK_URL = undefined
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    const body = (await response.json()) as { ok: boolean; deployment: { status: string; reason: string } }
    expect(body.ok).toBe(true)
    expect(body.deployment.status).toBe('trigger_failed')
    expect(body.deployment.reason).toBe('not_configured')
  })

  it('L→K: draft isolation before publish; archived row loses overlay after publish and stays out of snapshot scope', async () => {
    // draft overlay exists → published data unchanged (isolation)
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', title: 'Not Yet Public' })
    const before = JSON.parse((db.tables.content![0] as Record<string, unknown>).data as string)
    expect(before.title).toBe('Test Project')

    // archive refuses rows with draft changes (Phase 4 rule, re-verified)
    const { cookies, csrf } = await loginCtx()
    const archiveAttempt = await archiveHandler(
      makeContext({ request: postJson('/api/admin/content/project/live-proj', {}, { Cookie: cookies, 'X-CSRF-Token': csrf }), env, params: { kind: 'project', key: 'live-proj' } }, env)
    )
    expect(archiveAttempt.status).toBe(409)

    // publish → promotion happens even on archived rows' overlays; row state preserved
    ;(db.tables.content![0] as Record<string, unknown>).state = 'archived'
    interceptFetch((url) => (url.includes('deploy-hooks') ? new Response('ok', { status: 200 }) : turnstileHandler(true)(url)))
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(200)
    const row = db.tables.content![0] as Record<string, unknown>
    expect(row.state).toBe('archived') // stays archived (snapshot excludes it)
    expect(row.draft_data).toBeNull()
    expect(JSON.parse(row.data as string).title).toBe('Not Yet Public')
  })

  it('N: double publish → second is a safe no-op', async () => {
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', title: 'Draft' })
    interceptFetch((url) => (url.includes('deploy-hooks') ? new Response('ok', { status: 200 }) : turnstileHandler(true)(url)))
    const { cookies, csrf } = await loginCtx()
    const first = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(first.status).toBe(200)
    const second = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    const body = (await second.json()) as { published: { projects: number }; deployment: { status: string } }
    expect(body.published.projects).toBe(0)
    expect(body.deployment.status).toBe('idle')
  })

  it('M: audit log records publish/deploy events without secrets', async () => {
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', title: 'Draft' })
    interceptFetch((url) => (url.includes('deploy-hooks') ? new Response('ok', { status: 200 }) : turnstileHandler(true)(url)))
    const { cookies, csrf } = await loginCtx()
    await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    const logged = JSON.stringify(db.authRows())
    expect(logged).toContain('publish_succeeded')
    expect(logged).toContain('deploy_triggered')
    expect(logged).not.toContain('deploy-hooks')
    expect(logged).not.toContain(cookies)
    expect(logged).not.toContain(await sha256Hex(cookies))
  })

  it('media manifest unavailable → 500, nothing published', async () => {
    env.ASSETS = assetsStub(null)
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', title: 'Draft' })
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(500)
    expect((db.tables.content![0] as Record<string, unknown>).draft_data).not.toBeNull()
  })
})

/* ------------------------- GitHub snapshot sync dispatch ------------------- */

describe('GitHub snapshot sync dispatch (v2.0.1 diagnostics)', () => {
  /** Seeds one draft, logs in, publishes; the interceptor controls every
   * fetch (deploy hook + GitHub dispatch + Turnstile). A default sync token
   * is injected unless the test overrides it explicitly. */
  async function publishWith(
    handler: (url: string) => Response | null,
    overrides: { token?: string } = {}
  ): Promise<{ body: Record<string, any>; raw: string }> {
    seedPublished('live-proj', {}, { ...PROJECT, slug: 'live-proj', title: 'Draft' })
    ;(env as Record<string, unknown>).GITHUB_SYNC_TOKEN =
      'token' in overrides ? overrides.token : 'test-sync-token'
    interceptFetch((url) => {
      if (url.includes('deploy-hooks')) return new Response('ok', { status: 200 })
      return handler(url)
    })
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(200)
    const raw = JSON.stringify(await response.json())
    return { body: JSON.parse(raw), raw }
  }

  const githubUrl = (url: string) => url.includes('/dispatches')

  afterEach(() => {
    delete (env as Record<string, unknown>).GITHUB_SYNC_TOKEN
  })

  it('dispatch succeeds → sync.dispatched, audit logs sync_dispatched, no secret leakage', async () => {
    const { body, raw } = await publishWith((url) =>
      githubUrl(url) ? new Response(null, { status: 204 }) : null
    )
    expect(body.sync).toEqual({ status: 'dispatched' })
    const logged = JSON.stringify(db.authRows())
    expect(logged).toContain('sync_dispatched')
    expect(logged).not.toContain('test-sync-token')
    expect(raw).not.toContain('test-sync-token')
  })

  it('401 → dispatch_failed reason github_http_401, publish still succeeds', async () => {
    const { body } = await publishWith((url) =>
      githubUrl(url) ? new Response('Bad credentials', { status: 401 }) : null
    )
    expect(body.ok).toBe(true)
    expect(body.sync).toEqual({ status: 'dispatch_failed', reason: 'github_http_401' })
    const row = db.tables.content![0] as Record<string, unknown>
    expect(JSON.parse(row.data as string).title).toBe('Draft') // D1 publish unaffected
  })

  it('403 → reason github_http_403 (least-privilege PAT missing Contents: write)', async () => {
    const { body } = await publishWith((url) =>
      githubUrl(url) ? new Response('Forbidden', { status: 403 }) : null
    )
    expect(body.sync.reason).toBe('github_http_403')
  })

  it('404 → reason github_http_404', async () => {
    const { body } = await publishWith((url) =>
      githubUrl(url) ? new Response('Not Found', { status: 404 }) : null
    )
    expect(body.sync.reason).toBe('github_http_404')
  })

  it('422 → reason github_http_422', async () => {
    const { body } = await publishWith((url) =>
      githubUrl(url) ? new Response('Unprocessable', { status: 422 }) : null
    )
    expect(body.sync.reason).toBe('github_http_422')
  })

  it('500 → reason github_http_500', async () => {
    const { body } = await publishWith((url) =>
      githubUrl(url) ? new Response('oops', { status: 500 }) : null
    )
    expect(body.sync.reason).toBe('github_http_500')
  })

  it('network error → reason network_error, publish unaffected', async () => {
    const { body } = await publishWith(() => {
      throw new Error('connection refused')
    })
    expect(body.ok).toBe(true)
    expect(body.sync).toEqual({ status: 'dispatch_failed', reason: 'network_error' })
  })

  it('token not configured → reason not_configured, no GitHub request attempted', async () => {
    let dispatchAttempted = false
    const { body } = await publishWith((url) => {
      if (githubUrl(url)) dispatchAttempted = true
      return null
    }, { token: undefined })
    expect(body.sync).toEqual({ status: 'dispatch_failed', reason: 'not_configured' })
    expect(dispatchAttempted).toBe(false)
  })

  it('audit log records sync_dispatch_failed with safe reason only', async () => {
    await publishWith((url) => (githubUrl(url) ? new Response('Bad credentials', { status: 401 }) : null))
    const logged = JSON.stringify(db.authRows())
    expect(logged).toContain('sync_dispatch_failed')
    expect(logged).toContain('github_http_401')
    expect(logged).not.toContain('Bad credentials') // response body never logged
    expect(logged).not.toContain('test-sync-token')
    expect(logged).not.toContain('Bearer')
  })

  it('403 with GitHub JSON error → sanitized message surfaced, raw body never returned', async () => {
    const { body, raw } = await publishWith((url) =>
      githubUrl(url)
        ? new Response(
            JSON.stringify({
              message: 'Resource not accessible by personal access token',
              documentation_url: 'https://docs.github.com/rest/repos/repos#create-a-repository-dispatch-event',
            }),
            { status: 403 }
          )
        : null
    )
    expect(body.sync).toEqual({
      status: 'dispatch_failed',
      reason: 'github_http_403',
      message: 'Resource not accessible by personal access token',
      documentationUrl: 'https://docs.github.com/rest/repos/repos#create-a-repository-dispatch-event',
    })
    expect(raw).not.toContain('test-sync-token')
    expect(raw).not.toContain('Bearer')
  })

  it('403 with X-Accepted-GitHub-Permissions → header surfaced as acceptedPermissions', async () => {
    const { body } = await publishWith((url) =>
      githubUrl(url)
        ? new Response(JSON.stringify({ message: 'Resource not accessible by integration' }), {
            status: 403,
            headers: { 'X-Accepted-GitHub-Permissions': 'contents=write' },
          })
        : null
    )
    expect(body.sync).toEqual({
      status: 'dispatch_failed',
      reason: 'github_http_403',
      message: 'Resource not accessible by integration',
      acceptedPermissions: 'contents=write',
    })
  })

  it('malformed non-JSON error body → statusText fallback only, body content never exposed', async () => {
    const { body, raw } = await publishWith((url) =>
      githubUrl(url)
        ? new Response('<html>internal gateway error page</html>', { status: 502, statusText: 'Bad Gateway' })
        : null
    )
    expect(body.sync).toEqual({
      status: 'dispatch_failed',
      reason: 'github_http_502',
      statusText: 'Bad Gateway',
    })
    expect(raw).not.toContain('gateway error page')
  })

  it('diagnostics are absent on 204 success and network failure', async () => {
    const ok = await publishWith((url) => (githubUrl(url) ? new Response(null, { status: 204 }) : null))
    expect(ok.body.sync).toEqual({ status: 'dispatched' })

    const net = await publishWith(() => {
      throw new Error('connection refused')
    })
    expect(net.body.sync).toEqual({ status: 'dispatch_failed', reason: 'network_error' })
  })
})

/* --------------------------- end-to-end integration ------------------------ */

describe('publish end-to-end (content API → publish → snapshot)', () => {
  it('edit via API → publish → live data updated → double-publish idempotent', async () => {
    seedPublished('live-proj')
    const { cookies, csrf } = await loginCtx()
    const edit = await editPublishedProject(cookies, csrf, 'live-proj', 'Edited Via API')
    expect(edit.status).toBe(200)
    // draft overlay present, live untouched
    let row = db.tables.content![0] as Record<string, unknown>
    expect(JSON.parse(row.data as string).title).toBe('Test Project')
    expect(row.draft_data).not.toBeNull()

    interceptFetch((url) => (url.includes('deploy-hooks') ? new Response('ok', { status: 200 }) : turnstileHandler(true)(url)))
    const publish = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(publish.status).toBe(200)
    row = db.tables.content![0] as Record<string, unknown>
    expect(JSON.parse(row.data as string).title).toBe('Edited Via API')
    expect(row.draft_data).toBeNull()

    const again = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    const body = (await again.json()) as { published: { projects: number } }
    expect(body.published.projects).toBe(0)
  })
})

/* ----------------------- Phase 6A: new-record lifecycle ---------------------- */

describe('Phase 6A: draft-only record publish', () => {
  it('G: mixed publish — overlay + draft-only record in one atomic batch', async () => {
    seedPublished('existing-proj', {}, { ...PROJECT, slug: 'existing-proj', title: 'Overlay Edit' })
    db.tables.content!.push({
      id: 'project:brand-new', kind: 'project', key: 'brand-new',
      data: JSON.stringify({ ...PROJECT, slug: 'brand-new', title: 'Brand New' }),
      sort_order: 40, state: 'draft', version: 1,
      created_at: '2026-09-11T00:00:00.000Z', updated_at: '2026-09-11T00:00:00.000Z',
      published_at: null, draft_data: null, draft_updated_at: null, draft_sort_order: null,
    })
    interceptFetch((url) => (url.includes('deploy-hooks') ? new Response('ok', { status: 200 }) : turnstileHandler(true)(url)))
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { published: { projects: number }; deployment: { status: string } }
    expect(body.published.projects).toBe(2)
    expect(body.deployment.status).toBe('queued')

    const existing = db.tables.content!.find((r) => r.key === 'existing-proj') as Record<string, unknown>
    expect(JSON.parse(existing.data as string).title).toBe('Overlay Edit')
    expect(existing.draft_data).toBeNull()
    expect(existing.state).toBe('published')

    const fresh = db.tables.content!.find((r) => r.key === 'brand-new') as Record<string, unknown>
    expect(fresh.state).toBe('published')
    expect(fresh.published_at).not.toBeNull()
    expect(JSON.parse(fresh.data as string).title).toBe('Brand New')
  })

  it('H: invalid draft-only record → whole publish fails, zero writes', async () => {
    seedPublished('existing-proj', {}, { ...PROJECT, slug: 'existing-proj', title: 'Overlay Edit' })
    db.tables.content!.push({
      id: 'project:broken', kind: 'project', key: 'broken',
      data: JSON.stringify({ ...PROJECT, slug: 'broken', repository: 'not-a-url' }),
      sort_order: 41, state: 'draft', version: 1,
      created_at: 't', updated_at: 't', published_at: null,
      draft_data: null, draft_updated_at: null, draft_sort_order: null,
    })
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(400)
    // overlay row NOT promoted (atomic all-or-nothing)
    const existing = db.tables.content!.find((r) => r.key === 'existing-proj') as Record<string, unknown>
    expect(existing.draft_data).not.toBeNull()
    // draft-only row still draft
    const broken = db.tables.content!.find((r) => r.key === 'broken') as Record<string, unknown>
    expect(broken.state).toBe('draft')
  })

  it('I: draft-only record with invalid media → zero writes', async () => {
    db.tables.content ??= []
    db.tables.content.push({
      id: 'project:badmedia', kind: 'project', key: 'badmedia',
      data: JSON.stringify({ ...PROJECT, slug: 'badmedia', banner: '/media/missing/banner.webp' }),
      sort_order: 42, state: 'draft', version: 1,
      created_at: 't', updated_at: 't', published_at: null,
      draft_data: null, draft_updated_at: null, draft_sort_order: null,
    })
    const { cookies, csrf } = await loginCtx()
    const response = await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    expect(response.status).toBe(400)
    const row = db.tables.content![0] as Record<string, unknown>
    expect(row.state).toBe('draft')
  })

  it('J: duplicate kind/key is structurally impossible (upsert semantics + UNIQUE)', async () => {
    // Creating the same slug twice through the API results in one row.
    db.tables.content ??= []
    db.tables.content.push({
      id: 'project:dup', kind: 'project', key: 'dup',
      data: JSON.stringify({ ...PROJECT, slug: 'dup' }),
      sort_order: 43, state: 'draft', version: 1,
      created_at: 't', updated_at: 't', published_at: null,
      draft_data: null, draft_updated_at: null, draft_sort_order: null,
    })
    const { cookies, csrf } = await loginCtx()
    const second = await createHandler(
      makeContext(postJson('/api/admin/content', { kind: 'project', key: 'dup', data: { ...PROJECT, slug: 'dup' } }, { Cookie: cookies, 'X-CSRF-Token': csrf }), env)
    )
    expect(second.status).toBe(201) // upsert updates the existing draft row
    const rows = db.tables.content!.filter((r) => r.key === 'dup')
    expect(rows.length).toBe(1)
  })

  it('D: draft-only slug appears in snapshot shape after publish (export query semantics)', async () => {
    db.tables.content ??= []
    db.tables.content.push({
      id: 'project:future', kind: 'project', key: 'future',
      data: JSON.stringify({ ...PROJECT, slug: 'future' }),
      sort_order: 44, state: 'draft', version: 1,
      created_at: 't', updated_at: 't', published_at: null,
      draft_data: null, draft_updated_at: null, draft_sort_order: null,
    })
    interceptFetch((url) => (url.includes('deploy-hooks') ? new Response('ok', { status: 200 }) : turnstileHandler(true)(url)))
    const { cookies, csrf } = await loginCtx()
    await publishHandler(makeContext(publishRequest(cookies, csrf), env))
    // exporter SELECTs state='published' — the promoted row now qualifies
    const published = db.tables.content!.filter((r) => r.state === 'published').map((r) => r.key)
    expect(published).toContain('future')
  })
})
