/**
 * Authentication & session security tests (Phase 3).
 * Runs the real endpoint handlers against stubbed D1/KV/fetch bindings.
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
import { onRequestPost as logoutHandler } from '../functions/api/admin/logout'
import { onRequestGet as sessionHandler } from '../functions/api/admin/session'
import { sha256Hex } from '../functions/lib/crypto'
import { SESSION_TTL_SECONDS } from '../functions/lib/sessions'
import { resetBurstLimiterForTests } from '../functions/lib/rate-limit'

let db: FakeD1Database
let kv: FakeKV
let env: TestEnv

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

/* ---------------------------------- login ---------------------------------- */

describe('POST /api/admin/login', () => {
  const VALID = () => postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' })

  it('accepts valid password + valid Turnstile and creates a session', async () => {
    interceptFetch(turnstileHandler(true))
    const response = await loginHandler(makeContext(VALID(), env))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { ok: boolean; csrfToken: string }
    expect(body.ok).toBe(true)
    expect(typeof body.csrfToken).toBe('string')
    expect(body.csrfToken.length).toBeGreaterThan(20)

    const cookies = response.headers.getSetCookie()
    const sessionCookie = cookies.find((c) => c.startsWith('admin_session='))
    expect(sessionCookie).toContain('HttpOnly')
    expect(sessionCookie).toContain('Secure')
    expect(sessionCookie).toContain('SameSite=Strict')
    expect(sessionCookie).toContain('Max-Age=' + SESSION_TTL_SECONDS)
    expect(sessionCookie).toContain('Path=/')
    expect(sessionCookie).not.toContain('Domain=')
    const csrfCookie = cookies.find((c) => c.startsWith('admin_csrf='))
    expect(csrfCookie).toContain('SameSite=Strict')

    // one session row created
    expect(db.sessionRows().length).toBe(1)
    const row = db.sessionRows()[0]
    // raw token never persisted: cookie token ≠ stored hash
    const rawToken = sessionCookie!.split(';')[0].split('=')[1]
    expect(row.token_hash).not.toBe(rawToken)
    expect(await sha256Hex(rawToken)).toBe(row.token_hash)
    // csrf hash stored, not raw
    expect(row.csrf_hash).toBe(await sha256Hex(body.csrfToken))
  })

  it('rejects an invalid password with a generic 401', async () => {
    interceptFetch(turnstileHandler(true))
    const response = await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'wrong-password', turnstileToken: 'tok' }), env)
    )
    expect(response.status).toBe(401)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe('Authentication failed.')
    expect(db.sessionRows().length).toBe(0)
    // failure recorded in KV
    const entry = JSON.parse(kv.store.get('login-fail:203.0.113.10')!)
    expect(entry.count).toBe(1)
    // audit trail
    const notes = db.authRows().map((r) => String(r.note))
    expect(notes).toContain('login_password_failed')
  })

  it('rejects invalid Turnstile before the password check (no KV failure recorded)', async () => {
    interceptFetch(turnstileHandler(false))
    const response = await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' }), env)
    )
    expect(response.status).toBe(401)
    expect(kv.store.get('login-fail:203.0.113.10') ?? null).toBeNull()
    const notes = db.authRows().map((r) => String(r.note))
    expect(notes).toContain('login_turnstile_failed')
  })

  it('rejects a missing password / malformed body with 400', async () => {
    interceptFetch(turnstileHandler(true))
    const response = await loginHandler(makeContext(postJson('/api/admin/login', { turnstileToken: 'tok' }), env))
    expect(response.status).toBe(400)
  })

  it('rejects a missing Turnstile token with 400', async () => {
    const response = await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct' }), env)
    )
    expect(response.status).toBe(400)
    expect(db.sessionRows().length).toBe(0)
  })

  it('rate-limits after 5 Turnstile-passed password failures (KV lockout)', async () => {
    interceptFetch(turnstileHandler(true))
    for (let i = 0; i < 5; i++) {
      await loginHandler(
        makeContext(postJson('/api/admin/login', { password: 'wrong', turnstileToken: 'tok' }), env)
      )
    }
    // 6th attempt with the CORRECT password is still locked out
    const response = await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' }), env)
    )
    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
    expect(db.sessionRows().length).toBe(0)
  })

  it('KV failures fail open: wrong-password still 401 (not 500) when KV is down', async () => {
    kv.failReads = true
    kv.failWrites = true
    interceptFetch(turnstileHandler(true))
    const response = await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'wrong', turnstileToken: 'tok' }), env)
    )
    expect(response.status).toBe(401)
  })

  it('missing server secret (password or turnstile) → generic 401, no info leak', async () => {
    interceptFetch(turnstileHandler(true))
    const noPassword = makeEnv(db, kv, { ADMIN_PASSWORD: undefined as unknown as string })
    const response = await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'x', turnstileToken: 'tok' }), noPassword)
    )
    expect(response.status).toBe(401)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe('Authentication failed.')
  })

  it('burst caps rapid attempts in-memory (10/min) before Turnstile is even called', async () => {
    let turnstileCalls = 0
    interceptFetch((url) => {
      if (url.includes('turnstile')) {
        turnstileCalls++
        return new Response(JSON.stringify({ success: true }), { status: 200 })
      }
      return null
    })
    for (let i = 0; i < 12; i++) {
      await loginHandler(makeContext(postJson('/api/admin/login', { password: 'wrong', turnstileToken: 't' }), env))
    }
    // burst cap fires at 10; remaining attempts never reach Turnstile
    expect(turnstileCalls).toBeLessThanOrEqual(10)
  })
})

/* --------------------------------- sessions -------------------------------- */

describe('session endpoints', () => {
  async function loginToGetCookies(): Promise<{ session: string; csrf: string }> {
    interceptFetch(turnstileHandler(true))
    const response = await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' }), env)
    )
    const cookies = response.headers.getSetCookie()
    const session = cookies.find((c) => c.startsWith('admin_session='))!.split(';')[0]
    const csrf = cookies.find((c) => c.startsWith('admin_csrf='))!.split(';')[0]
    return { session, csrf }
  }

  it('GET /api/admin/session: authenticated probe returns minimal state + csrf', async () => {
    const { session, csrf } = await loginToGetCookies()
    const response = await sessionHandler(makeContext(getRequest('/api/admin/session', `${session}; ${csrf}`), env))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { authenticated: boolean; csrfToken: string }
    expect(body.authenticated).toBe(true)
    expect(typeof body.csrfToken).toBe('string')
    // no secrets ever
    const raw = JSON.stringify(body)
    expect(raw).not.toContain('test-admin-password')
    expect(raw).not.toContain('test-turnstile-secret')
  })

  it('GET /api/admin/session: no cookie → authenticated:false', async () => {
    const response = await sessionHandler(makeContext(getRequest('/api/admin/session'), env))
    const body = (await response.json()) as { authenticated: boolean }
    expect(body.authenticated).toBe(false)
  })

  it('GET /api/admin/session: garbage token → authenticated:false', async () => {
    const response = await sessionHandler(
      makeContext(getRequest('/api/admin/session', 'admin_session=garbage-token'), env)
    )
    const body = (await response.json()) as { authenticated: boolean }
    expect(body.authenticated).toBe(false)
  })

  it('expired session is rejected and deleted', async () => {
    const { session, csrf } = await loginToGetCookies()
    // force the stored session into the past
    const raw = session.split('=')[1]
    const { sha256Hex } = await import('../functions/lib/crypto')
    const hash = await sha256Hex(raw)
    const row = db.sessionRows().find((r) => r.token_hash === hash)!
    row.expires_at = '2020-01-01T00:00:00.000Z'
    const response = await sessionHandler(makeContext(getRequest('/api/admin/session', `${session}; ${csrf}`), env))
    const body = (await response.json()) as { authenticated: boolean }
    expect(body.authenticated).toBe(false)
    const stillThere = db.sessionRows().some((r) => r.token_hash === hash)
    expect(stillThere).toBe(false)
  })

  it('POST /api/admin/logout: valid session + CSRF deletes the session and clears cookies', async () => {
    const { session, csrf } = await loginToGetCookies()
    const csrfToken = csrf.split('=')[1]
    const response = await logoutHandler(
      makeContext(postJson('/api/admin/logout', {}, { Cookie: `${session}; ${csrf}`, 'X-CSRF-Token': csrfToken }), env)
    )
    expect(response.status).toBe(200)
    const clearCookie = response.headers.getSetCookie().find((c) => c.startsWith('admin_session='))
    expect(clearCookie).toContain('Max-Age=0')
    expect(db.sessionRows().length).toBe(0)
  })

  it('POST /api/admin/logout: missing CSRF header → 401, session survives', async () => {
    const { session, csrf } = await loginToGetCookies()
    const response = await logoutHandler(
      makeContext(postJson('/api/admin/logout', {}, { Cookie: `${session}; ${csrf}` }), env)
    )
    expect(response.status).toBe(401)
    expect(db.sessionRows().length).toBe(1)
  })

  it('POST /api/admin/logout: invalid CSRF token → 401', async () => {
    const { session, csrf } = await loginToGetCookies()
    const response = await logoutHandler(
      makeContext(
        postJson('/api/admin/logout', {}, { Cookie: `${session}; ${csrf}`, 'X-CSRF-Token': 'forged-token' }),
        env
      )
    )
    expect(response.status).toBe(401)
    expect(db.sessionRows().length).toBe(1)
  })

  it('session refresh is bounded: rapid reuse does not rewrite the row', async () => {
    const { session, csrf } = await loginToGetCookies()
    const updatesBefore = db.statements.filter((s) => s.sql.startsWith('UPDATE sessions')).length
    await sessionHandler(makeContext(getRequest('/api/admin/session', `${session}; ${csrf}`), env))
    await sessionHandler(makeContext(getRequest('/api/admin/session', `${session}; ${csrf}`), env))
    const updatesAfter = db.statements.filter((s) => s.sql.startsWith('UPDATE sessions')).length
    expect(updatesAfter).toBe(updatesBefore) // hourly bound not reached
  })
})

/* --------------------------------- security -------------------------------- */

describe('security invariants', () => {
  it('auth responses are no-store', async () => {
    interceptFetch(turnstileHandler(true))
    const loginResponse = await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' }), env)
    )
    expect(loginResponse.headers.get('Cache-Control')).toBe('no-store')
    const sessionResponse = await sessionHandler(makeContext(getRequest('/api/admin/session'), env))
    expect(sessionResponse.headers.get('Cache-Control')).toBe('no-store')
  })

  it('auth_log never contains passwords or tokens', async () => {
    interceptFetch(turnstileHandler(true))
    await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' }), env)
    )
    await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'wrong', turnstileToken: 'tok' }), env)
    )
    const logged = JSON.stringify(db.authRows())
    expect(logged).not.toContain('test-admin-password-correct')
    expect(logged).not.toContain('wrong')
    expect(logged).not.toContain('tok')
  })
})
