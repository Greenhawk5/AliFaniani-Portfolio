/**
 * Activity API client — admin-chunk-only. Wraps GET /api/admin/activity
 * (structured auth_log events; server parses audit notes + masks IPs).
 */

import { readCsrfToken } from './authApi'

export interface ActivityEvent {
  ts: string
  ok: boolean
  event: string
  detail: string | null
  /** Masked network prefix by default; full IP when fetched with fullIp. */
  ip: string
  /** Authoritative CF-IPCountry code captured at event time, or null for
   * historical rows that predate capture. */
  country: string | null
}

export interface ActivitySummary {
  total: number
  failedAccess: number
  contentEvents: number
  lastTs: string | null
}

export async function fetchActivity(
  limit = 100,
  fullIp = false
): Promise<{ events: ActivityEvent[]; summary: ActivitySummary }> {
  const response = await fetch(`/api/admin/activity?limit=${limit}${fullIp ? '&full=1' : ''}`, {
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': readCsrfToken() },
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `Activity request failed (${response.status})`)
  }
  return (await response.json()) as { events: ActivityEvent[]; summary: ActivitySummary }
}
