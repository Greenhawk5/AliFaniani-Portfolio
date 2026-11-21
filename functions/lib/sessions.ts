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
 * Expiration Policy (v2.2.0):
 *   - Idle timeout: 15 minutes of inactivity (server-authoritative).
 *   - Absolute timeout: 12 hours from session creation (hard ceiling; cannot be revived).
 *   - Activity writing: Throttled to at most once every 2 minutes to bound D1 writes
 *     while maintaining a strict 13–15 minute effective idle window.
 *   - Passive probes (e.g. GET /api/admin/session): Check validity without touching
 *     last_used_at, preventing background tabs from keeping sessions alive indefinitely.
 */

import { generateSessionToken, generateCsrfToken, sha256Hex } from './crypto'

export const SESSION_COOKIE = 'admin_session'
export const CSRF_COOKIE = 'admin_csrf'

/** Strict 15-minute idle timeout (inactivity boundary) */
export const SESSION_IDLE_TIMEOUT_SECONDS = 15 * 60 // 15 minutes = 900 seconds

/** Strict 12-hour absolute lifetime from session creation */
export const SESSION_ABSOLUTE_TIMEOUT_SECONDS = 12 * 60 * 60 // 12 hours = 43200 seconds

/** Cookie max-age matches the absolute lifetime ceiling */
export const SESSION_TTL_SECONDS = SESSION_ABSOLUTE_TIMEOUT_SECONDS
export const SESSION_HARD_CAP_SECONDS = SESSION_ABSOLUTE_TIMEOUT_SECONDS

/** Activity update throttle to protect D1 write limits (2 minutes) */
export const SESSION_ACTIVITY_WRITE_THROTTLE_MS = 2 * 60 * 1000
export const SESSION_REFRESH_INTERVAL_MS = SESSION_ACTIVITY_WRITE_THROTTLE_MS

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
  idleExpiresAt: string
  absoluteExpiresAt: string
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString()
}

/** Creates a session row; returns the raw token pair for the cookies. */
export async function createSession(
  db: D1Database,
  meta: { ip: string; ua: string | null },
  nowMs = Date.now()
): Promise<CreatedSession> {
  const token = generateSessionToken()
  const csrfToken = generateCsrfToken()
  const tokenHash = await sha256Hex(token)
  const csrfHash = await sha256Hex(csrfToken)

  const idleExpiresAt = toIso(nowMs + SESSION_IDLE_TIMEOUT_SECONDS * 1000)
  const absoluteExpiresAt = toIso(nowMs + SESSION_ABSOLUTE_TIMEOUT_SECONDS * 1000)
  const effectiveExpiresAt = idleExpiresAt

  await db
    .prepare(
      `INSERT INTO sessions (token_hash, csrf_hash, created_at, last_used_at, expires_at, ip, ua)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      tokenHash,
      csrfHash,
      toIso(nowMs),
      toIso(nowMs),
      absoluteExpiresAt,
      meta.ip,
      meta.ua
    )
    .run()

  return {
    token,
    csrfToken,
    expiresAt: effectiveExpiresAt,
    idleExpiresAt,
    absoluteExpiresAt,
  }
}

export interface ValidSession {
  tokenHash: string
  csrfHash: string
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  idleExpiresAt: string
  absoluteExpiresAt: string
}

export type SessionStatus = 'valid' | 'expired_idle' | 'expired_absolute' | 'not_found'

export interface SessionEvaluation {
  status: SessionStatus
  session?: ValidSession
  tokenHash?: string
}

/** Evaluates a session against both idle and absolute timeouts. */
export async function evaluateSession(
  db: D1Database,
  token: string,
  nowMs = Date.now()
): Promise<SessionEvaluation> {
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

  if (!row) return { status: 'not_found', tokenHash }

  const createdAtMs = new Date(row.created_at).getTime()
  const lastUsedAtMs = new Date(row.last_used_at).getTime()
  const expiresAtMs = new Date(row.expires_at).getTime()

  // 1. Strict stored expires_at check
  if (expiresAtMs <= nowMs) {
    await deleteSessionByHash(db, tokenHash)
    return { status: 'expired_absolute', tokenHash }
  }

  // 2. Strict absolute expiration check: 12 hours from created_at
  if (nowMs - createdAtMs >= SESSION_ABSOLUTE_TIMEOUT_SECONDS * 1000) {
    await deleteSessionByHash(db, tokenHash)
    return { status: 'expired_absolute', tokenHash }
  }

  // 3. Strict idle expiration check: 15 minutes from last_used_at
  if (nowMs - lastUsedAtMs >= SESSION_IDLE_TIMEOUT_SECONDS * 1000) {
    await deleteSessionByHash(db, tokenHash)
    return { status: 'expired_idle', tokenHash }
  }

  const idleExpiresAtMs = lastUsedAtMs + SESSION_IDLE_TIMEOUT_SECONDS * 1000
  const absoluteExpiresAtMs = createdAtMs + SESSION_ABSOLUTE_TIMEOUT_SECONDS * 1000
  const effectiveExpiresAtMs = Math.min(idleExpiresAtMs, absoluteExpiresAtMs)

  return {
    status: 'valid',
    tokenHash,
    session: {
      tokenHash: row.token_hash,
      csrfHash: row.csrf_hash,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      expiresAt: toIso(effectiveExpiresAtMs),
      idleExpiresAt: toIso(idleExpiresAtMs),
      absoluteExpiresAt: toIso(absoluteExpiresAtMs),
    },
  }
}

/** Resolves a raw token to a live session, or null when unknown/expired. */
export async function findValidSession(
  db: D1Database,
  token: string,
  nowMs = Date.now()
): Promise<ValidSession | null> {
  const result = await evaluateSession(db, token, nowMs)
  if (result.status === 'valid' && result.session) {
    return result.session
  }
  return null
}

/** Throttled activity refresh: extends last_used_at at most once per 2 minutes. */
export async function touchSessionIfDue(
  db: D1Database,
  session: ValidSession,
  nowMs = Date.now()
): Promise<void> {
  const lastUsedMs = new Date(session.lastUsedAt).getTime()
  if (nowMs - lastUsedMs < SESSION_ACTIVITY_WRITE_THROTTLE_MS) return

  await db
    .prepare(`UPDATE sessions SET last_used_at = ? WHERE token_hash = ?`)
    .bind(toIso(nowMs), session.tokenHash)
    .run()

  session.lastUsedAt = toIso(nowMs)
  const idleExpiresAtMs = nowMs + SESSION_IDLE_TIMEOUT_SECONDS * 1000
  const absoluteExpiresAtMs = new Date(session.createdAt).getTime() + SESSION_ABSOLUTE_TIMEOUT_SECONDS * 1000
  session.idleExpiresAt = toIso(idleExpiresAtMs)
  session.expiresAt = toIso(Math.min(idleExpiresAtMs, absoluteExpiresAtMs))
}

/** Immediately updates last_used_at (for explicit user keepalive). */
export async function forceTouchSession(
  db: D1Database,
  tokenHash: string,
  nowMs = Date.now()
): Promise<void> {
  await db
    .prepare(`UPDATE sessions SET last_used_at = ? WHERE token_hash = ?`)
    .bind(toIso(nowMs), tokenHash)
    .run()
}

/** Backward-compatible alias for existing callers */
export const refreshSessionIfDue = touchSessionIfDue

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
    const idleCutoff = toIso(nowMs - SESSION_IDLE_TIMEOUT_SECONDS * 1000)
    const absoluteCutoff = toIso(nowMs)
    await db
      .prepare(`DELETE FROM sessions WHERE expires_at <= ? OR last_used_at <= ?`)
      .bind(absoluteCutoff, idleCutoff)
      .run()
  } catch {
    // cleanup is best-effort; never block auth on it
  }
}

/* --------------------------------- cookies --------------------------------- */

export function sessionCookie(token: string, maxAgeSeconds = SESSION_TTL_SECONDS): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`
}

export const clearSessionCookie = `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`

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
