import { describe, expect, it } from 'vitest'

describe('Admin Turnstile Configuration & Security Verification', () => {
  it('ensures fallback site key is valid Cloudflare site key format', () => {
    const FALLBACK_SITE_KEY = '0x4AAAAAAEaJ3GKT_GSYZE-7'
    expect(FALLBACK_SITE_KEY).toMatch(/^0x4[A-Za-z0-9_-]{18,30}$/)
  })

  it('verifies that login endpoint continues to enforce turnstile token validation', async () => {
    const { onRequestPost: loginHandler } = await import('../functions/api/admin/login')
    const { FakeD1Database, FakeKV, makeEnv, makeContext, postJson } = await import('./helpers')

    const db = new FakeD1Database()
    const kv = new FakeKV()
    const env = makeEnv(db, kv)

    // Request missing turnstileToken
    const badRequest = postJson('/api/admin/login', { password: 'test-admin-password-correct' })
    const res = await loginHandler(makeContext(badRequest, env))

    expect(res.status).toBe(400)
    const data = (await res.json()) as { ok: boolean; error: string }
    expect(data.ok).toBe(false)
  })
})

