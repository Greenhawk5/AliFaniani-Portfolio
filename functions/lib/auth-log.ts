/**
 * Security audit trail → D1 auth_log (ts, ip, country, ok, note).
 * Never logs credentials, tokens, or secrets — only event type + metadata.
 * Resilient: includes self-healing fallback to 4-column schema if migration
 * 0003 (country column) has not yet been applied in the target environment.
 */

export type AuthEvent =
  | 'login_success'
  | 'login_password_failed'
  | 'login_turnstile_failed'
  | 'login_rate_limited'
  | 'login_malformed'
  | 'logout'
  | 'session_rejected'
  | 'session_expired'
  | 'content_created'
  | 'content_updated'
  | 'content_draft_discarded'
  | 'content_archived'
  | 'content_deleted'
  | 'content_error'
  | 'publish_succeeded'
  | 'publish_failed'
  | 'deploy_triggered'
  | 'deploy_trigger_failed'
  | 'sync_dispatched'
  | 'sync_dispatch_failed'
  | 'media_uploaded'
  | 'media_upload_failed'
  | 'media_deleted'
  | 'media_delete_rejected'

export async function logAuthEvent(
  db: D1Database,
  event: AuthEvent,
  meta: { ip: string; ok: boolean; note?: string; country?: string | null }
): Promise<void> {
  const ts = new Date().toISOString()
  const okVal = meta.ok ? 1 : 0
  const note = noteFor(event, meta.note)

  try {
    // 1. Primary path: 5-column schema (post-migration 0003)
    await db
      .prepare(`INSERT INTO auth_log (ts, ip, country, ok, note) VALUES (?, ?, ?, ?, ?)`)
      .bind(ts, meta.ip, meta.country ?? null, okVal, note)
      .run()
  } catch (primaryError) {
    // 2. Self-healing fallback: 4-column schema if 'country' column is missing in older/remote DBs
    try {
      await db
        .prepare(`INSERT INTO auth_log (ts, ip, ok, note) VALUES (?, ?, ?, ?)`)
        .bind(ts, meta.ip, okVal, note)
        .run()
    } catch (fallbackError) {
      // Diagnostic visibility in Workers/Pages edge logs without breaking client request
      console.error(`[auth-log] Failed to write audit event '${event}':`, fallbackError)
    }
  }
}

/** Authoritative request geo from the Cloudflare edge (CF-IPCountry header).
 * Uppercase 2-letter code, or null when absent/untrusted — the frontend
 * must never guess a country from an IP. */
export function requestCountry(request: Request): string | null {
  const raw = request.headers.get('CF-IPCountry')
  if (!raw) return null
  const code = raw.trim().toUpperCase()
  return /^[A-Z]{2}$/.test(code) ? code : null
}

function noteFor(event: AuthEvent, extra?: string): string {
  const safeExtra = extra ? ` — ${extra.slice(0, 120)}` : ''
  return event + safeExtra
}
