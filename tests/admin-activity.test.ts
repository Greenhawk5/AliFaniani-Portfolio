/**
 * GET /api/admin/activity tests — real handler over stub D1. Covers the auth
 * boundary, note parsing into structured events, limit validation, IP
 * masking, and the summary aggregation.
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
import { onRequestGet as activityHandler } from '../functions/api/admin/activity'
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

async function loginContext(ip = '203.0.113.77') {
  interceptFetch(turnstileHandler(true))
  const response = await loginHandler(
    makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' }, {}, ip), env)
  )
  const cookies = response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
  return { cookies }
}

describe('GET /api/admin/activity', () => {
  it('unauthenticated → 401', async () => {
    const response = await activityHandler(makeContext(getRequest('/api/admin/activity'), env))
    expect(response.status).toBe(401)
  })

  it('returns structured events parsed from auth_log notes', async () => {
    const { cookies } = await loginContext()
    const now = new Date().toISOString()
    // Seeded after login so loginContext's own login_success row doesn't count.
    db.tables.auth_log = [
      { ts: now, ip: '198.51.100.7', ok: 1, note: 'login_success' },
      { ts: now, ip: '198.51.100.7', ok: 1, note: 'content_updated — project:greenhawk-ai' },
      { ts: now, ip: '198.51.100.7', ok: 1, note: 'publish_succeeded — 1p/0s/0l' },
    ]
    const response = await activityHandler(makeContext(getRequest('/api/admin/activity', cookies), env))
    expect(response.status).toBe(200)

    const body = (await response.json()) as {
      events: { ts: string; ok: boolean; event: string; detail: string | null; ip: string }[]
      summary: { total: number; failedAccess: number; contentEvents: number }
    }
    expect(body.events).toHaveLength(3)

    const updated = body.events.find((e) => e.event === 'content_updated')
    expect(updated?.detail).toBe('project:greenhawk-ai')
    expect(updated?.ok).toBe(true)

    const login = body.events.find((e) => e.event === 'login_success')
    expect(login?.detail).toBeNull()
    // IPv4 masking keeps two leading octets only
    expect(login?.ip).toBe('198.51.0.0')

    expect(body.summary.total).toBe(3)
    expect(body.summary.failedAccess).toBe(0)
    expect(body.summary.contentEvents).toBe(2)
  })

  it('counts failed-access events in the summary', async () => {
    db.tables.auth_log = [
      { ts: new Date().toISOString(), ip: '198.51.100.9', ok: 0, note: 'login_password_failed' },
      { ts: new Date().toISOString(), ip: '198.51.100.9', ok: 0, note: 'login_rate_limited — kv lockout' },
    ]
    const { cookies } = await loginContext()
    const response = await activityHandler(makeContext(getRequest('/api/admin/activity', cookies), env))
    const body = (await response.json()) as { summary: { failedAccess: number; contentEvents: number } }
    expect(body.summary.failedAccess).toBe(2)
    expect(body.summary.contentEvents).toBe(0)
  })

  it('rejects an out-of-range limit with 400', async () => {
    const { cookies } = await loginContext()
    for (const limit of ['0', '201', 'abc']) {
      const response = await activityHandler(
        makeContext(getRequest(`/api/admin/activity?limit=${limit}`, cookies), env)
      )
      expect(response.status).toBe(400)
    }
  })

  it('respects the limit parameter', async () => {
    const { cookies } = await loginContext()
    const base = Date.now()
    // Seeded after login: loginContext's own login_success row must not count.
    db.tables.auth_log = Array.from({ length: 10 }, (_, i) => ({
      ts: new Date(base - i * 1000).toISOString(),
      ip: '198.51.100.1',
      ok: 1,
      note: 'login_success',
    }))
    const response = await activityHandler(
      makeContext(getRequest('/api/admin/activity?limit=5', cookies), env)
    )
    const body = (await response.json()) as { events: unknown[]; summary: { total: number } }
    expect(body.events).toHaveLength(5)
    expect(body.summary.total).toBe(5)
  })

  it('masks IPv6 addresses to a /64-style prefix', async () => {
    db.tables.auth_log = [
      { ts: new Date().toISOString(), ip: '2001:db8:1234:5678::1', ok: 1, note: 'login_success' },
    ]
    const { cookies } = await loginContext()
    const response = await activityHandler(makeContext(getRequest('/api/admin/activity', cookies), env))
    const body = (await response.json()) as { events: { ip: string }[] }
    expect(body.events[0].ip).toBe('2001:db8:1234::')
  })

  it('returns an empty event list when the log is empty (not an error)', async () => {
    const { cookies } = await loginContext()
    db.tables.auth_log = []
    const response = await activityHandler(makeContext(getRequest('/api/admin/activity', cookies), env))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { events: unknown[]; summary: { total: number; lastTs: string | null } }
    expect(body.events).toHaveLength(0)
    expect(body.summary.total).toBe(0)
    expect(body.summary.lastTs).toBeNull()
  })

  it('returns the edge country code captured at event time', async () => {
    const { cookies } = await loginContext()
    db.tables.auth_log = [
      { ts: new Date().toISOString(), ip: '198.51.100.7', country: 'FR', ok: 1, note: 'login_success' },
      { ts: new Date().toISOString(), ip: '198.51.100.8', country: null, ok: 1, note: 'login_success' },
    ]
    const response = await activityHandler(makeContext(getRequest('/api/admin/activity', cookies), env))
    const body = (await response.json()) as { events: { country: string | null }[] }
    expect(body.events[0].country).toBe('FR')
    // Historical rows without captured geo stay null (UI: "Not recorded").
    expect(body.events[1].country).toBeNull()
  })

  it('full=1 returns unmasked IPs; default stays masked', async () => {
    const { cookies } = await loginContext()
    db.tables.auth_log = [
      { ts: new Date().toISOString(), ip: '198.51.100.77', country: null, ok: 1, note: 'login_success' },
    ]
    const masked = (await (
      await activityHandler(makeContext(getRequest('/api/admin/activity', cookies), env))
    ).json()) as { events: { ip: string }[] }
    expect(masked.events[0].ip).toBe('198.51.0.0')
    const full = (await (
      await activityHandler(makeContext(getRequest('/api/admin/activity?full=1', cookies), env))
    ).json()) as { events: { ip: string }[] }
    expect(full.events[0].ip).toBe('198.51.100.77')
  })

  it('reads the country column only when present (pre-migration fallback)', async () => {
    // Simulate a pre-0003 database: the column-select throws, the legacy
    // 4-column select succeeds, country is null.
    const { cookies } = await loginContext()
    db.tables.auth_log = [
      { ts: new Date().toISOString(), ip: '198.51.100.7', ok: 1, note: 'login_success' },
    ]
    const realPrepare = db.prepare.bind(db)
    db.prepare = ((sql: string) => {
      if (/country/.test(sql)) {
        return {
          bind: () => ({
            all: async () => {
              throw new Error('no such column: country')
            },
          }),
        }
      }
      return realPrepare(sql)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any
    const response = await activityHandler(makeContext(getRequest('/api/admin/activity', cookies), env))
    expect(response.status).toBe(200)
    const body = (await response.json()) as { events: { country: string | null; ip: string }[] }
    expect(body.events[0].country).toBeNull()
    expect(body.events[0].ip).toBe('198.51.0.0')
  })

  it('login captures and stores the CF-IPCountry edge value', async () => {
    interceptFetch(turnstileHandler(true))
    await loginHandler(
      makeContext(
        postJson(
          '/api/admin/login',
          { password: 'test-admin-password-correct', turnstileToken: 'tok' },
          { 'CF-IPCountry': 'de' },
          '203.0.113.77'
        ),
        env
      )
    )
    const row = db.authRows().find((r) => String(r.note) === 'login_success')
    // Normalized to uppercase 2-letter code.
    expect(row?.country).toBe('DE')
  })

  it('invalid CF-IPCountry values are stored as null (never trusted blindly)', async () => {
    interceptFetch(turnstileHandler(true))
    await loginHandler(
      makeContext(
        postJson(
          '/api/admin/login',
          { password: 'test-admin-password-correct', turnstileToken: 'tok' },
          { 'CF-IPCountry': 'XX; DROP TABLE auth_log' },
          '203.0.113.77'
        ),
        env
      )
    )
    const row = db.authRows().find((r) => String(r.note) === 'login_success')
    expect(row?.country).toBeNull()
  })
})
