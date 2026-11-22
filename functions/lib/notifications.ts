/**
 * Actionable Admin Notifications System.
 *
 * Backed by D1 table `admin_notifications` with complete lifecycle:
 * Unread -> Read, Pinned/Unpinned, Active -> Archived -> Deleted.
 * Supports system, security, publishing, deployment, and custom administrator notifications.
 */

export type NotificationType = 'deploy' | 'sync' | 'security' | 'content' | 'system' | 'custom'
export type NotificationSeverity = 'info' | 'warning' | 'critical' | 'normal' | 'important'
export type NotificationPriority = 'normal' | 'important' | 'critical'
export type NotificationState = 'active' | 'acknowledged' | 'dismissed' | 'resolved' | 'expired' | 'archived' | 'deleted'

export interface AdminNotification {
  id: string
  type: NotificationType
  severity: NotificationSeverity
  priority: NotificationPriority
  title: string
  message: string
  metadata?: Record<string, unknown> | null
  state: NotificationState
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
  read_at?: string | null
  archived_at?: string | null
  is_pinned?: number | null
  link_url?: string | null
  source_key?: string | null
  priority?: string | null
}

function mapRow(r: NotificationRow): AdminNotification {
  let meta: Record<string, unknown> | null = null
  if (r.metadata) {
    try {
      meta = JSON.parse(r.metadata)
    } catch {
      meta = null
    }
  }

  // Determine readAt
  const readAt = r.read_at ?? (meta && typeof meta.readAt === 'string' ? meta.readAt : null)
  // Determine isPinned
  const isPinned = Boolean(r.is_pinned === 1 || (meta && meta.isPinned === true))
  // Determine linkUrl
  const linkUrl = r.link_url ?? (meta && typeof meta.linkUrl === 'string' ? meta.linkUrl : null)
  // Determine sourceKey
  const sourceKey = r.source_key ?? (meta && typeof meta.sourceKey === 'string' ? meta.sourceKey : null)
  // Determine archivedAt
  const archivedAt = r.archived_at ?? (meta && typeof meta.archivedAt === 'string' ? meta.archivedAt : null)

  // Determine priority
  let priority: NotificationPriority = 'normal'
  if (r.priority === 'critical' || r.priority === 'important' || r.priority === 'normal') {
    priority = r.priority
  } else if (meta && (meta.priority === 'critical' || meta.priority === 'important' || meta.priority === 'normal')) {
    priority = meta.priority as NotificationPriority
  } else if (r.severity === 'critical') {
    priority = 'critical'
  } else if (r.severity === 'warning' || r.severity === 'important') {
    priority = 'important'
  }

  return {
    id: r.id,
    type: r.type,
    severity: r.severity,
    priority,
    title: r.title,
    message: r.message,
    metadata: meta,
    state: r.state,
    isPinned,
    readAt,
    archivedAt,
    linkUrl,
    sourceKey,
    createdAt: r.created_at,
    acknowledgedAt: r.acknowledged_at,
    resolvedAt: r.resolved_at,
    expiresAt: r.expires_at,
  }
}

export interface ListNotificationsOptions {
  view?: 'all' | 'unread' | 'pinned' | 'archived' | 'system' | 'security' | 'custom'
  state?: NotificationState
  limit?: number
}

export async function listNotifications(
  db: D1Database,
  filterOrOptions?: NotificationState | ListNotificationsOptions
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

    const options: ListNotificationsOptions =
      typeof filterOrOptions === 'string'
        ? { state: filterOrOptions as NotificationState }
        : filterOrOptions || {}

    let query = `SELECT * FROM admin_notifications`
    const params: unknown[] = []
    const conditions: string[] = []

    if (options.state) {
      conditions.push(`state = ?`)
      params.push(options.state)
    } else if (options.view) {
      switch (options.view) {
        case 'unread':
          conditions.push(`state NOT IN ('archived', 'deleted') AND (read_at IS NULL OR read_at = '')`)
          break
        case 'pinned':
          conditions.push(`is_pinned = 1 AND state != 'deleted'`)
          break
        case 'archived':
          conditions.push(`state = 'archived'`)
          break
        case 'system':
          conditions.push(`type IN ('system', 'content', 'sync', 'deploy') AND state NOT IN ('archived', 'deleted')`)
          break
        case 'security':
          conditions.push(`type = 'security' AND state NOT IN ('archived', 'deleted')`)
          break
        case 'custom':
          conditions.push(`type = 'custom' AND state NOT IN ('archived', 'deleted')`)
          break
        case 'all':
        default:
          conditions.push(`state != 'deleted'`)
          break
      }
    } else {
      conditions.push(`state != 'deleted'`)
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ')
    }

    query += ` ORDER BY is_pinned DESC, CASE state WHEN 'active' THEN 1 WHEN 'acknowledged' THEN 2 ELSE 3 END, created_at DESC`
    const limit = options.limit ?? 100
    query += ` LIMIT ${limit}`

    let res: { results?: NotificationRow[] }
    try {
      const stmt = db.prepare(query)
      res = params.length > 0 ? await stmt.bind(...params).all<NotificationRow>() : await stmt.all<NotificationRow>()
    } catch {
      // Fallback query if columns like is_pinned or read_at don't exist yet in D1 schema
      const fallbackQuery = `SELECT id, type, severity, title, message, metadata, state, created_at, acknowledged_at, resolved_at, expires_at FROM admin_notifications ORDER BY created_at DESC LIMIT 100`
      res = await db.prepare(fallbackQuery).all<NotificationRow>()
    }

    let notifications = (res.results || []).map(mapRow)

    // In-memory filter fallback in case SQL columns didn't exist yet
    if (options.view === 'unread') {
      notifications = notifications.filter((n) => !n.readAt && n.state !== 'archived' && n.state !== 'deleted')
    } else if (options.view === 'pinned') {
      notifications = notifications.filter((n) => n.isPinned && n.state !== 'deleted')
    } else if (options.view === 'archived') {
      notifications = notifications.filter((n) => n.state === 'archived')
    } else if (options.view === 'custom') {
      notifications = notifications.filter((n) => n.type === 'custom' && n.state !== 'deleted')
    }

    return notifications
  } catch {
    return []
  }
}

export async function createNotification(
  db: D1Database,
  data: {
    id?: string
    type: NotificationType
    severity?: NotificationSeverity
    priority?: NotificationPriority
    title: string
    message: string
    metadata?: Record<string, unknown>
    expiresAt?: string
    linkUrl?: string
    isPinned?: boolean
    sourceKey?: string
  }
): Promise<AdminNotification> {
  const id = data.id || `notif_${crypto.randomUUID().slice(0, 12)}`
  const now = new Date().toISOString()
  const priority = data.priority || (data.severity === 'critical' ? 'critical' : data.severity === 'warning' ? 'important' : 'normal')
  const severity: NotificationSeverity = data.severity || (priority === 'critical' ? 'critical' : priority === 'important' ? 'warning' : 'info')
  const isPinned = data.isPinned ? 1 : 0

  const metadata: Record<string, unknown> = {
    ...(data.metadata || {}),
    priority,
    isPinned: Boolean(data.isPinned),
    linkUrl: data.linkUrl ?? null,
    sourceKey: data.sourceKey ?? null,
  }
  const metadataJson = JSON.stringify(metadata)

  // Deduplication check: by sourceKey if provided, or by type + title
  if (data.sourceKey) {
    try {
      const existing = await db
        .prepare(
          `SELECT id, state FROM admin_notifications WHERE source_key = ? AND state IN ('active', 'acknowledged', 'dismissed', 'archived')`
        )
        .bind(data.sourceKey)
        .first<{ id: string; state: NotificationState }>()

      if (existing) {
        // Update existing notification content while keeping state
        try {
          await db
            .prepare(
              `UPDATE admin_notifications
               SET title = ?, message = ?, metadata = ?, severity = ?, priority = ?, link_url = ?, is_pinned = ?
               WHERE id = ?`
            )
            .bind(data.title, data.message, metadataJson, severity, priority, data.linkUrl ?? null, isPinned, existing.id)
            .run()
        } catch {
          await db
            .prepare(
              `UPDATE admin_notifications
               SET title = ?, message = ?, metadata = ?, severity = ?
               WHERE id = ?`
            )
            .bind(data.title, data.message, metadataJson, severity, existing.id)
            .run()
        }

        const item = await db
          .prepare(`SELECT * FROM admin_notifications WHERE id = ?`)
          .bind(existing.id)
          .first<NotificationRow>()

        if (item) return mapRow(item)
      }
    } catch {
      // non-fatal
    }
  } else {
    // Check if identical active notification already exists (idempotency while active)
    try {
      const existing = await db
        .prepare(
          `SELECT id FROM admin_notifications WHERE type = ? AND title = ? AND state = 'active'`
        )
        .bind(data.type, data.title)
        .first<{ id: string }>()

      if (existing) {
        const item = await db
          .prepare(`SELECT * FROM admin_notifications WHERE id = ?`)
          .bind(existing.id)
          .first<NotificationRow>()

        if (item) return mapRow(item)
      }
    } catch {
      // non-fatal
    }
  }

  // Attempt insert with expanded columns
  try {
    await db
      .prepare(
        `INSERT INTO admin_notifications (
          id, type, severity, title, message, metadata, state, created_at, expires_at, is_pinned, link_url, source_key, priority
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.type,
        severity,
        data.title,
        data.message,
        metadataJson,
        now,
        data.expiresAt ?? null,
        isPinned,
        data.linkUrl ?? null,
        data.sourceKey ?? null,
        priority
      )
      .run()
  } catch {
    // Fallback insert with backward-compatible columns (storing extra in metadata)
    await db
      .prepare(
        `INSERT INTO admin_notifications (id, type, severity, title, message, metadata, state, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`
      )
      .bind(
        id,
        data.type === 'custom' ? 'system' : data.type,
        severity,
        data.title,
        data.message,
        metadataJson,
        now,
        data.expiresAt ?? null
      )
      .run()
  }

  return {
    id,
    type: data.type,
    severity,
    priority,
    title: data.title,
    message: data.message,
    metadata,
    state: 'active',
    isPinned: Boolean(data.isPinned),
    readAt: null,
    archivedAt: null,
    linkUrl: data.linkUrl ?? null,
    sourceKey: data.sourceKey ?? null,
    createdAt: now,
    expiresAt: data.expiresAt ?? null,
  }
}

export async function markNotificationRead(db: D1Database, id: string, read = true): Promise<boolean> {
  const readAt = read ? new Date().toISOString() : null
  try {
    const res = await db
      .prepare(`UPDATE admin_notifications SET read_at = ? WHERE id = ?`)
      .bind(readAt, id)
      .run()
    if ((res.meta?.changes ?? 0) > 0) return true
  } catch {
    // If column doesn't exist, update metadata JSON
    const row = await db.prepare(`SELECT metadata FROM admin_notifications WHERE id = ?`).bind(id).first<{ metadata: string | null }>()
    if (row) {
      let meta: Record<string, unknown> = {}
      try {
        if (row.metadata) meta = JSON.parse(row.metadata)
      } catch {
        /* non-fatal */
      }
      meta.readAt = readAt
      await db.prepare(`UPDATE admin_notifications SET metadata = ? WHERE id = ?`).bind(JSON.stringify(meta), id).run()
      return true
    }
  }
  return false
}

export async function pinNotification(db: D1Database, id: string, isPinned = true): Promise<boolean> {
  const pinnedVal = isPinned ? 1 : 0
  try {
    const res = await db
      .prepare(`UPDATE admin_notifications SET is_pinned = ? WHERE id = ?`)
      .bind(pinnedVal, id)
      .run()
    if ((res.meta?.changes ?? 0) > 0) return true
  } catch {
    // Fallback to metadata
    const row = await db.prepare(`SELECT metadata FROM admin_notifications WHERE id = ?`).bind(id).first<{ metadata: string | null }>()
    if (row) {
      let meta: Record<string, unknown> = {}
      try {
        if (row.metadata) meta = JSON.parse(row.metadata)
      } catch {
        /* non-fatal */
      }
      meta.isPinned = isPinned
      await db.prepare(`UPDATE admin_notifications SET metadata = ? WHERE id = ?`).bind(JSON.stringify(meta), id).run()
      return true
    }
  }
  return false
}

export async function archiveNotification(db: D1Database, id: string, archive = true): Promise<boolean> {
  const now = new Date().toISOString()
  const nextState: NotificationState = archive ? 'archived' : 'active'
  const archivedAt = archive ? now : null

  try {
    const res = await db
      .prepare(`UPDATE admin_notifications SET state = ?, archived_at = ? WHERE id = ?`)
      .bind(nextState, archivedAt, id)
      .run()
    if ((res.meta?.changes ?? 0) > 0) return true
  } catch {
    // Fallback for older schema
    try {
      const res = await db
        .prepare(`UPDATE admin_notifications SET state = ? WHERE id = ?`)
        .bind(archive ? 'dismissed' : 'active', id)
        .run()
      if ((res.meta?.changes ?? 0) > 0) return true
    } catch {
      return false
    }
  }
  return false
}

export async function deleteNotification(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare(`DELETE FROM admin_notifications WHERE id = ?`).bind(id).run()
  return (res.meta?.changes ?? 0) > 0
}

export async function markAllNotificationsRead(db: D1Database): Promise<boolean> {
  const now = new Date().toISOString()
  try {
    await db
      .prepare(`UPDATE admin_notifications SET read_at = ? WHERE read_at IS NULL AND state != 'deleted'`)
      .bind(now)
      .run()
    return true
  } catch {
    // Fallback: list and mark
    try {
      const list = await listNotifications(db, { view: 'unread' })
      for (const item of list) {
        await markNotificationRead(db, item.id, true)
      }
      return true
    } catch {
      return false
    }
  }
}

export async function clearArchivedNotifications(db: D1Database): Promise<boolean> {
  try {
    await db.prepare(`DELETE FROM admin_notifications WHERE state IN ('archived', 'dismissed', 'deleted')`).run()
    return true
  } catch {
    return false
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
    return archiveNotification(db, id, true)
  }
  return false
}

/**
 * Synchronize system state into persistent notifications.
 * Ensures:
 * 1. Unpublished CMS changes are tracked and resolve when published.
 * 2. Failed sign-ins are tracked with reviewed cooldowns.
 * 3. Deployments in progress are tracked and resolved when done.
 */
export async function syncSystemNotifications(
  db: D1Database,
  context?: {
    unpublishedCount?: number
    deployStatus?: string | null
    failedAccessCount?: number
    lastFailedAt?: string | null
  }
): Promise<void> {
  try {
    // 1. Check unpublished changes
    let unpublishedCount = context?.unpublishedCount
    if (unpublishedCount === undefined) {
      try {
        const row = await db
          .prepare(
            `SELECT COUNT(*) as count FROM content WHERE state = 'draft' OR (has_draft = 1)`
          )
          .first<{ count: number }>()
        unpublishedCount = row?.count ?? 0
      } catch {
        unpublishedCount = 0
      }
    }

    if (unpublishedCount > 0) {
      await createNotification(db, {
        type: 'content',
        severity: 'warning',
        priority: 'important',
        title: `${unpublishedCount} unpublished change${unpublishedCount === 1 ? '' : 's'}`,
        message: 'Edits exist in D1 that the live website does not show yet.',
        linkUrl: '#/publishing',
        sourceKey: 'system_unpublished_changes',
        metadata: { unpublishedCount, route: 'publishing' },
      })
    } else {
      // Resolve if active
      await db
        .prepare(
          `UPDATE admin_notifications SET state = 'resolved', resolved_at = ?
           WHERE source_key = 'system_unpublished_changes' AND state IN ('active', 'acknowledged')`
        )
        .bind(new Date().toISOString())
        .run()
        .catch(() => {})
    }

    // 2. Check failed sign-ins
    let failedCount = context?.failedAccessCount
    let lastFailedTime = context?.lastFailedAt
    if (failedCount === undefined) {
      try {
        const row = await db
          .prepare(
            `SELECT COUNT(*) as count, MAX(created_at) as last_failed
             FROM auth_log
             WHERE note LIKE '%failed%' AND created_at >= datetime('now', '-24 hours')`
          )
          .first<{ count: number; last_failed: string | null }>()
        failedCount = row?.count ?? 0
        lastFailedTime = row?.last_failed ?? null
      } catch {
        failedCount = 0
      }
    }

    if (failedCount > 0) {
      // Check existing notification
      const existing = await db
        .prepare(`SELECT id, state, metadata FROM admin_notifications WHERE source_key = 'system_failed_access'`)
        .first<{ id: string; state: NotificationState; metadata: string | null }>()

      let lastReviewedAt: string | null = null
      if (existing?.metadata) {
        try {
          const parsed = JSON.parse(existing.metadata)
          lastReviewedAt = parsed.lastReviewedAt ?? null
        } catch {
          /* non-fatal */
        }
      }

      // If user reviewed or dismissed it, only reactivate if new failed attempts happened after review
      const isNewFailureSinceReview = !lastReviewedAt || (lastFailedTime && lastFailedTime > lastReviewedAt)

      if (!existing || existing.state === 'active' || isNewFailureSinceReview) {
        await createNotification(db, {
          type: 'security',
          severity: 'warning',
          priority: 'important',
          title: `${failedCount} failed sign-in attempt${failedCount === 1 ? '' : 's'} recently`,
          message: 'Review the audit trail to confirm these are your own mistakes.',
          linkUrl: '#/activity',
          sourceKey: 'system_failed_access',
          metadata: { failedCount, lastFailedTime, route: 'activity' },
        })
      }
    }
  } catch {
    // Non-fatal background sync
  }
}
