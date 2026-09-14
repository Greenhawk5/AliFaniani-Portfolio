/**
 * Security audit trail → D1 auth_log (ts, ip, ok, note).
 * Never logs credentials, tokens, or secrets — only event type + metadata.
 * Best-effort: a logging failure must never break authentication.
 */

export type AuthEvent =
  | 'login_success'
  | 'login_password_failed'
  | 'login_turnstile_failed'
  | 'login_rate_limited'
  | 'login_malformed'
  | 'logout'
  | 'session_rejected'
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

export async function logAuthEvent(
  db: D1Database,
  event: AuthEvent,
  meta: { ip: string; ok: boolean; note?: string; country?: string | null }
): Promise<void> {
  try {
    await db
      .prepare(`INSERT INTO auth_log (ts, ip, country, ok, note) VALUES (?, ?, ?, ?, ?)`)
      .bind(
        new Date().toISOString(),
        meta.ip,
        meta.country ?? null,
        meta.ok ? 1 : 0,
        noteFor(event, meta.note)
      )
      .run()
  } catch {
    // best-effort
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
