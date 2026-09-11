/**
 * POST /api/admin/login — single-admin password authentication.
 *
 * Flow (in order):
 *   1. Zod-validated body { password, turnstileToken }
 *   2. Layer A: in-memory burst cap (10/min/IP, any attempt)
 *   3. Layer B read: KV per-IP lockout (5 Turnstile-passed password
 *      failures / 15 min) — fail-open on KV errors
 *   4. Turnstile verification — ALWAYS required (fail closed)
 *   5. Timing-safe password comparison
 *   6. On password failure: record KV failure counter
 *   7. On success: D1 session (hash-at-rest) + cookie pair + purge expired
 *
 * Error responses are generic by design: "Authentication failed." never
 * reveals whether the password was wrong, Turnstile failed, or the server
 * secret is misconfigured. All outcomes land in auth_log (no credentials).
 */

import { z } from 'zod'
import type { AdminEnv } from '../../lib/auth-env'
import { jsonResponse, unauthorizedResponse, badRequestResponse, rateLimitedResponse, clientIp } from '../../lib/http'
import { verifyTurnstileToken } from '../../lib/turnstile'
import { timingSafeEqual } from '../../lib/crypto'
import { createSession, sessionCookie, csrfCookie, purgeExpiredSessions } from '../../lib/sessions'
import { isBurstLimited, burstRetryAfterSeconds, checkKvLockout, recordKvLoginFailure } from '../../lib/rate-limit'
import { logAuthEvent } from '../../lib/auth-log'

const loginSchema = z.object({
  password: z.string().min(1).max(256),
  turnstileToken: z.string().min(1).max(4096),
})

type Env = AdminEnv

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = clientIp(request)
  const ua = request.headers.get('User-Agent')?.slice(0, 200) ?? null

  // 1 — body shape (generic rejection; malformed bodies are logged)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    await logAuthEvent(env.DB, 'login_malformed', { ip, ok: false, note: 'invalid JSON' })
    return badRequestResponse('Invalid request body.')
  }
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    await logAuthEvent(env.DB, 'login_malformed', { ip, ok: false, note: 'schema mismatch' })
    return badRequestResponse('Invalid request body.')
  }
  const { password, turnstileToken } = parsed.data

  // 2 — Layer A burst cap
  if (isBurstLimited(ip)) {
    await logAuthEvent(env.DB, 'login_rate_limited', { ip, ok: false, note: 'burst' })
    return rateLimitedResponse(burstRetryAfterSeconds())
  }


  // 3 — Layer B lockout (fail-open read)
  const lockedFor = await checkKvLockout(env.RATE_LIMIT, ip)
  if (lockedFor > 0) {
    await logAuthEvent(env.DB, 'login_rate_limited', { ip, ok: false, note: 'kv lockout' })
    return rateLimitedResponse(lockedFor)
  }

  // 4 — Turnstile: always required, fail closed
  if (!env.TURNSTILE_SECRET) {
    // Misconfiguration is never distinguishable from a wrong password.
    await logAuthEvent(env.DB, 'login_turnstile_failed', { ip, ok: false, note: 'secret missing' })
    return unauthorizedResponse()
  }
  const turnstileOk = await verifyTurnstileToken(turnstileToken, env.TURNSTILE_SECRET, ip, 'admin-login')
  if (!turnstileOk) {
    await logAuthEvent(env.DB, 'login_turnstile_failed', { ip, ok: false })
    return unauthorizedResponse()
  }

  // 5 — password check (timing-safe; configured-secret missing → same generic 401)
  let passwordOk = false
  if (env.ADMIN_PASSWORD) {
    passwordOk = await timingSafeEqual(password, env.ADMIN_PASSWORD)
  }

  if (!passwordOk) {
    // 6 — only Turnstile-passed failures count toward the KV lockout
    await recordKvLoginFailure(env.RATE_LIMIT, ip)
    await logAuthEvent(env.DB, 'login_password_failed', { ip, ok: false })
    return unauthorizedResponse()
  }

  // 7 — success: session + cookies + opportunistic cleanup
  const session = await createSession(env.DB, { ip, ua })
  await purgeExpiredSessions(env.DB)
  await logAuthEvent(env.DB, 'login_success', { ip, ok: true })

  const response = jsonResponse(
    { ok: true, csrfToken: session.csrfToken, expiresAt: session.expiresAt },
    200
  )
  response.headers.append('Set-Cookie', sessionCookie(session.token))
  response.headers.append('Set-Cookie', csrfCookie(session.csrfToken))
  return response
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } })
