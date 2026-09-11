/**
 * D1-backed opaque sessions for the single admin.
 *
 * Storage model:
 *   - browser cookie: raw 256-bit token (HttpOnly, Secure, SameSite=Strict)
 *   - D1 sessions row: SHA-256(token) as primary key — the raw token is never
 *     persisted; a D1 leak cannot be replayed as a session.
 *   - csrf_hash: SHA-256 of the per-session CSRF token (raw token is returned
 *     to the logged-in SPA and kept in memory only).
 *
 * Lifetime: fixed 7-day expiry, sliding refresh on authenticated use
 * (refreshed at most once per hour to bound writes), hard cap 30 days.
 * Expired rows are deleted opportunistically on login/session refresh.
 */

import { generateSessionToken, generateCsrfToken, sha256Hex } from './crypto'

export const SESSION_COOKIE = 'admin_session'
export const CSRF_COOKIE = 'admin_csrf'
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days
export const SESSION_HARD_CAP_SECONDS = 30 * 24 * 60 * 60 // 30 days
export const SESSION_REFRESH_INTERVAL_MS = 60 * 60 * 1000 // refresh at most hourly

export interface SessionRow {
  token_hash: string
  csrf_hash: string
  created_at: string
  last_used_at: string
  expires_at: string
  ip: string | null
  ua: string | null
}

export interface CreatedSession {
  token: string
  csrfToken: string
  expiresAt: string
}

function toIso(ms: number): string {
  return new Date(ms).toISOString()
}

/** Creates a session row; returns the raw token pair for the cookies. */
export async function createSession(
  db: D1Database,
  meta: { ip: string; ua: string | null }
): Promise<CreatedSession> {
  const token = generateSessionToken()
  const csrfToken = generateCsrfToken()
  const now = Date.now()
  const tokenHash = await sha256Hex(token)
  const csrfHash = await sha256Hex(csrfToken)

  await db
    .prepare(
      `INSERT INTO sessions (token_hash, csrf_hash, created_at, last_used_at, expires_at, ip, ua)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      tokenHash,
      csrfHash,
      toIso(now),
      toIso(now),
      toIso(now + SESSION_TTL_SECONDS * 1000),
      meta.ip,
      meta.ua
    )
    .run()

  return { token, csrfToken, expiresAt: toIso(now + SESSION_TTL_SECONDS * 1000) }
}

export interface ValidSession {
  tokenHash: string
  csrfHash: string
  expiresAt: string
  lastUsedAt: string
}

/** Resolves a raw token to a live session, or null when unknown/expired. */
export async function findValidSession(db: D1Database, token: string): Promise<ValidSession | null> {
  const tokenHash = await sha256Hex(token)
  const row = await db
    .prepare(
      `SELECT token_hash, csrf_hash, created_at, last_used_at, expires_at
       FROM sessions WHERE token_hash = ?`
    )
    .bind(tokenHash)
    .first<{
      token_hash: string
      csrf_hash: string
      created_at: string
      last_used_at: string
      expires_at: string
    }>()
  if (!row) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await deleteSessionByHash(db, tokenHash)
    return null
  }
  return {
    tokenHash: row.token_hash,
    csrfHash: row.csrf_hash,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
  }
}

/** Sliding refresh: extends expiry, bounded to one write per hour per session. */
export async function refreshSessionIfDue(
  db: D1Database,
  session: ValidSession,
  nowMs = Date.now()
): Promise<void> {
  const lastUsed = new Date(session.lastUsedAt).getTime()
  if (nowMs - lastUsed < SESSION_REFRESH_INTERVAL_MS) return
  const maxExpiry = nowMs + SESSION_HARD_CAP_SECONDS * 1000
  const newExpiry = Math.min(nowMs + SESSION_TTL_SECONDS * 1000, maxExpiry)
  await db
    .prepare(`UPDATE sessions SET last_used_at = ?, expires_at = ? WHERE token_hash = ?`)
    .bind(toIso(nowMs), toIso(newExpiry), session.tokenHash)
    .run()
}

export async function deleteSessionByToken(db: D1Database, token: string): Promise<void> {
  const tokenHash = await sha256Hex(token)
  await deleteSessionByHash(db, tokenHash)
}

export async function deleteSessionByHash(db: D1Database, tokenHash: string): Promise<void> {
  await db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(tokenHash).run()
}

/** Opportunistic cleanup: removes expired rows (bounded work, no background job). */
export async function purgeExpiredSessions(db: D1Database, nowMs = Date.now()): Promise<void> {
  try {
    await db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`).bind(toIso(nowMs)).run()
  } catch {
    // cleanup is best-effort; never block auth on it
  }
}

/* --------------------------------- cookies --------------------------------- */

export function sessionCookie(token: string, maxAgeSeconds = SESSION_TTL_SECONDS): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`
}

export const clearSessionCookie = `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`

/** CSRF token rides in a JS-readable cookie scoped to the admin path —
 * the API validates the header against the D1 hash; the cookie is only the
 * same-origin transport for the SPA. */
export function csrfCookie(token: string, maxAgeSeconds = SESSION_TTL_SECONDS): string {
  return `${CSRF_COOKIE}=${token}; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`
}

export const clearCsrfCookie = `${CSRF_COOKIE}=; Secure; SameSite=Strict; Path=/; Max-Age=0`

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}
