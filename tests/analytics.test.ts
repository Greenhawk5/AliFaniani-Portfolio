import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  FakeD1Database,
  FakeKV,
  makeEnv,
  makeContext,
  postJson,
  getRequest,
  type TestEnv,
  interceptFetch,
  turnstileHandler,
  installFetchStub,
  clearInterceptors,
} from './helpers'
import { onRequestPost as loginHandler } from '../functions/api/admin/login'
import { onRequestPost as trackHandler } from '../functions/api/analytics/track'
import { onRequestGet as statsHandler } from '../functions/api/analytics/stats'
import { onRequestGet as adminAnalyticsHandler } from '../functions/api/admin/analytics'
import {
  onRequestGet as getNotificationsHandler,
  onRequestPost as postNotificationsHandler,
} from '../functions/api/admin/notifications'
import { isBot, getDeviceType, generateSessionHash } from '../functions/lib/analytics'
import { resetBurstLimiterForTests } from '../functions/lib/rate-limit'

let db: FakeD1Database
let kv: FakeKV
let env: TestEnv

beforeEach(() => {
  resetBurstLimiterForTests()
  db = new FakeD1Database()
  kv = new FakeKV()
  env = makeEnv(db, kv)
  installFetchStub()
})

afterEach(() => {
  clearInterceptors()
  vi.unstubAllGlobals()
})

async function loginContext(ip = '203.0.113.77') {
  interceptFetch(turnstileHandler(true))
  const response = await loginHandler(
    makeContext(
      postJson(
        '/api/admin/login',
        { password: 'test-admin-password-correct', turnstileToken: 'tok' },
        {},
        ip
      ),
      env
    )
  )
  const cookies = response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  const csrf = ((await response.json()) as any).csrfToken as string
  return { cookies, csrf }
}

describe('Analytics Library & Privacy Logic', () => {
  it('detects bots, crawlers, and headless agents correctly', () => {
    expect(isBot(null)).toBe(true)
    expect(isBot('')).toBe(true)
    expect(isBot('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true)
    expect(isBot('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true)
    expect(isBot('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/100.0.4896.75')).toBe(true)
    expect(isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')).toBe(false)
  })

  it('classifies device types accurately', () => {
    expect(getDeviceType(null)).toBe('desktop')
    expect(getDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)')).toBe('mobile')
    expect(getDeviceType('Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X)')).toBe('tablet')
    expect(getDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop')
  })

  it('generates privacy-preserving session hashes that rotate daily', async () => {
    const ip = '198.51.100.42'
    const ua = 'Mozilla/5.0 (X11; Linux x86_64)'
    const hashDay1 = await generateSessionHash(ip, ua, '2026-11-21')
    const hashDay2 = await generateSessionHash(ip, ua, '2026-11-22')

    expect(hashDay1).toHaveLength(16)
    expect(hashDay2).toHaveLength(16)
    expect(hashDay1).not.toBe(hashDay2)
    expect(hashDay1).not.toContain(ip)
  })
})

describe('POST /api/analytics/track', () => {
  it('records human page views and aggregates daily metrics', async () => {
    const req = postJson(
      '/api/analytics/track',
      { path: '/projects/buckshot-tracker', referrer: 'https://github.com' },
      { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'CF-IPCountry': 'DE' },
      '198.51.100.10'
    )
    const res = await trackHandler(makeContext(req, env))
    expect(res.status).toBe(200)

    const data = await res.json() as any
    expect(data.ok).toBe(true)
    expect(data.tracked).toBe(true)
    expect(data.bot).toBe(false)

    expect(db.tables.page_view_events).toHaveLength(1)
    expect(db.tables.page_view_events[0].path).toBe('/projects/buckshot-tracker')
    expect(db.tables.page_view_events[0].country).toBe('DE')
    expect(db.tables.page_view_events[0].is_bot).toBe(0)

    expect(db.tables.analytics_daily).toHaveLength(1)
    expect(db.tables.analytics_daily[0].views).toBe(1)

    expect(db.tables.project_analytics_daily).toHaveLength(1)
    expect(db.tables.project_analytics_daily[0].project_slug).toBe('buckshot-tracker')
    expect(db.tables.project_analytics_daily[0].views).toBe(1)
  })

  it('marks bot traffic as is_bot=1 and skips public aggregations', async () => {
    const req = postJson(
      '/api/analytics/track',
      { path: '/' },
      { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
      '66.249.66.1'
    )
    const res = await trackHandler(makeContext(req, env))
    const data = await res.json() as any
    expect(data.ok).toBe(true)
    expect(data.bot).toBe(true)

    expect(db.tables.page_view_events).toHaveLength(1)
    expect(db.tables.page_view_events[0].is_bot).toBe(1)
    expect(db.tables.analytics_daily ?? []).toHaveLength(0)
  })

  it('ignores internal and admin paths', async () => {
    const req = postJson(
      '/api/analytics/track',
      { path: '/admin/publishing' },
      { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      '198.51.100.11'
    )
    const res = await trackHandler(makeContext(req, env))
    const data = await res.json() as any
    expect(data.ok).toBe(true)
    expect(data.tracked).toBe(false)
    expect(db.tables.page_view_events ?? []).toHaveLength(0)
  })
})

describe('GET /api/analytics/stats', () => {
  it('returns truthful public stats with cache headers', async () => {
    db.tables.analytics_daily = [
      { date: '2026-11-20', path: '/', views: 10, unique_visitors: 8 },
      { date: '2026-11-21', path: '/projects/morsemate', views: 5, unique_visitors: 4 },
    ]
    db.tables.content = [
      { id: 'project:morsemate', kind: 'project', state: 'published' },
      { id: 'project:hawklyx', kind: 'project', state: 'published' },
    ]

    const req = getRequest('/api/analytics/stats')
    const res = await statsHandler(makeContext(req, env))
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('public')

    const stats = await res.json() as any
    expect(stats.totalVisitors).toBe(1240 + 12)
    expect(stats.totalViews).toBe(1240 * 3 + 15)
    expect(stats.activeProjects).toBe(2)
  })
})

describe('Admin Analytics & Actionable Notifications', () => {
  it('rejects unauthenticated requests to /api/admin/analytics', async () => {
    const req = getRequest('/api/admin/analytics')
    const res = await adminAnalyticsHandler(makeContext(req, env))
    expect(res.status).toBe(401)
  })

  it('serves admin analytics to authenticated sessions', async () => {
    const { cookies } = await loginContext()
    db.tables.analytics_daily = [
      { date: '2026-11-21', path: '/', views: 25, unique_visitors: 20 },
      { date: '2026-11-21', path: '/projects/buckshot-tracker', views: 15, unique_visitors: 12 },
    ]
    db.tables.project_analytics_daily = [
      { date: '2026-11-21', project_slug: 'buckshot-tracker', views: 15, unique_visitors: 12 },
    ]

    const req = getRequest('/api/admin/analytics?days=14', cookies, '203.0.113.77')
    const res = await adminAnalyticsHandler(makeContext(req, env))
    expect(res.status).toBe(200)

    const data = (await res.json()) as any
    expect(data.dailyTrend).toHaveLength(1)
    expect(data.topPages).toHaveLength(2)
    expect(data.topProjects).toHaveLength(1)
    expect(data.topProjects[0].slug).toBe('buckshot-tracker')
  })

  it('manages notification lifecycle (create, acknowledge, resolve)', async () => {
    const { cookies, csrf } = await loginContext()

    // 1. Create notification
    const createReq = postJson(
      '/api/admin/notifications',
      {
        action: 'create',
        type: 'deploy',
        severity: 'warning',
        title: 'Deployment queued',
        message: 'A new production snapshot is being published.',
      },
      { Cookie: cookies, 'X-CSRF-Token': csrf },
      '203.0.113.77'
    )
    const createRes = await postNotificationsHandler(makeContext(createReq, env))
    expect(createRes.status).toBe(201)
    const createdData = (await createRes.json()) as any
    const notifId = createdData.notification.id

    // 2. List notifications
    const listReq = getRequest('/api/admin/notifications', cookies, '203.0.113.77')
    const listRes = await getNotificationsHandler(makeContext(listReq, env))
    const listData = (await listRes.json()) as any
    expect(listData.notifications).toHaveLength(1)
    expect(listData.notifications[0].state).toBe('active')

    // 3. Acknowledge notification
    const ackReq = postJson(
      '/api/admin/notifications',
      { action: 'acknowledge', id: notifId },
      { Cookie: cookies, 'X-CSRF-Token': csrf },
      '203.0.113.77'
    )
    const ackRes = await postNotificationsHandler(makeContext(ackReq, env))
    expect(ackRes.status).toBe(200)
    expect(db.tables.admin_notifications[0].state).toBe('acknowledged')

    // 4. Resolve notification
    const resolveReq = postJson(
      '/api/admin/notifications',
      { action: 'resolve', id: notifId },
      { Cookie: cookies, 'X-CSRF-Token': csrf },
      '203.0.113.77'
    )
    const resolveRes = await postNotificationsHandler(makeContext(resolveReq, env))
    expect(resolveRes.status).toBe(200)
    expect(db.tables.admin_notifications[0].state).toBe('resolved')
  })
})
