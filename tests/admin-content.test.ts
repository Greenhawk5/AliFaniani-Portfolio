/**
 * Phase 4 CMS content API tests — real handlers over stub D1/KV/fetch.
 * Extends the Phase 3 harness with the content endpoints.
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
  getRequest,
  type TestEnv,
} from './helpers'
import { onRequestPost as loginHandler } from '../functions/api/admin/login'
import { onRequestGet as listHandler, onRequestPost as createHandler } from '../functions/api/admin/content'
import {
  onRequestGet as getItemHandler,
  onRequestPut as putItemHandler,
  onRequestPost as archiveHandler,
  onRequestDelete as deleteHandler,
} from '../functions/api/admin/content/[kind]/[key]'
import { onRequestGet as sessionHandler } from '../functions/api/admin/session'
import { sha256Hex } from '../functions/lib/crypto'
import { resetBurstLimiterForTests } from '../functions/lib/rate-limit'

let db: FakeD1Database
let kv: FakeKV
let env: TestEnv

/** Minimal valid project payload (matches projectSchema). */
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

beforeEach(() => {
  resetBurstLimiterForTests()
  db = new FakeD1Database()
  kv = new FakeKV()
  env = makeEnv(db, kv)
  installFetchStub()
})

afterEach(() => {
  clearInterceptors()
  vi.unstubAllGlobals()
})

/** Logs in and returns auth context pieces for subsequent calls. */
async function loginContext(ip = '203.0.113.77') {
  interceptFetch(turnstileHandler(true))
  const response = await loginHandler(
    makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' }, {}, ip), env)
  )
  const cookies = response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
  const csrf = (await response.json()).csrfToken as string
  return { cookies, csrf }
}

function putJson(path: string, body: unknown, cookies: string, csrf: string, ip = '203.0.113.77') {
  return postJson(path, body, { Cookie: cookies, 'X-CSRF-Token': csrf }, ip)
    // POST default method overridden below via new Request semantics
}

/* --------------------------- authentication boundary ------------------------ */

describe('authentication boundary', () => {
  it('unauthenticated GET /api/admin/content → 401', async () => {
    const response = await listHandler(makeContext(getRequest('/api/admin/content'), env))
    expect(response.status).toBe(401)
  })

  it('authenticated GET /api/admin/content → 200', async () => {
    const { cookies } = await loginContext()
    const response = await listHandler(makeContext(getRequest('/api/admin/content', cookies), env))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { items: unknown[] }
    expect(Array.isArray(body.items)).toBe(true)
  })

  it('unauthenticated PUT → 401', async () => {
    const response = await putItemHandler(
      makeContext(
        { request: new Request('https://x/api/admin/content/project/k', { method: 'PUT', body: '{}' }), env, params: { kind: 'project', key: 'k' } },
        env
      )
    )
    expect(response.status).toBe(401)
  })

  it('authenticated PUT without CSRF header → 401', async () => {
    const { cookies } = await loginContext()
    const response = await putItemHandler(
      makeContext(
        {
          request: new Request('https://x/api/admin/content/link/GitHub', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Cookie: cookies },
            body: JSON.stringify({ data: { label: 'GitHub', href: 'https://github.com/x' } }),
          }),
          env,
          params: { kind: 'link', key: 'GitHub' },
        },
        env
      )
    )
    expect(response.status).toBe(401)
  })

  it('authenticated PUT with forged CSRF → 401', async () => {
    const { cookies } = await loginContext()
    const response = await putItemHandler(
      makeContext(
        {
          request: new Request('https://x/api/admin/content/link/GitHub', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Cookie: cookies, 'X-CSRF-Token': 'forged' },
            body: JSON.stringify({ data: { label: 'GitHub', href: 'https://github.com/x' } }),
          }),
          env,
          params: { kind: 'link', key: 'GitHub' },
        },
        env
      )
    )
    expect(response.status).toBe(401)
  })
})

/* --------------------------------- create ----------------------------------- */

describe('POST /api/admin/content (create)', () => {
  it('creates a valid draft project', async () => {
    const { cookies, csrf } = await loginContext()
    const response = await createHandler(
      makeContext(putJson('/api/admin/content', { kind: 'project', key: 'test-project', data: PROJECT }, cookies, csrf), env)
    )
    expect(response.status).toBe(201)
    const body = (await response.json()) as { content: { state: string } }
    expect(body.content.state).toBe('draft')
  })

  it('rejects an invalid payload with field issues', async () => {
    const { cookies, csrf } = await loginContext()
    const bad = { ...PROJECT, repository: 'not-a-url' }
    const response = await createHandler(
      makeContext(putJson('/api/admin/content', { kind: 'project', key: 'test-project', data: bad }, cookies, csrf), env)
    )
    expect(response.status).toBe(400)
    const body = (await response.json()) as { issues: { path: string }[] }
    expect(body.issues.some((i) => i.path.includes('repository'))).toBe(true)
  })

  it('rejects duplicate kind/key', async () => {
    const { cookies, csrf } = await loginContext()
    await createHandler(makeContext(putJson('/api/admin/content', { kind: 'project', key: 'test-project', data: PROJECT }, cookies, csrf), env))
    const second = await createHandler(
      makeContext(putJson('/api/admin/content', { kind: 'project', key: 'test-project', data: PROJECT }, cookies, csrf), env)
    )
    // Upsert semantics: second create updates the draft row rather than duplicating
    expect(second.status).toBe(201)
    const list = await listHandler(makeContext(getRequest('/api/admin/content', cookies), env))
    const items = ((await list.json()) as { items: { kind: string; key: string }[] }).items
    const matches = items.filter((i) => i.kind === 'project' && i.key === 'test-project')
    expect(matches.length).toBe(1)
  })

  it('rejects an unsupported kind', async () => {
    const { cookies, csrf } = await loginContext()
    const response = await createHandler(
      makeContext(putJson('/api/admin/content', { kind: 'page', key: 'x', data: {} }, cookies, csrf), env)
    )
    expect(response.status).toBe(400)
  })

  it('rejects unknown profile-section keys', async () => {
    const { cookies, csrf } = await loginContext()
    const response = await createHandler(
      makeContext(putJson('/api/admin/content', { kind: 'profile-section', key: 'hobbies', data: { items: [] } }, cookies, csrf), env)
    )
    expect(response.status).toBe(400)
  })
})

/* --------------------------------- update ----------------------------------- */

describe('PUT /api/admin/content/:kind/:key (draft-overlay semantics)', () => {
  async function seedPublishedProject() {
    // Insert a published project directly through the store-equivalent row
    db.tables.content ??= []
    db.tables.content.push({
      id: 'project:live-proj',
      kind: 'project',
      key: 'live-proj',
      data: JSON.stringify({ ...PROJECT, slug: 'live-proj' }),
      sort_order: 30,
      state: 'published',
      version: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      published_at: '2026-01-01T00:00:00.000Z',
      draft_data: null,
      draft_updated_at: null,
      draft_sort_order: null,
    })
    return await loginContext()
  }

  it('editing a published row writes the OVERLAY — live data untouched', async () => {
    const { cookies, csrf } = await seedPublishedProject()
    const edited = { ...PROJECT, slug: 'live-proj', title: 'Edited Title' }
    const response = await putItemHandler(
      makeContext(
        { request: new Request('https://x/api/admin/content/project/live-proj', { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookies, 'X-CSRF-Token': csrf }, body: JSON.stringify({ data: edited }) }), env, params: { kind: 'project', key: 'live-proj' } },
        env
      )
    )
    expect(response.status).toBe(200)
    const row = db.tables.content![0]
    expect(JSON.parse(row.data as string).title).toBe('Test Project') // live unchanged
    expect(JSON.parse(row.draft_data as string).title).toBe('Edited Title') // overlay written
    expect(row.draft_updated_at).toBeTruthy()
  })

  it('GET returns the working copy + live version separately', async () => {
    const { cookies, csrf } = await seedPublishedProject()
    await putItemHandler(
      makeContext(
        { request: new Request('https://x/api/admin/content/project/live-proj', { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookies, 'X-CSRF-Token': csrf }, body: JSON.stringify({ data: { ...PROJECT, slug: 'live-proj', title: 'Edited' } }) }), env, params: { kind: 'project', key: 'live-proj' } },
        env
      )
    )
    const response = await getItemHandler(
      makeContext({ request: getRequest('/api/admin/content/project/live-proj', cookies), env, params: { kind: 'project', key: 'live-proj' } }, env)
    )
    const body = (await response.json()) as { content: { data: { title: string }; liveData: { title: string }; hasDraft: boolean } }
    expect(body.content.data.title).toBe('Edited')
    expect(body.content.liveData.title).toBe('Test Project')
    expect(body.content.hasDraft).toBe(true)
  })

  it('rejects an invalid update payload', async () => {
    const { cookies, csrf } = await seedPublishedProject()
    const response = await putItemHandler(
      makeContext(
        { request: new Request('https://x/api/admin/content/project/live-proj', { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookies, 'X-CSRF-Token': csrf }, body: JSON.stringify({ data: { ...PROJECT, slug: 'live-proj', year: 'nope' } }) }), env, params: { kind: 'project', key: 'live-proj' } },
        env
      )
    )
    expect(response.status).toBe(400)
  })

  it('rejects optimistic-concurrency conflicts (stale ifUnmodifiedSince)', async () => {
    const { cookies, csrf } = await seedPublishedProject()
    const response = await putItemHandler(
      makeContext(
        { request: new Request('https://x/api/admin/content/project/live-proj', { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookies, 'X-CSRF-Token': csrf }, body: JSON.stringify({ data: PROJECT, ifUnmodifiedSince: '2020-01-01T00:00:00.000Z' }) }), env, params: { kind: 'project', key: 'live-proj' } },
        env
      )
    )
    expect(response.status).toBe(409)
  })

  it('unknown record → 404', async () => {
    const { cookies, csrf } = await loginContext()
    const response = await putItemHandler(
      makeContext(
        { request: new Request('https://x/api/admin/content/project/ghost', { method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: cookies, 'X-CSRF-Token': csrf }, body: JSON.stringify({ data: { ...PROJECT, slug: 'ghost' } }) }), env, params: { kind: 'project', key: 'ghost' } },
        env
      )
    )
    // PUT on missing record = create-as-draft semantics → 200, row appears as draft
    expect(response.status).toBe(200)
    const list = await listHandler(makeContext(getRequest('/api/admin/content', cookies), env))
    const items = ((await list.json()) as { items: { key: string; state: string }[] }).items
    expect(items.find((i) => i.key === 'ghost')?.state).toBe('draft')
  })
})

/* ------------------------------ archive / delete ----------------------------- */

describe('archive + delete', () => {
  it('archive flips state to archived (soft delete)', async () => {
    db.tables.content ??= []
    db.tables.content.push({
      id: 'link:Temp', kind: 'link', key: 'Temp', data: JSON.stringify({ label: 'Temp', href: 'https://x.dev' }),
      sort_order: 90, state: 'published', version: 1, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      published_at: '2026-01-01T00:00:00.000Z', draft_data: null, draft_updated_at: null, draft_sort_order: null,
    })
    const { cookies, csrf } = await loginContext()
    const response = await archiveHandler(
      makeContext({ request: postJson('/api/admin/content/link/Temp', {}, { Cookie: cookies, 'X-CSRF-Token': csrf }), env, params: { kind: 'link', key: 'Temp' } }, env)
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { content: { state: string } }
    expect(body.content.state).toBe('archived')
  })

  it('archive refuses records with unpublished draft changes', async () => {
    db.tables.content ??= []
    db.tables.content.push({
      id: 'link:Drafty', kind: 'link', key: 'Drafty', data: JSON.stringify({ label: 'Drafty', href: 'https://x.dev' }),
      sort_order: 91, state: 'published', version: 2, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      published_at: '2026-01-01T00:00:00.000Z', draft_data: JSON.stringify({ label: 'Drafty', href: 'https://edited.dev' }), draft_updated_at: '2026-09-11T00:00:00.000Z', draft_sort_order: null,
    })
    const { cookies, csrf } = await loginContext()
    const response = await archiveHandler(
      makeContext({ request: postJson('/api/admin/content/link/Drafty', {}, { Cookie: cookies, 'X-CSRF-Token': csrf }), env, params: { kind: 'link', key: 'Drafty' } }, env)
    )
    expect(response.status).toBe(409)
  })

  it('hard delete works for archived records, refuses published', async () => {
    db.tables.content ??= []
    db.tables.content.push(
      { id: 'link:Gone', kind: 'link', key: 'Gone', data: JSON.stringify({ label: 'Gone', href: 'https://x.dev' }), sort_order: 92, state: 'archived', version: 3, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', published_at: null, draft_data: null, draft_updated_at: null, draft_sort_order: null },
      { id: 'link:Pinned', kind: 'link', key: 'Pinned', data: JSON.stringify({ label: 'Pinned', href: 'https://x.dev' }), sort_order: 93, state: 'published', version: 1, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', published_at: '2026-01-01T00:00:00.000Z', draft_data: null, draft_updated_at: null, draft_sort_order: null }
    )
    const { cookies, csrf } = await loginContext()
    const okDelete = await deleteHandler(
      makeContext({ request: new Request('https://x/api/admin/content/link/Gone', { method: 'DELETE', headers: { Cookie: cookies, 'X-CSRF-Token': csrf } }), env, params: { kind: 'link', key: 'Gone' } }, env)
    )
    expect(okDelete.status).toBe(200)
    const refused = await deleteHandler(
      makeContext({ request: new Request('https://x/api/admin/content/link/Pinned', { method: 'DELETE', headers: { Cookie: cookies, 'X-CSRF-Token': csrf } }), env, params: { kind: 'link', key: 'Pinned' } }, env)
    )
    expect(refused.status).toBe(409)
    expect(db.tables.content!.find((r) => r.id === 'link:Pinned')).toBeTruthy()
  })

  it('missing record → 404 on archive and delete', async () => {
    const { cookies, csrf } = await loginContext()
    const archived = await archiveHandler(
      makeContext({ request: postJson('/api/admin/content/link/Nope', {}, { Cookie: cookies, 'X-CSRF-Token': csrf }), env, params: { kind: 'link', key: 'Nope' } }, env)
    )
    expect(archived.status).toBe(404)
    const deleted = await deleteHandler(
      makeContext({ request: new Request('https://x/api/admin/content/link/Nope', { method: 'DELETE', headers: { Cookie: cookies, 'X-CSRF-Token': csrf } }), env, params: { kind: 'link', key: 'Nope' } }, env)
    )
    expect(deleted.status).toBe(404)
  })

  it('unsupported kind in route → 400', async () => {
    const { cookies, csrf } = await loginContext()
    const response = await getItemHandler(
      makeContext({ request: getRequest('/api/admin/content/page/x', cookies), env, params: { kind: 'page', key: 'x' } }, env)
    )
    expect(response.status).toBe(400)
  })
})

/* ------------------------------- public isolation ---------------------------- */

describe('public isolation', () => {
  it('editing D1 does not touch the committed snapshot file', async () => {
    const fs = await import('node:fs')
    const before = fs.readFileSync('src/data/generated/content.json', 'utf8')
    const { cookies, csrf } = await loginContext()
    await createHandler(
      makeContext(putJson('/api/admin/content', { kind: 'project', key: 'test-project', data: PROJECT }, cookies, csrf), env)
    )
    const after = fs.readFileSync('src/data/generated/content.json', 'utf8')
    expect(after).toBe(before)
  })

  it('session probe exposes no secrets or tokens', async () => {
    const { cookies, csrf } = await loginContext()
    const response = await sessionHandler(makeContext(getRequest('/api/admin/session', cookies), env))
    const raw = JSON.stringify(await response.json())
    expect(raw).not.toContain('test-admin-password-correct')
    expect(raw).not.toContain('admin_session=')
    // csrf token appears only in its own field (SPA transport), never as a hash
    expect(raw).not.toContain(await sha256Hex(csrf))
  })

  it('content list exposes no raw session/CSRF data', async () => {
    const { cookies, csrf } = await loginContext()
    const response = await listHandler(makeContext(getRequest('/api/admin/content', cookies), env))
    const raw = JSON.stringify(await response.json())
    expect(raw).not.toContain(csrf)
    expect(raw).not.toContain('admin_session=')
  })
})

/* ------------------- Phase 7C: minimal project creation ------------------- */

describe('Phase 7C: new-project creation UX contract', () => {
  /** Mirrors the NewRecordDialog starter payload exactly. */
  const MINIMAL_DIALOG_PROJECT = (slug: string, title: string, repository: string) => ({
    slug,
    title,
    subtitle: 'Coming soon',
    shortDescription: 'Project description coming soon.',
    overview: 'Project overview coming soon.',
    category: 'Uncategorized',
    year: new Date().getFullYear(),
    banner: '/media/profile/projects.webp',
    screenshots: [{ src: '/media/profile/projects.webp', caption: 'Screenshot coming soon' }],
    technologies: ['TBD'],
    techGroups: [{ label: 'Core', items: ['TBD'] }],
    features: ['TBD'],
    architecture: ['TBD'],
    repository,
  })

  it('creates a valid minimal draft project from the dialog payload', async () => {
    const { cookies, csrf } = await loginContext()
    const response = await createHandler(
      makeContext(
        putJson('/api/admin/content', { kind: 'project', key: 'dialog-proj', data: MINIMAL_DIALOG_PROJECT('dialog-proj', 'Dialog Project', 'https://github.com/x/dialog-proj') }, cookies, csrf),
        env
      )
    )
    expect(response.status).toBe(201)
    const body = (await response.json()) as { content: { state: string } }
    expect(body.content.state).toBe('draft')
  })

  it('rejects invalid dialog input with field-level issues (no schema weakening)', async () => {
    const { cookies, csrf } = await loginContext()
    const bad = { ...MINIMAL_DIALOG_PROJECT('bad-proj', 'Bad', 'not-a-url') }
    const response = await createHandler(
      makeContext(putJson('/api/admin/content', { kind: 'project', key: 'bad-proj', data: bad }, cookies, csrf), env)
    )
    expect(response.status).toBe(400)
    const body = (await response.json()) as { issues: { path: string; message: string }[] }
    expect(body.issues.some((i) => i.path.includes('repository'))).toBe(true)
  })

  it('dialog-created draft is invisible to public content (snapshot untouched)', async () => {
    const fs = await import('node:fs')
    const before = fs.readFileSync('src/data/generated/content.json', 'utf8')
    const { cookies, csrf } = await loginContext()
    await createHandler(
      makeContext(
        putJson('/api/admin/content', { kind: 'project', key: 'hidden-proj', data: MINIMAL_DIALOG_PROJECT('hidden-proj', 'Hidden', 'https://github.com/x/hidden') }, cookies, csrf),
        env
      )
    )
    expect(fs.readFileSync('src/data/generated/content.json', 'utf8')).toBe(before)
  })

  it('full editor can load the dialog-created draft (GET returns working copy)', async () => {
    const { cookies, csrf } = await loginContext()
    await createHandler(
      makeContext(
        putJson('/api/admin/content', { kind: 'project', key: 'editable-proj', data: MINIMAL_DIALOG_PROJECT('editable-proj', 'Editable', 'https://github.com/x/editable') }, cookies, csrf),
        env
      )
    )
    const response = await getItemHandler(
      makeContext({ request: getRequest('/api/admin/content/project/editable-proj', cookies), env, params: { kind: 'project', key: 'editable-proj' } }, env)
    )
    expect(response.status).toBe(200)
    const body = (await response.json()) as { content: { data: { title: string; repository: string }; state: string } }
    expect(body.content.state).toBe('draft')
    expect(body.content.data.title).toBe('Editable')
    expect(body.content.data.repository).toBe('https://github.com/x/editable')
  })
})
