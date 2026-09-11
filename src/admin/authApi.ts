/**
 * Admin auth API client — admin-chunk-only module (never imported by public
 * code; enforced by the lazy /admin route boundary and verify-build).
 *
 * CSRF transport: the raw token arrives in the JS-readable admin_csrf cookie
 * (SameSite=Strict) and is echoed in X-CSRF-Token for mutations. No tokens in
 * localStorage/sessionStorage.
 */

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

export interface SessionState {
  authenticated: boolean
  csrfToken?: string
  expiresAt?: string
}

export async function fetchSessionState(): Promise<SessionState> {
  const response = await fetch('/api/admin/session', { credentials: 'same-origin' })
  if (!response.ok) return { authenticated: false }
  return (await response.json()) as SessionState
}

export interface LoginResult {
  ok: boolean
  error?: string
}

export async function login(password: string, turnstileToken: string): Promise<LoginResult> {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, turnstileToken }),
  })
  const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
  if (response.ok && payload?.ok) return { ok: true }
  return { ok: false, error: payload?.error ?? 'Authentication failed.' }
}

export async function logout(): Promise<void> {
  const csrfToken = getCookie('admin_csrf') ?? ''
  await fetch('/api/admin/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': csrfToken },
  })
}

export function readCsrfToken(): string {
  return getCookie('admin_csrf') ?? ''
}
