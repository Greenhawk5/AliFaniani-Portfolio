/**
 * /api/admin/notifications — Actionable alert lifecycle management for Admin Control Center.
 *
 * GET  — list notifications (view?: all | unread | pinned | archived | system | security | custom; state?: NotificationState)
 * POST — mutate notification (actions: create, mark_read, mark_unread, pin, unpin, archive, restore, delete, mark_all_read, clear_archived, dismiss, acknowledge, resolve)
 */

import { jsonResponse, unauthorizedResponse, badRequestResponse } from '../../lib/http'
import { requireSession, requireMutationAuth } from '../../lib/session-auth'
import {
  listNotifications,
  createNotification,
  markNotificationRead,
  pinNotification,
  archiveNotification,
  deleteNotification,
  markAllNotificationsRead,
  clearArchivedNotifications,
  acknowledgeNotification,
  resolveNotification,
  dismissNotification,
  syncSystemNotifications,
  type NotificationState,
  type NotificationType,
  type NotificationPriority,
  type ListNotificationsOptions,
} from '../../lib/notifications'
import type { AdminEnv } from '../../lib/auth-env'

type Env = AdminEnv

function sanitizeText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Strip style tags and their content
    .replace(/<[^>]*>/g, '') // Strip all remaining HTML tags
    .trim()
}

export async function onRequestGet({
  request,
  env,
}: {
  request: Request
  env: Env
}): Promise<Response> {
  if (!env.DB) {
    return jsonResponse({ error: 'Database unavailable' }, 503)
  }

  const auth = await requireSession(request, env.DB)
  if (!auth) {
    return unauthorizedResponse()
  }

  const url = new URL(request.url)
  const filterState = url.searchParams.get('state') as NotificationState | null
  const view = url.searchParams.get('view') as ListNotificationsOptions['view'] | null

  // Background sync for system events
  await syncSystemNotifications(env.DB).catch(() => {})

  const options: ListNotificationsOptions = {
    view: view || undefined,
    state: filterState || undefined,
  }

  const notifications = await listNotifications(env.DB, options)

  return jsonResponse({ notifications }, 200, { 'Cache-Control': 'no-store' })
}

export async function onRequestPost({
  request,
  env,
}: {
  request: Request
  env: Env
}): Promise<Response> {
  if (!env.DB) {
    return jsonResponse({ error: 'Database unavailable' }, 503)
  }

  const auth = await requireMutationAuth(request, env.DB)
  if (!auth) {
    return unauthorizedResponse()
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return badRequestResponse('Malformed JSON body')
  }

  const action = body.action

  if (action === 'mark_read' || action === 'mark_unread') {
    if (!body.id || typeof body.id !== 'string') {
      return badRequestResponse('Missing notification id')
    }
    const success = await markNotificationRead(env.DB, body.id, action === 'mark_read')
    return jsonResponse({ ok: success })
  }

  if (action === 'pin' || action === 'unpin') {
    if (!body.id || typeof body.id !== 'string') {
      return badRequestResponse('Missing notification id')
    }
    const success = await pinNotification(env.DB, body.id, action === 'pin')
    return jsonResponse({ ok: success })
  }

  if (action === 'archive' || action === 'restore') {
    if (!body.id || typeof body.id !== 'string') {
      return badRequestResponse('Missing notification id')
    }
    const success = await archiveNotification(env.DB, body.id, action === 'archive')
    return jsonResponse({ ok: success })
  }

  if (action === 'delete') {
    if (!body.id || typeof body.id !== 'string') {
      return badRequestResponse('Missing notification id')
    }
    const success = await deleteNotification(env.DB, body.id)
    return jsonResponse({ ok: success })
  }

  if (action === 'mark_all_read') {
    const success = await markAllNotificationsRead(env.DB)
    return jsonResponse({ ok: success })
  }

  if (action === 'clear_archived') {
    const success = await clearArchivedNotifications(env.DB)
    return jsonResponse({ ok: success })
  }

  if (action === 'acknowledge') {
    if (!body.id || typeof body.id !== 'string') {
      return badRequestResponse('Missing notification id')
    }
    const success = await acknowledgeNotification(env.DB, body.id)
    return jsonResponse({ ok: success })
  }

  if (action === 'resolve') {
    if (!body.id || typeof body.id !== 'string') {
      return badRequestResponse('Missing notification id')
    }
    const success = await resolveNotification(env.DB, body.id)
    return jsonResponse({ ok: success })
  }

  if (action === 'dismiss') {
    if (!body.id || typeof body.id !== 'string') {
      return badRequestResponse('Missing notification id')
    }
    const success = await dismissNotification(env.DB, body.id)
    return jsonResponse({ ok: success })
  }

  if (action === 'create') {
    if (!body.title || typeof body.title !== 'string') {
      return badRequestResponse('Missing or invalid title')
    }
    if (!body.message || typeof body.message !== 'string') {
      return badRequestResponse('Missing or invalid message')
    }

    const cleanTitle = sanitizeText(body.title)
    const cleanMessage = sanitizeText(body.message)

    if (!cleanTitle || cleanTitle.length > 120) {
      return badRequestResponse('Title must be between 1 and 120 characters')
    }
    if (!cleanMessage || cleanMessage.length > 1000) {
      return badRequestResponse('Message must be between 1 and 1000 characters')
    }

    const allowedTypes: NotificationType[] = ['system', 'security', 'content', 'deploy', 'sync', 'custom']
    const type = allowedTypes.includes(body.type as NotificationType)
      ? (body.type as NotificationType)
      : 'custom'

    const allowedPriorities: NotificationPriority[] = ['normal', 'important', 'critical']
    const priority = allowedPriorities.includes(body.priority as NotificationPriority)
      ? (body.priority as NotificationPriority)
      : 'normal'

    let linkUrl: string | undefined = undefined
    if (typeof body.linkUrl === 'string' && body.linkUrl.trim()) {
      const trimmed = body.linkUrl.trim()
      if (trimmed.length > 500) {
        return badRequestResponse('linkUrl cannot exceed 500 characters')
      }
      linkUrl = trimmed
    }

    const isPinned = Boolean(body.isPinned)

    const notification = await createNotification(env.DB, {
      type,
      priority,
      severity: priority === 'critical' ? 'critical' : priority === 'important' ? 'warning' : 'info',
      title: cleanTitle,
      message: cleanMessage,
      linkUrl,
      isPinned,
      metadata: body.metadata as Record<string, unknown> | undefined,
      expiresAt: typeof body.expiresAt === 'string' ? body.expiresAt : undefined,
    })

    return jsonResponse({ ok: true, notification }, 201)
  }

  return badRequestResponse(`Unknown action: ${action}`)
}
