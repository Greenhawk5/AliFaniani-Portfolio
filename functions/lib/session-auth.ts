/**
 * Authenticated-request guard for admin endpoints — the single choke point
 * all admin endpoints reuse.
 *
 *   requireSession(request, db, options)     → session or null (GET / reads)
 *   requireMutationAuth(request, db, options) → session or null (writes; also
 *                                              enforces the CSRF header)
 *
 * Options:
 *   - isProbe (boolean): When true (e.g. GET /api/admin/session), verifies validity
 *     without touching last_used_at. Passive browser checks will never keep an
 *     inactive user logged in.
 *   - nowMs (number): Injectable timestamp for deterministic unit testing.
 *
 * CSRF model: SameSite=Strict is the first layer (cross-site requests cannot
 * carry the cookie at all). As required defense-in-depth, every state-changing
 * request must also carry X-CSRF-Token whose SHA-256 matches the csrf_hash on
 * the session row.
 */

import {
  evaluateSession,
  touchSessionIfDue,
  readCookie,
  SESSION_COOKIE,
  CSRF_COOKIE,
} from './sessions'
import { timingSafeEqual, sha256Hex } from './crypto'
import { logAuthEvent, requestCountry } from './auth-log'
import { clientIp } from './http'

export interface AuthContext {
  tokenHash: string
  csrfHash: string
  csrfToken: string
  sessionToken: string
  expiresAt: string
  idleExpiresAt: string
  absoluteExpiresAt: string
  lastUsedAt: string
  createdAt: string
}

export interface SessionAuthOptions {
  /** If true, verifies validity without updating last_used_at */
  isProbe?: boolean
  /** Deterministic timestamp for testing */
  nowMs?: number
}

export async function requireSession(
  request: Request,
  db: D1Database,
  options: SessionAuthOptions = {}
): Promise<AuthContext | null> {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return null

  const nowMs = options.nowMs ?? Date.now()
  const result = await evaluateSession(db, token, nowMs)

  if (result.status !== 'valid' || !result.session) {
    const ip = clientIp(request)
    const country = requestCountry(request)
    if (result.status === 'expired_idle') {
      await logAuthEvent(db, 'session_expired', { ip, country, ok: false, note: 'idle timeout (15m)' })
    } else if (result.status === 'expired_absolute') {
      await logAuthEvent(db, 'session_expired', { ip, country, ok: false, note: 'absolute timeout (12h)' })
    } else if (result.status === 'not_found') {
      await logAuthEvent(db, 'session_rejected', { ip, country, ok: false, note: 'unrecognized session token' })
    }
    return null
  }

  const session = result.session

  // Touch activity only for active operations (not passive background probes)
  if (!options.isProbe) {
    await touchSessionIfDue(db, session, nowMs)
  }

  const csrfToken = readCookie(request, CSRF_COOKIE)
  return {
    tokenHash: session.tokenHash,
    csrfHash: session.csrfHash,
    csrfToken: csrfToken ?? '',
    sessionToken: token,
    expiresAt: session.expiresAt,
    idleExpiresAt: session.idleExpiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
    lastUsedAt: session.lastUsedAt,
    createdAt: session.createdAt,
  }
}

export async function requireMutationAuth(
  request: Request,
  db: D1Database,
  options: SessionAuthOptions = {}
): Promise<AuthContext | null> {
  const context = await requireSession(request, db, { ...options, isProbe: false })
  if (!context) return null
  const headerToken = request.headers.get('X-CSRF-Token') ?? ''
  if (!context.csrfToken || !headerToken) return null

  // The header token must (a) match the cookie transport and (b) hash to the
  // session's stored csrf_hash — both checks timing-safe.
  const headerMatchesCookie = await timingSafeEqual(headerToken, context.csrfToken)
  if (!headerMatchesCookie) return null
  const headerHash = await sha256Hex(headerToken)
  const hashMatches = await timingSafeEqual(headerHash, context.csrfHash)
  if (!hashMatches) return null
  return context
}
