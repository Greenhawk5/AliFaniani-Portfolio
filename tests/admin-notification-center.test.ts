import { beforeEach, describe, expect, it } from 'vitest'
import {
  FakeD1Database,
  FakeKV,
  makeEnv,
  makeContext,
  postJson,
  type TestEnv,
  interceptFetch,
  turnstileHandler,
  installFetchStub,
  clearInterceptors,
} from './helpers'
import {
  createNotification,
  markNotificationRead,
  pinNotification,
  archiveNotification,
  deleteNotification,
  markAllNotificationsRead,
  clearArchivedNotifications,
  listNotifications,
  syncSystemNotifications,
} from '../functions/lib/notifications'
import {
  onRequestGet as notificationsGetHandler,
  onRequestPost as notificationsPostHandler,
} from '../functions/api/admin/notifications'
import { onRequestPost as loginHandler } from '../functions/api/admin/login'

describe('Admin Notification Center Architecture & Lifecycle', () => {
  let db: FakeD1Database
  let kv: FakeKV
  let env: TestEnv

  beforeEach(() => {
    db = new FakeD1Database()
    kv = new FakeKV()
    env = makeEnv(db, kv)
    installFetchStub()
  })

  async function getAuthContext() {
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
    const cookies = loginRes.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loginData = (await loginRes.json()) as any
    return { cookies, csrf: loginData.csrfToken as string }
  }

  it('handles read and unread state lifecycle independently of archive and deletion', async () => {
    const notif = await createNotification(db as unknown as D1Database, {
      id: 'notif_lifecycle_1',
      type: 'system',
      title: 'Database vacuum required',
      message: 'Maintenance operation pending',
    })

    expect(notif.readAt).toBeNull()

    const readOk = await markNotificationRead(db as unknown as D1Database, 'notif_lifecycle_1', true)
    expect(readOk).toBe(true)

    const listRead = await listNotifications(db as unknown as D1Database)
    const itemRead = listRead.find((n) => n.id === 'notif_lifecycle_1')
    expect(itemRead?.readAt).toBeDefined()
    expect(itemRead?.readAt).not.toBeNull()

    // Mark as unread again
    const unreadOk = await markNotificationRead(db as unknown as D1Database, 'notif_lifecycle_1', false)
    expect(unreadOk).toBe(true)

    const listUnread = await listNotifications(db as unknown as D1Database)
    const itemUnread = listUnread.find((n) => n.id === 'notif_lifecycle_1')
    expect(itemUnread?.readAt).toBeNull()
  })

  it('handles pinning independent of read/unread state', async () => {
    await createNotification(db as unknown as D1Database, {
      id: 'notif_pin_test',
      type: 'security',
      title: 'SSH key added',
      message: 'New key provisioned',
      isPinned: false,
    })

    const pinOk = await pinNotification(db as unknown as D1Database, 'notif_pin_test', true)
    expect(pinOk).toBe(true)

    const listPinned = await listNotifications(db as unknown as D1Database, { view: 'pinned' })
    expect(listPinned.some((n) => n.id === 'notif_pin_test' && n.isPinned)).toBe(true)

    const unpinOk = await pinNotification(db as unknown as D1Database, 'notif_pin_test', false)
    expect(unpinOk).toBe(true)
  })

  it('handles archiving and permanent deletion', async () => {
    await createNotification(db as unknown as D1Database, {
      id: 'notif_arc_test',
      type: 'content',
      title: 'Draft saved',
      message: 'Draft ready for review',
    })

    // Archive
    const arcOk = await archiveNotification(db as unknown as D1Database, 'notif_arc_test', true)
    expect(arcOk).toBe(true)

    const arcList = await listNotifications(db as unknown as D1Database, { view: 'archived' })
    expect(arcList.some((n) => n.id === 'notif_arc_test')).toBe(true)

    // Permanent delete
    const delOk = await deleteNotification(db as unknown as D1Database, 'notif_arc_test')
    expect(delOk).toBe(true)

    const postDelList = await listNotifications(db as unknown as D1Database)
    expect(postDelList.some((n) => n.id === 'notif_arc_test')).toBe(false)
  })

  it('supports creating custom administrator notifications via API with XSS sanitization', async () => {
    const { cookies, csrf } = await getAuthContext()

    const createReq = postJson(
      '/api/admin/notifications',
      {
        action: 'create',
        title: '<script>alert("xss")</script>Team Meeting Tomorrow',
        message: '<b>Please prepare</b> demo slides and review project metrics.',
        type: 'custom',
        priority: 'important',
        linkUrl: '#/projects',
        isPinned: true,
      },
      { Cookie: cookies, 'X-CSRF-Token': csrf },
      '203.0.113.77'
    )

    const res = await notificationsPostHandler(makeContext(createReq, env))
    expect(res.status).toBe(201)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (await res.json()) as any
    expect(body.ok).toBe(true)
    expect(body.notification.title).toBe('Team Meeting Tomorrow') // tags stripped
    expect(body.notification.message).toBe('Please prepare demo slides and review project metrics.')
    expect(body.notification.priority).toBe('important')
    expect(body.notification.isPinned).toBe(true)
    expect(body.notification.linkUrl).toBe('#/projects')
  })

  it('rejects custom notifications without authentication or with invalid input', async () => {
    // 1. Unauthenticated request
    const unauthReq = postJson('/api/admin/notifications', {
      action: 'create',
      title: 'Test',
      message: 'Test message',
    })
    const unauthRes = await notificationsPostHandler(makeContext(unauthReq, env))
    expect(unauthRes.status).toBe(401)

    // 2. Authenticated but empty title
    const { cookies, csrf } = await getAuthContext()
    const invalidReq = postJson(
      '/api/admin/notifications',
      { action: 'create', title: '   ', message: 'Test message' },
      { Cookie: cookies, 'X-CSRF-Token': csrf }
    )
    const invalidRes = await notificationsPostHandler(makeContext(invalidReq, env))
    expect(invalidRes.status).toBe(400)
  })

  it('supports mark all read and clear archived bulk actions via API', async () => {
    const { cookies, csrf } = await getAuthContext()

    await createNotification(db as unknown as D1Database, {
      id: 'bulk_1',
      type: 'system',
      title: 'Bulk 1',
      message: 'Msg 1',
    })
    await createNotification(db as unknown as D1Database, {
      id: 'bulk_2',
      type: 'system',
      title: 'Bulk 2',
      message: 'Msg 2',
    })

    // Mark all read
    const markAllReq = postJson(
      '/api/admin/notifications',
      { action: 'mark_all_read' },
      { Cookie: cookies, 'X-CSRF-Token': csrf }
    )
    const markAllRes = await notificationsPostHandler(makeContext(markAllReq, env))
    expect(markAllRes.status).toBe(200)

    // Archive bulk_1 and clear archived
    await archiveNotification(db as unknown as D1Database, 'bulk_1', true)

    const clearArcReq = postJson(
      '/api/admin/notifications',
      { action: 'clear_archived' },
      { Cookie: cookies, 'X-CSRF-Token': csrf }
    )
    const clearArcRes = await notificationsPostHandler(makeContext(clearArcReq, env))
    expect(clearArcRes.status).toBe(200)

    const list = await listNotifications(db as unknown as D1Database)
    expect(list.some((n) => n.id === 'bulk_1')).toBe(false)
  })

  it('prevents duplicate notifications via sourceKey deduplication', async () => {
    const notif1 = await createNotification(db as unknown as D1Database, {
      title: '1 unpublished change',
      message: 'Content draft pending',
      type: 'content',
      sourceKey: 'system_unpublished_changes',
    })

    const notif2 = await createNotification(db as unknown as D1Database, {
      title: '2 unpublished changes',
      message: 'Content drafts pending',
      type: 'content',
      sourceKey: 'system_unpublished_changes',
    })

    expect(notif2.id).toBe(notif1.id)
    expect(notif2.title).toBe('2 unpublished changes')

    const all = await listNotifications(db as unknown as D1Database)
    expect(all.filter((n) => n.sourceKey === 'system_unpublished_changes')).toHaveLength(1)
  })

  it('synchronizes system state into persistent notifications', async () => {
    // 1. Unpublished count > 0 creates notification
    await syncSystemNotifications(db as unknown as D1Database, {
      unpublishedCount: 3,
      failedAccessCount: 0,
    })

    const list = await listNotifications(db as unknown as D1Database)
    const unpub = list.find((n) => n.sourceKey === 'system_unpublished_changes')
    expect(unpub).toBeDefined()
    expect(unpub?.title).toContain('3 unpublished changes')

    // 2. Publishing resolves the notification
    await syncSystemNotifications(db as unknown as D1Database, {
      unpublishedCount: 0,
      failedAccessCount: 0,
    })

    const listAfterPublish = await listNotifications(db as unknown as D1Database, { state: 'resolved' })
    expect(listAfterPublish.some((n) => n.sourceKey === 'system_unpublished_changes')).toBe(true)
  })
})

