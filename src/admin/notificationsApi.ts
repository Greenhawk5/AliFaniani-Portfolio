import { readCsrfToken } from './authApi'

export interface AdminNotification {
  id: string
  type: 'deploy' | 'sync' | 'security' | 'content' | 'system' | 'custom'
  severity: 'info' | 'warning' | 'critical' | 'normal' | 'important'
  priority: 'normal' | 'important' | 'critical'
  title: string
  message: string
  metadata?: Record<string, unknown> | null
  state: 'active' | 'acknowledged' | 'dismissed' | 'resolved' | 'expired' | 'archived' | 'deleted'
  isPinned: boolean
  readAt?: string | null
  archivedAt?: string | null
  linkUrl?: string | null
  sourceKey?: string | null
  createdAt: string
  acknowledgedAt?: string | null
  resolvedAt?: string | null
  expiresAt?: string | null
}

export async function fetchNotifications(filter?: { view?: string; state?: string } | string): Promise<AdminNotification[]> {
  let url = '/api/admin/notifications'
  if (typeof filter === 'string') {
    url += `?state=${encodeURIComponent(filter)}`
  } else if (filter) {
    const params = new URLSearchParams()
    if (filter.view) params.set('view', filter.view)
    if (filter.state) params.set('state', filter.state)
    const qs = params.toString()
    if (qs) url += `?${qs}`
  }

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

async function postAction(body: Record<string, unknown>): Promise<{ ok: boolean; [key: string]: unknown }> {
  const csrfToken = readCsrfToken()
  const res = await fetch('/api/admin/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    const err = new Error('Unauthorized') as Error & { status: number }
    err.status = 401
    throw err
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error || `Notification mutation failed: ${res.status}`)
  }
  return (await res.json()) as { ok: boolean }
}

export async function markNotificationRead(id: string, read = true): Promise<boolean> {
  const data = await postAction({ action: read ? 'mark_read' : 'mark_unread', id })
  return !!data.ok
}

export async function pinNotification(id: string, isPinned = true): Promise<boolean> {
  const data = await postAction({ action: isPinned ? 'pin' : 'unpin', id })
  return !!data.ok
}

export async function archiveNotification(id: string, archive = true): Promise<boolean> {
  const data = await postAction({ action: archive ? 'archive' : 'restore', id })
  return !!data.ok
}

export async function deleteNotification(id: string): Promise<boolean> {
  const data = await postAction({ action: 'delete', id })
  return !!data.ok
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const data = await postAction({ action: 'mark_all_read' })
  return !!data.ok
}

export async function clearArchivedNotifications(): Promise<boolean> {
  const data = await postAction({ action: 'clear_archived' })
  return !!data.ok
}

export async function acknowledgeNotification(id: string): Promise<boolean> {
  const data = await postAction({ action: 'acknowledge', id })
  return !!data.ok
}

export async function resolveNotification(id: string): Promise<boolean> {
  const data = await postAction({ action: 'resolve', id })
  return !!data.ok
}

export async function dismissNotification(id: string): Promise<boolean> {
  const data = await postAction({ action: 'dismiss', id })
  return !!data.ok
}

export async function createCustomNotification(data: {
  title: string
  message: string
  type?: string
  priority?: string
  linkUrl?: string
  isPinned?: boolean
}): Promise<{ ok: boolean; notification?: AdminNotification }> {
  const res = await postAction({ action: 'create', ...data })
  return { ok: !!res.ok, notification: res.notification as AdminNotification | undefined }
}
