import { beforeEach, describe, expect, it } from 'vitest'
import {
  FakeD1Database,
  FakeKV,
  makeEnv,
  makeContext,
  postJson,
  type TestEnv,
} from './helpers'
import {
  createNotification,
  dismissNotification,
  listNotifications,
} from '../functions/lib/notifications'
import { onRequestPost as notificationsPostHandler } from '../functions/api/admin/notifications'
import { onRequestPost as loginHandler } from '../functions/api/admin/login'
import { interceptFetch, turnstileHandler, installFetchStub, clearInterceptors } from './helpers'

describe('Admin Notifications Dismissal Lifecycle', () => {
  let db: FakeD1Database
  let kv: FakeKV
  let env: TestEnv

  beforeEach(() => {
    db = new FakeD1Database()
    kv = new FakeKV()
    env = makeEnv(db, kv)
    installFetchStub()
  })

  it('updates notification state from active to dismissed', async () => {
    const notif = await createNotification(db as unknown as D1Database, {
      id: 'notif_test_1',
      type: 'deploy',
      severity: 'info',
      title: 'Deploy succeeded',
      message: 'v2.3.1 deployed to edge',
    })

    expect(notif.state).toBe('active')

    const dismissed = await dismissNotification(db as unknown as D1Database, 'notif_test_1')
    expect(dismissed).toBe(true)

    const list = await listNotifications(db as unknown as D1Database, 'dismissed')
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('notif_test_1')
    expect(list[0].state).toBe('dismissed')
  })

  it('handles action: dismiss via authenticated /api/admin/notifications endpoint', async () => {
    // 1. Authenticate with CSRF and session
    interceptFetch(turnstileHandler(true))
    const loginRes = await loginHandler(
      makeContext(
        postJson(
          '/api/admin/login',
          { password: 'test-admin-password-correct', turnstileToken: 'tok' },
          {},
          '203.0.113.77'
        ),
        env
      )
    )
    clearInterceptors()
    expect(loginRes.status).toBe(200)
    const cookies = loginRes.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loginData = (await loginRes.json()) as any
    const csrf = loginData.csrfToken as string

    // 2. Create notification
    await createNotification(db as unknown as D1Database, {
      id: 'notif_to_dismiss',
      type: 'system',
      severity: 'warning',
      title: 'Storage usage high',
      message: 'R2 bucket reached 80% quota',
    })

    // 3. Post dismiss
    const dismissReq = postJson(
      '/api/admin/notifications',
      { action: 'dismiss', id: 'notif_to_dismiss' },
      { Cookie: cookies, 'X-CSRF-Token': csrf },
      '203.0.113.77'
    )
    const res = await notificationsPostHandler(makeContext(dismissReq, env))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)

    const dismissedList = await listNotifications(db as unknown as D1Database, 'dismissed')
    expect(dismissedList.some((n) => n.id === 'notif_to_dismiss')).toBe(true)
  })
})
