/**
 * /api/admin/notifications — Actionable alert lifecycle management for Admin Control Center.
 *
 * GET  — list notifications (state?: active | acknowledged | resolved)
 * POST — mutate notification (action: acknowledge | resolve | create)
 */

import { jsonResponse, unauthorizedResponse, badRequestResponse } from '../../lib/http'
import { requireSession, requireMutationAuth } from '../../lib/session-auth'
import {
  listNotifications,
  createNotification,
  acknowledgeNotification,
  resolveNotification,
  type NotificationState,
} from '../../lib/notifications'
import type { AdminEnv } from '../../lib/auth-env'

type Env = AdminEnv

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

  const notifications = await listNotifications(env.DB, filterState || undefined)

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

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return badRequestResponse('Malformed JSON body')
  }

  const action = body.action

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

  if (action === 'create') {
    if (!body.title || !body.message || !body.type || !body.severity) {
      return badRequestResponse('Missing required notification fields')
    }
    const notification = await createNotification(env.DB, {
      type: body.type,
      severity: body.severity,
      title: body.title,
      message: body.message,
      metadata: body.metadata,
      expiresAt: body.expiresAt,
    })
    return jsonResponse({ ok: true, notification }, 201)
  }

  return badRequestResponse(`Unknown action: ${action}`)
}
