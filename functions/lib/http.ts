/**
 * Shared HTTP response helpers for the admin API.
 *
 * Every admin/auth response is explicitly non-cacheable (no-store) — auth
 * state and draft data must never sit in any shared cache.
 */

export function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}

/** Generic credential failure — deliberately identical for every cause so
 * responses never reveal whether the password matched or the server
 * configuration is missing. */
export function unauthorizedResponse(): Response {
  return jsonResponse({ ok: false, error: 'Authentication failed.' }, 401)
}

export function badRequestResponse(error: string): Response {
  return jsonResponse({ ok: false, error }, 400)
}

export function rateLimitedResponse(retryAfterSeconds: number): Response {
  return jsonResponse({ ok: false, error: 'Too many attempts. Please try again later.' }, 429, {
    'Retry-After': String(Math.max(1, Math.ceil(retryAfterSeconds))),
  })
}

/** Extracts the client IP from Cloudflare's trusted header. */
export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown'
}
