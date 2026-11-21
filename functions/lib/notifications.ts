/**
 * Actionable Admin Notifications System.
 *
 * Backed by D1 table `admin_notifications` with complete lifecycle:
 * active -> acknowledged -> resolved -> expired
 */

export type NotificationType = 'deploy' | 'sync' | 'security' | 'content' | 'system'
export type NotificationSeverity = 'info' | 'warning' | 'critical'
export type NotificationState = 'active' | 'acknowledged' | 'dismissed' | 'resolved' | 'expired'

export interface AdminNotification {
  id: string
  type: NotificationType
  severity: NotificationSeverity
  title: string
  message: string
  metadata?: Record<string, unknown> | null
  state: NotificationState
  createdAt: string
  acknowledgedAt?: string | null
  resolvedAt?: string | null
  expiresAt?: string | null
}

interface NotificationRow {
  id: string
  type: NotificationType
  severity: NotificationSeverity
  title: string
  message: string
  metadata?: string | null
  state: NotificationState
  created_at: string
  acknowledged_at?: string | null
  resolved_at?: string | null
  expires_at?: string | null
}

export async function listNotifications(
  db: D1Database,
  filterState?: NotificationState
): Promise<AdminNotification[]> {
  try {
    const nowIso = new Date().toISOString()
    // Auto-expire stale notifications whose expires_at has passed
    try {
      await db
        .prepare(
          `UPDATE admin_notifications
           SET state = 'expired'
           WHERE state IN ('active', 'acknowledged')
             AND expires_at IS NOT NULL
             AND expires_at < ?`
        )
        .bind(nowIso)
        .run()
    } catch {
      // non-fatal
    }

    let query = `SELECT id, type, severity, title, message, metadata, state, created_at, acknowledged_at, resolved_at, expires_at
                 FROM admin_notifications`
    const params: unknown[] = []

    if (filterState) {
      query += ` WHERE state = ? ORDER BY created_at DESC`
      params.push(filterState)
    } else {
      query += ` ORDER BY CASE state WHEN 'active' THEN 1 WHEN 'acknowledged' THEN 2 ELSE 3 END, created_at DESC LIMIT 50`
    }

    const stmt = db.prepare(query)
    const res = params.length > 0 ? await stmt.bind(...params).all<NotificationRow>() : await stmt.all<NotificationRow>()

    return (res.results || []).map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      title: r.title,
      message: r.message,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
      state: r.state,
      createdAt: r.created_at,
      acknowledgedAt: r.acknowledged_at,
      resolvedAt: r.resolved_at,
      expiresAt: r.expires_at,
    }))
  } catch {
    return []
  }
}

export async function createNotification(
  db: D1Database,
  data: {
    id?: string
    type: NotificationType
    severity: NotificationSeverity
    title: string
    message: string
    metadata?: Record<string, unknown>
    expiresAt?: string
  }
): Promise<AdminNotification> {
  const id = data.id || `notif_${crypto.randomUUID().slice(0, 12)}`
  const now = new Date().toISOString()
  const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null

  // Check if identical active notification already exists (idempotency while active)
  const existing = await db
    .prepare(
      `SELECT id FROM admin_notifications WHERE type = ? AND title = ? AND state = 'active'`
    )
    .bind(data.type, data.title)
    .first<{ id: string }>()

  if (existing) {
    // Return existing notification
    const item = await db
      .prepare(`SELECT * FROM admin_notifications WHERE id = ?`)
      .bind(existing.id)
      .first<NotificationRow>()

    if (item) {
      return {
        id: item.id,
        type: item.type,
        severity: item.severity,
        title: item.title,
        message: item.message,
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
        state: item.state,
        createdAt: item.created_at,
        acknowledgedAt: item.acknowledged_at,
        resolvedAt: item.resolved_at,
        expiresAt: item.expires_at,
      }
    }
  }

  await db
    .prepare(
      `INSERT INTO admin_notifications (id, type, severity, title, message, metadata, state, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(
      id,
      data.type,
      data.severity,
      data.title,
      data.message,
      metadataJson,
      now,
      data.expiresAt ?? null
    )
    .run()

  return {
    id,
    type: data.type,
    severity: data.severity,
    title: data.title,
    message: data.message,
    metadata: data.metadata ?? null,
    state: 'active',
    createdAt: now,
    expiresAt: data.expiresAt ?? null,
  }
}

export async function acknowledgeNotification(db: D1Database, id: string): Promise<boolean> {
  const now = new Date().toISOString()
  const res = await db
    .prepare(
      `UPDATE admin_notifications
       SET state = 'acknowledged', acknowledged_at = ?
       WHERE id = ? AND state = 'active'`
    )
    .bind(now, id)
    .run()

  return (res.meta?.changes ?? 0) > 0
}

export async function resolveNotification(db: D1Database, id: string): Promise<boolean> {
  const now = new Date().toISOString()
  const res = await db
    .prepare(
      `UPDATE admin_notifications
       SET state = 'resolved', resolved_at = ?
       WHERE id = ? AND state IN ('active', 'acknowledged')`
    )
    .bind(now, id)
    .run()

  return (res.meta?.changes ?? 0) > 0
}

export async function dismissNotification(db: D1Database, id: string): Promise<boolean> {
  const now = new Date().toISOString()
  try {
    const res = await db
      .prepare(
        `UPDATE admin_notifications
         SET state = 'dismissed', resolved_at = ?
         WHERE id = ? AND state IN ('active', 'acknowledged')`
      )
      .bind(now, id)
      .run()

    if ((res.meta?.changes ?? 0) > 0) return true
  } catch {
    // If table CHECK constraint does not yet allow 'dismissed', fall back to 'resolved'
    const res = await db
      .prepare(
        `UPDATE admin_notifications
         SET state = 'resolved', resolved_at = ?
         WHERE id = ? AND state IN ('active', 'acknowledged')`
      )
      .bind(now, id)
      .run()
    return (res.meta?.changes ?? 0) > 0
  }
  return false
}
