import { readCsrfToken } from './authApi'

export interface AdminNotification {
  id: string
  type: 'deploy' | 'sync' | 'security' | 'content' | 'system'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  metadata?: Record<string, unknown> | null
  state: 'active' | 'acknowledged' | 'dismissed' | 'resolved' | 'expired'
  createdAt: string
  acknowledgedAt?: string | null
  resolvedAt?: string | null
  expiresAt?: string | null
}

export async function fetchNotifications(state?: string): Promise<AdminNotification[]> {
  const url = state
    ? `/api/admin/notifications?state=${encodeURIComponent(state)}`
    : '/api/admin/notifications'

  const res = await fetch(url)
  if (res.status === 401) {
    const err = new Error('Unauthorized') as Error & { status: number }
    err.status = 401
    throw err
  }
  if (!res.ok) {
    throw new Error(`Failed to load notifications: ${res.status}`)
  }
  const data = (await res.json()) as { notifications: AdminNotification[] }
  return data.notifications || []
}

export async function acknowledgeNotification(id: string): Promise<boolean> {
  const csrfToken = readCsrfToken()
  const res = await fetch('/api/admin/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ action: 'acknowledge', id }),
  })
  if (res.status === 401) {
    const err = new Error('Unauthorized') as Error & { status: number }
    err.status = 401
    throw err
  }
  if (!res.ok) return false
  const data = (await res.json()) as { ok: boolean }
  return !!data.ok
}

export async function resolveNotification(id: string): Promise<boolean> {
  const csrfToken = readCsrfToken()
  const res = await fetch('/api/admin/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ action: 'resolve', id }),
  })
  if (res.status === 401) {
    const err = new Error('Unauthorized') as Error & { status: number }
    err.status = 401
    throw err
  }
  if (!res.ok) return false
  const data = (await res.json()) as { ok: boolean }
  return !!data.ok
}

export async function dismissNotification(id: string): Promise<boolean> {
  const csrfToken = readCsrfToken()
  const res = await fetch('/api/admin/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ action: 'dismiss', id }),
  })
  if (res.status === 401) {
    const err = new Error('Unauthorized') as Error & { status: number }
    err.status = 401
    throw err
  }
  if (!res.ok) return false
  const data = (await res.json()) as { ok: boolean }
  return !!data.ok
}
