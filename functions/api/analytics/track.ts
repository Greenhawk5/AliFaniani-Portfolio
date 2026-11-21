/**
 * POST /api/analytics/track — public, privacy-preserving page view event collection.
 *
 * Supports JSON, text/plain (navigator.sendBeacon), and query/form submissions.
 * Strips sensitive query params, filters bot traffic, and rotates session hashes daily.
 */

import { jsonResponse, clientIp } from '../../lib/http'
import { trackPageView, type TrackEventInput } from '../../lib/analytics'
import type { PagesEnv } from '../../lib/auth-env'

type Env = PagesEnv

export async function onRequestPost({
  request,
  env,
}: {
  request: Request
  env: Env
}): Promise<Response> {
  if (!env.DB) {
    return jsonResponse({ ok: false, error: 'Database unavailable' }, 503)
  }

  const contentType = request.headers.get('content-type') || ''
  let body: Record<string, unknown>

  try {
    if (contentType.includes('application/json')) {
      body = (await request.json()) as Record<string, unknown>
    } else if (contentType.includes('text/plain')) {
      // Beacon payloads often send JSON as text/plain
      const text = await request.text()
      try {
        body = JSON.parse(text)
      } catch {
        body = { path: text }
      }
    } else {
      const form = await request.formData()
      body = Object.fromEntries(form.entries())
    }
  } catch {
    body = {}
  }

  const rawPath = typeof body.path === 'string' ? body.path : '/'
  const referrer =
    typeof body.referrer === 'string'
      ? body.referrer
      : request.headers.get('referer') || null

  const ip = clientIp(request)
  const userAgent = request.headers.get('user-agent')
  const country = request.headers.get('cf-ipcountry')

  const input: TrackEventInput = {
    path: rawPath,
    referrer,
    ip,
    userAgent,
    country,
  }

  const result = await trackPageView(env.DB, input)

  return jsonResponse(
    {
      ok: true,
      tracked: result.tracked,
      unique: result.isUnique,
      bot: result.isBot,
    },
    200,
    {
      'Cache-Control': 'no-store',
    }
  )
}
