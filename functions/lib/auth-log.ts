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
  | 'content_archived'
  | 'content_deleted'
  | 'content_error'
  | 'publish_succeeded'
  | 'publish_failed'
  | 'deploy_triggered'
  | 'deploy_trigger_failed'

export async function logAuthEvent(
  db: D1Database,
  event: AuthEvent,
  meta: { ip: string; ok: boolean; note?: string }
): Promise<void> {
  try {
    await db
      .prepare(`INSERT INTO auth_log (ts, ip, ok, note) VALUES (?, ?, ?, ?)`)
      .bind(new Date().toISOString(), meta.ip, meta.ok ? 1 : 0, noteFor(event, meta.note))
      .run()
  } catch {
    // best-effort
  }
}

function noteFor(event: AuthEvent, extra?: string): string {
  const safeExtra = extra ? ` — ${extra.slice(0, 120)}` : ''
  return event + safeExtra
}
