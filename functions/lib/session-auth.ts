/**
 * Authenticated-request guard for admin endpoints — the single choke point
 * Phase 4 CRUD endpoints will reuse.
 *
 *   requireSession(request, db)             → session or null (GET / reads)
 *   requireMutationAuth(request, db)        → session or null (writes; also
 *                                             enforces the CSRF header)
 *
 * CSRF model: SameSite=Strict is the first layer (cross-site requests cannot
 * carry the cookie at all). As required defense-in-depth, every state-changing
 * request must also carry X-CSRF-Token whose SHA-256 matches the csrf_hash on
 * the session row. The raw CSRF token travels in a JS-readable cookie
 * (SameSite=Strict, Secure) so the SPA can echo it without any secrets in
 * JS-accessible storage beyond the per-session token itself.
 */

import { findValidSession, refreshSessionIfDue, readCookie, SESSION_COOKIE, CSRF_COOKIE } from './sessions'
import { timingSafeEqual, sha256Hex } from './crypto'

export interface AuthContext {
  tokenHash: string
  csrfHash: string
  csrfToken: string
  sessionToken: string
  expiresAt: string
}

export async function requireSession(request: Request, db: D1Database): Promise<AuthContext | null> {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return null
  const session = await findValidSession(db, token)
  if (!session) return null
  await refreshSessionIfDue(db, session)
  const csrfToken = readCookie(request, CSRF_COOKIE)
  return {
    tokenHash: session.tokenHash,
    csrfHash: session.csrfHash,
    csrfToken: csrfToken ?? '',
    sessionToken: token,
    expiresAt: session.expiresAt,
  }
}

export async function requireMutationAuth(request: Request, db: D1Database): Promise<AuthContext | null> {
  const context = await requireSession(request, db)
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
