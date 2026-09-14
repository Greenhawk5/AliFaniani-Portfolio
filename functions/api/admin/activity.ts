/**
 * GET /api/admin/activity — authenticated read of the D1 auth_log audit
 * trail (the CMS's only historical event source). Read-only, no-store.
 *
 * The log rows store `note` as "event — detail" (auth-log.ts). This endpoint
 * splits that into structured { event, detail } so the client never parses
 * audit strings. IP addresses are returned masked (two leading octets or
 * prefix blocks) UNLESS the caller passes full=1 — full IPs stay inside this
 * authenticated admin-only response and are never used by public code.
 * `country` is the authoritative CF-IPCountry edge value captured at event
 * time, or null for historical rows that predate capture.
 *
 * `summary` aggregates security-relevant failures across the returned
 * window; it is derived only from rows actually selected (truthful scope).
 */

import { jsonResponse, unauthorizedResponse, badRequestResponse } from '../../lib/http'
import { requireSession } from '../../lib/session-auth'
import type { AdminEnv } from '../../lib/auth-env'

type Env = AdminEnv

/** Events that indicate somebody tried and failed to get in. */
const FAILED_ACCESS_EVENTS = new Set([
  'login_password_failed',
  'login_turnstile_failed',
  'login_rate_limited',
  'login_malformed',
  'session_rejected',
])

/** Events that represent content/publish operations (vs auth events). */
const CONTENT_EVENTS = new Set([
  'content_created',
  'content_updated',
  'content_draft_discarded',
  'content_archived',
  'content_deleted',
  'content_error',
  'publish_succeeded',
  'publish_failed',
  'sync_dispatched',
  'sync_dispatch_failed',
])

interface ActivityRow {
  ts: string
  ip: string | null
  country: string | null
  ok: number
  note: string | null
}

/** Mask an IP for display: keep the routing-relevant prefix, zero the rest.
 * IPv4: a.b.0.0 — IPv6: first 3 hextets + :: — anything else: 'unknown'. */
function maskIp(ip: string | null): string {
  if (!ip || ip === 'unknown') return 'unknown'
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length !== 4) return 'unknown'
    return `${parts[0]}.${parts[1]}.0.0`
  }
  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean)
    if (parts.length < 3) return 'unknown'
    return `${parts[0]}:${parts[1]}:${parts[2]}::`
  }
  return 'unknown'
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireSession(request, env.DB)
  if (!context) return unauthorizedResponse()

  const url = new URL(request.url)
  const limitParam = Number(url.searchParams.get('limit') ?? '50')
  if (!Number.isInteger(limitParam) || limitParam < 1 || limitParam > 200) {
    return badRequestResponse('limit must be an integer between 1 and 200.')
  }
  const limit = limitParam
  const wantFullIp = url.searchParams.get('full') === '1'

  let rows: ActivityRow[]
  try {
    // country column exists post-migration 0003; older databases (tests,
    // pre-migration deploys) fall back to the 4-column shape.
    try {
      const result = await env.DB.prepare(
        `SELECT ts, ip, country, ok, note FROM auth_log ORDER BY ts DESC LIMIT ?`
      )
        .bind(limit)
        .all<ActivityRow>()
      rows = result.results ?? []
    } catch {
      const legacy = await env.DB.prepare(
        `SELECT ts, ip, ok, note FROM auth_log ORDER BY ts DESC LIMIT ?`
      )
        .bind(limit)
        .all<ActivityRow>()
      rows = (legacy.results ?? []).map((r) => ({ ...r, country: null }))
    }
  } catch {
    return jsonResponse({ ok: false, error: 'Activity log unavailable.' }, 500)
  }

  const events = rows.map((row) => {
    const note = row.note ?? ''
    const separator = note.indexOf(' — ')
    const event = separator === -1 ? note : note.slice(0, separator)
    const detail = separator === -1 ? null : note.slice(separator + 3)
    return {
      ts: row.ts,
      ok: row.ok === 1,
      event,
      detail,
      ip: wantFullIp ? (row.ip ?? 'unknown') : maskIp(row.ip),
      country: row.country ?? null,
    }
  })

  const summary = {
    total: events.length,
    failedAccess: events.filter((e) => FAILED_ACCESS_EVENTS.has(e.event)).length,
    contentEvents: events.filter((e) => CONTENT_EVENTS.has(e.event)).length,
    lastTs: events[0]?.ts ?? null,
  }

  return jsonResponse({ events, summary })
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: { Allow: 'GET, OPTIONS' } })
