/**
 * GET /api/admin/system/health tests — Truthful live diagnostics endpoint for
 * the Admin Panel (SeoView, IntegrationsView, SettingsView).
 *
 * Covers:
 *   - Authentication boundary (401 unauthenticated, probe session behavior)
 *   - D1 latency & table counts reporting
 *   - KV & deploy state reporting
 *   - R2 bucket accessibility reporting
 *   - Secrets posture (strict booleans, zero secrets leak)
 *   - Turnstile & Analytics diagnostics
 *   - Overall health classification
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  FakeD1Database,
  FakeKV,
  FakeR2Bucket,
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
import { onRequestGet as healthHandler, type SystemHealthReport } from '../functions/api/admin/system/health'
import { resetBurstLimiterForTests } from '../functions/lib/rate-limit'
import { recordDeployState } from '../functions/lib/deploy-state'

let db: FakeD1Database
let kv: FakeKV
let r2: FakeR2Bucket
let env: TestEnv

beforeEach(() => {
  resetBurstLimiterForTests()
  db = new FakeD1Database()
  kv = new FakeKV()
  r2 = new FakeR2Bucket()
  env = makeEnv(db, kv, {
    MEDIA_BUCKET: r2 as unknown as R2Bucket,
    GITHUB_SYNC_TOKEN: 'ghp_test_secret_token_12345',
    CLOUDFLARE_DEPLOY_HOOK_URL: 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/hook123',
    RESEND_API_KEY: 're_test_secret_key_123',
    EMAIL_FROM: 'portfolio@alifaniani.ir',
    EMAIL_TO: 'alifaniani@gmail.com',
  })
  installFetchStub()
})

afterEach(() => {
  clearInterceptors()
  vi.unstubAllGlobals()
})

async function loginContext(ip = '203.0.113.88') {
  interceptFetch(turnstileHandler(true))
  const response = await loginHandler(
    makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' }, {}, ip), env)
  )
  const cookies = response.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
  return { cookies }
}

describe('GET /api/admin/system/health', () => {
  it('unauthenticated request → 401 Unauthorized', async () => {
    const res = await healthHandler(makeContext(getRequest('/api/admin/system/health'), env))
    expect(res.status).toBe(401)
  })

  it('authenticated request → 200 OK with full truthful diagnostics report', async () => {
    const { cookies } = await loginContext()

    // Add some sample data to verify table counts
    await db.prepare("INSERT INTO content (id, kind, key, data, sort_order, state, created_at, updated_at, published_at) VALUES ('1', 'project', 'hawklyx', '{}', 1, 'published', '2026-01-01', '2026-01-01', '2026-01-01')").run()
    await recordDeployState(kv, { status: 'pending_sync', requestedAt: new Date().toISOString() })
    await r2.put('media/sample.webp', new Uint8Array([1, 2, 3]))

    const res = await healthHandler(makeContext(getRequest('/api/admin/system/health', cookies), env))
    expect(res.status).toBe(200)

    const data = (await res.json()) as SystemHealthReport

    // Check report structure
    expect(data.overall).toBe('operational')
    expect(typeof data.timestamp).toBe('string')
    expect(data.d1.ok).toBe(true)
    expect(data.d1.latencyMs).toBeGreaterThanOrEqual(0)
    expect(data.d1.tables.content).toBeGreaterThanOrEqual(1)
    expect(data.d1.tables.auth_sessions).toBeGreaterThanOrEqual(1)

    // Check KV
    expect(data.kv.ok).toBe(true)
    expect(data.kv.bound).toBe(true)
    expect(data.kv.deployStateFound).toBe(true)

    // Check R2
    expect(data.r2.ok).toBe(true)
    expect(data.r2.bound).toBe(true)
    expect(data.r2.accessible).toBe(true)

    // Check Secrets Posture (all booleans, NO string secrets exposed)
    expect(data.secrets).toEqual({
      adminPasswordConfigured: true,
      turnstileConfigured: true,
      githubSyncConfigured: true,
      emailServiceConfigured: true,
      deployHookConfigured: true,
    })

    // Ensure raw secret values are NEVER present anywhere in response JSON string
    const jsonStr = JSON.stringify(data)
    expect(jsonStr).not.toContain('ghp_test_secret_token_12345')
    expect(jsonStr).not.toContain('hook123')
    expect(jsonStr).not.toContain('re_test_secret_key_123')
    expect(jsonStr).not.toContain('test-admin-password-correct')
    expect(jsonStr).not.toContain('test-turnstile-secret')

    // Check Turnstile recent verifications (since loginContext ran)
    expect(data.turnstile.ok).toBe(true)
    expect(data.turnstile.recentVerificationsFound).toBe(true)
  })

  it('reports missing optional secrets honestly without failing core health', async () => {
    // Construct environment without optional secrets
    const minimalEnv = makeEnv(db, kv, {
      GITHUB_SYNC_TOKEN: undefined,
      CLOUDFLARE_DEPLOY_HOOK_URL: undefined,
      RESEND_API_KEY: undefined,
      EMAIL_FROM: undefined,
      EMAIL_TO: undefined,
    })

    const { cookies } = await loginContext()
    const res = await healthHandler(makeContext(getRequest('/api/admin/system/health', cookies), minimalEnv))
    expect(res.status).toBe(200)

    const data = (await res.json()) as SystemHealthReport
    expect(data.secrets.githubSyncConfigured).toBe(false)
    expect(data.secrets.deployHookConfigured).toBe(false)
    expect(data.secrets.emailServiceConfigured).toBe(false)
    expect(data.secrets.adminPasswordConfigured).toBe(true)
    expect(data.secrets.turnstileConfigured).toBe(true)
    // Overall remains operational because core credentials exist
    expect(data.overall).toBe('operational')
  })

  it('runs as a session probe and does not update last_used_at', async () => {
    const { cookies } = await loginContext()

    // Get initial session record
    const sessions = db.sessionRows()
    expect(sessions.length).toBe(1)
    const originalLastUsed = sessions[0].last_used_at

    // Call health endpoint (probe mode)
    const res = await healthHandler(makeContext(getRequest('/api/admin/system/health', cookies), env))
    expect(res.status).toBe(200)

    // Verify session last_used_at was NOT modified by the probe
    expect(sessions[0].last_used_at).toBe(originalLastUsed)
  })

  it('correctly reports edge runtime metadata and country header', async () => {
    const { cookies } = await loginContext()

    const req = new Request('https://alifaniani.ir/api/admin/system/health', {
      headers: {
        Cookie: cookies,
        'CF-IPCountry': 'DE',
        host: 'alifaniani.ir',
      },
    })
    const res = await healthHandler(makeContext(req, env))
    expect(res.status).toBe(200)

    const data = (await res.json()) as SystemHealthReport
    expect(data.runtime.host).toBe('alifaniani.ir')
    expect(data.runtime.environment).toBe('production')
    expect(data.runtime.clientCountry).toBe('DE')
    expect(data.runtime.protocol).toBe('https')
  })

  it('handles database error gracefully and reports degraded state', async () => {
    const { cookies } = await loginContext()

    // Make D1 fail by overriding prepare to throw on queries
    const brokenDb = {
      ...db,
      prepare: (sql: string) => {
        if (sql.includes('SELECT count(*) as count FROM content')) {
          throw new Error('D1 connection reset')
        }
        return db.prepare(sql)
      },
    } as unknown as D1Database

    const brokenEnv = { ...env, DB: brokenDb }
    const res = await healthHandler(makeContext(getRequest('/api/admin/system/health', cookies), brokenEnv))
    expect(res.status).toBe(200)

    const data = (await res.json()) as SystemHealthReport
    expect(data.d1.ok).toBe(false)
    expect(data.d1.error).toBe('D1 connection reset')
    expect(data.overall).toBe('degraded')
  })
})

describe('SEO & Metadata Static Contract', () => {
  it('defines valid metadata for all canonical public routes', async () => {
    const { ROUTE_META } = await import('../src/data/route-meta')

    const requiredRoutes = ['/about', '/projects', '/room', '/contact']
    for (const route of requiredRoutes) {
      const meta = ROUTE_META[route]
      expect(meta).toBeDefined()
      expect(meta.title).toBeTruthy()
      expect(meta.description).toBeTruthy()
    }

    // Projects must have route meta
    expect(ROUTE_META['/projects/hawklyx']).toBeDefined()
    expect(ROUTE_META['/projects/hawklyx'].title).toContain('Ali Faniani')
  })
})

