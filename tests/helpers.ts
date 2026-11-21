/**
 * Test harness: in-memory D1/KV stubs + fetch interception + a Request
 * runner that invokes the real exported PagesFunction handlers.
 *
 * No real Cloudflare credentials are used; the ADMIN_PASSWORD / Turnstile
 * secret are plain test values injected through the stub env.
 */

import { vi } from 'vitest'
import type { AdminEnv } from '../functions/lib/auth-env'

/* --------------------------------- D1 stub --------------------------------- */

type Row = Record<string, unknown>

export class FakeD1Result {
  constructor(
    private rows: Row[],
    public meta = { changes: 0, duration: 0 }
  ) {}
  toArray() {
    return this.rows
  }
  get results() {
    return this.rows
  }
}

export class FakeD1Database {
  tables: Record<string, Row[]> = {}
  /** capture of executed statements for assertions */
  statements: { sql: string; params: unknown[] }[] = []

  /** D1 batch: atomic — any statement failure rolls back the whole batch.
   * The fake applies statements in order; a test can inject a failing
   * statement (failNextBatch = true) to simulate a mid-batch error, in which
   * case prior statements' effects are reverted from captured state. */
  failNextBatch = false
  async batch(statements: { run: () => Promise<unknown> }[]): Promise<unknown> {
    if (this.failNextBatch) {
      this.failNextBatch = false
      throw new Error('simulated batch failure')
    }
    for (const statement of statements) {
      await statement.run()
    }
    return { success: true }
  }

  prepare(sql: string) {
    return {
      bind: (...params: unknown[]) => {
        this.statements.push({ sql, params })
        return {
          first: async <T>() => this.selectFirst(sql, params) as T | null,
          run: async () => this.execute(sql, params),
          all: async <T>() => ({ results: this.selectMany(sql, params) as T[] }),
        }
      },
      first: async <T>() => this.selectFirst(sql, []) as T | null,
      run: async () => this.execute(sql, []),
      all: async <T>() => ({ results: this.selectMany(sql, []) as T[] }),
    }
  }

  private matchRow(sql: string, params: unknown[]): Row | null {
    const rows = this.tableFor(sql)
    if (sql.startsWith('SELECT token_hash')) {
      const hash = params[0]
      return rows.find((r) => r.token_hash === hash) ?? null
    }
    return null
  }

  private tableFor(sql: string): Row[] {
    if (/sessions/i.test(sql)) return (this.tables.sessions ??= [])
    if (/auth_log/i.test(sql)) return (this.tables.auth_log ??= [])
    if (/media_assets/i.test(sql)) return (this.tables.media_assets ??= [])
    if (/page_view_events/i.test(sql)) return (this.tables.page_view_events ??= [])
    if (/project_analytics_daily/i.test(sql)) return (this.tables.project_analytics_daily ??= [])
    if (/analytics_daily/i.test(sql)) return (this.tables.analytics_daily ??= [])
    if (/admin_notifications/i.test(sql)) return (this.tables.admin_notifications ??= [])
    if (/[s]{0}content/i.test(sql)) return (this.tables.content ??= [])
    return (this.tables.other ??= [])
  }

  private selectFirst(sql: string, params: unknown[]): Row | null {
    const rows = this.tableFor(sql)
    if (/SELECT token_hash/.test(sql)) {
      // Mirrors the real SQL (WHERE token_hash = ?) — no expiry filtering
      // here; expiry is enforced in application code so its delete path is
      // exercised by tests.
      const hash = params[0]
      return (rows.find((r) => r.token_hash === hash) ?? null) as Row | null
    }
    if (/FROM content WHERE/i.test(sql)) {
      if (/kind = 'project' AND key = \? AND state = 'published'/.test(sql)) {
        const slug = params[0]
        return (rows.find((r) => r.kind === 'project' && r.key === slug && r.state === 'published') ?? null) as Row | null
      }
      if (/kind = \? AND key = \?/.test(sql)) {
        const [kind, key] = params
        return (rows.find((r) => r.kind === kind && r.key === key) ?? null) as Row | null
      }
    }
    if (/SELECT \* FROM media_assets WHERE id = \?/.test(sql)) {
      const id = params[0]
      return (rows.find((r) => r.id === id) ?? null) as Row | null
    }
    if (/SELECT COUNT\(\*\) as count FROM media_assets/.test(sql)) {
      let filtered = rows.filter((r) => r.state !== 'deleted')
      if (/category = \?/.test(sql)) {
        const cat = params[0]
        filtered = filtered.filter((r) => r.category === cat)
      }
      return { count: filtered.length } as Row
    }
    if (/SELECT SUM\(views\) as total_views, SUM\(unique_visitors\) as total_visitors FROM analytics_daily/.test(sql)) {
      const dailyRows = this.tables.analytics_daily ?? []
      const totalViews = dailyRows.reduce((sum, r) => sum + Number(r.views || 0), 0)
      const totalVisitors = dailyRows.reduce((sum, r) => sum + Number(r.unique_visitors || 0), 0)
      return { total_views: totalViews, total_visitors: totalVisitors } as Row
    }
    if (/SELECT COUNT\(\*\) as count FROM content WHERE kind = 'project' AND state = 'published'/.test(sql)) {
      const contentRows = this.tables.content ?? []
      const count = contentRows.filter((r) => r.kind === 'project' && r.state === 'published').length
      return { count } as Row
    }
    if (/SELECT id FROM admin_notifications WHERE type = \? AND title = \? AND state IN \('active', 'acknowledged'\)/.test(sql)) {
      const notifRows = this.tables.admin_notifications ?? []
      const [type, title] = params
      const found = notifRows.find((r) => r.type === type && r.title === title && (r.state === 'active' || r.state === 'acknowledged'))
      return found ? ({ id: found.id } as Row) : null
    }
    if (/SELECT \* FROM admin_notifications WHERE id = \?/.test(sql)) {
      const notifRows = this.tables.admin_notifications ?? []
      const found = notifRows.find((r) => r.id === params[0])
      return (found ?? null) as Row | null
    }
    return null
  }

  private selectMany(sql: string, params: unknown[]): Row[] {
    void params
    if (sql.includes('FROM content')) {
      let rows = [...(this.tables.content ?? [])]
      if (sql.includes("state = 'published'")) {
        rows = rows.filter((r) => r.state === 'published')
      }
      if (sql.includes("kind = 'project'")) {
        rows = rows.filter((r) => r.kind === 'project')
      }
      return rows
    }
    if (sql.includes('FROM auth_log')) {
      const rows = [...(this.tables.auth_log ?? [])]
      // Respect a bound `LIMIT ?` (activity endpoint passes its limit as a param).
      const limitMatch = /LIMIT\s+\?/.exec(sql)
      const limit = limitMatch ? params[0] : undefined
      if (typeof limit === 'number') return rows.slice(0, limit)
      return rows
    }
    if (sql.includes('FROM media_assets')) {
      const rows = [...(this.tables.media_assets ?? [])]
      if (/GROUP BY category/i.test(sql)) {
        const grouped: Record<string, { count: number; total_bytes: number }> = {}
        for (const r of rows) {
          if (r.state === 'deleted') continue
          const cat = String(r.category)
          grouped[cat] ??= { count: 0, total_bytes: 0 }
          grouped[cat].count++
          grouped[cat].total_bytes += Number(r.bytes || 0)
        }
        return Object.entries(grouped).map(([category, data]) => ({
          category,
          count: data.count,
          total_bytes: data.total_bytes,
        }))
      }

      let filtered = rows.filter((r) => r.state !== 'deleted')
      if (/category = \?/.test(sql)) {
        const cat = params[0]
        filtered = filtered.filter((r) => r.category === cat)
      }
      if (/display_name LIKE \?/.test(sql)) {
        const searchTerm = String(params[params.length - 3] || '').replace(/%/g, '').toLowerCase()
        if (searchTerm) {
          filtered = filtered.filter((r) =>
            String(r.display_name ?? '').toLowerCase().includes(searchTerm) ||
            String(r.original_name ?? '').toLowerCase().includes(searchTerm) ||
            String(r.associated_key ?? '').toLowerCase().includes(searchTerm)
          )
        }
      }
      filtered.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
      const limitMatch = /LIMIT\s+\?\s+OFFSET\s+\?/.exec(sql)
      if (limitMatch && params.length >= 2) {
        const limit = Number(params[params.length - 2])
        const offset = Number(params[params.length - 1])
        return filtered.slice(offset, offset + limit)
      }
      return filtered
    }
    if (sql.includes('FROM analytics_daily')) {
      const dailyRows = [...(this.tables.analytics_daily ?? [])]
      if (/GROUP BY date/i.test(sql)) {
        const byDate: Record<string, { date: string; views: number; visitors: number }> = {}
        for (const r of dailyRows) {
          const d = String(r.date)
          byDate[d] ??= { date: d, views: 0, visitors: 0 }
          byDate[d].views += Number(r.views || 0)
          byDate[d].visitors += Number(r.unique_visitors || 0)
        }
        return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
      }
      if (/GROUP BY path/i.test(sql)) {
        const byPath: Record<string, { path: string; views: number; visitors: number }> = {}
        for (const r of dailyRows) {
          const p = String(r.path)
          byPath[p] ??= { path: p, views: 0, visitors: 0 }
          byPath[p].views += Number(r.views || 0)
          byPath[p].visitors += Number(r.unique_visitors || 0)
        }
        return Object.values(byPath).sort((a, b) => b.views - a.views)
      }
      return dailyRows
    }
    if (sql.includes('FROM project_analytics_daily')) {
      const projRows = [...(this.tables.project_analytics_daily ?? [])]
      if (/GROUP BY project_slug/i.test(sql)) {
        const bySlug: Record<string, { slug: string; views: number; visitors: number }> = {}
        for (const r of projRows) {
          const s = String(r.project_slug)
          bySlug[s] ??= { slug: s, views: 0, visitors: 0 }
          bySlug[s].views += Number(r.views || 0)
          bySlug[s].visitors += Number(r.unique_visitors || 0)
        }
        return Object.values(bySlug).sort((a, b) => b.views - a.views)
      }
      return projRows
    }
    if (sql.includes('FROM page_view_events')) {
      const pageEvents = [...(this.tables.page_view_events ?? [])]
      if (/GROUP BY device_type/i.test(sql)) {
        const byDevice: Record<string, { device_type: string; count: number }> = {}
        for (const r of pageEvents) {
          if (Number(r.is_bot) === 1) continue
          const dev = String(r.device_type || 'desktop')
          byDevice[dev] ??= { device_type: dev, count: 0 }
          byDevice[dev].count++
        }
        return Object.values(byDevice).sort((a, b) => b.count - a.count)
      }
      return pageEvents
    }
    if (sql.includes('FROM admin_notifications')) {
      let notifs = [...(this.tables.admin_notifications ?? [])]
      if (/WHERE state = \?/.test(sql) && params[0]) {
        notifs = notifs.filter((n) => n.state === params[0])
      }
      return notifs.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
    }
    return []
  }

  private execute(sql: string, params: unknown[]) {
    const rows = this.tableFor(sql)
    if (/INSERT INTO content/.test(sql)) {
      const [id, kind, key, data, sort_order, state, created_at, updated_at, published_at] = params
      rows.push({ id, kind, key, data, sort_order, state, version: 1, created_at, updated_at, published_at })
    } else if (/INSERT INTO sessions/.test(sql)) {
      const [token_hash, csrf_hash, created_at, last_used_at, expires_at, ip, ua] = params
      rows.push({ token_hash, csrf_hash, created_at, last_used_at, expires_at, ip, ua })
    } else if (/INSERT INTO auth_log/.test(sql)) {
      // 5-column shape post-migration 0003 (ts, ip, country, ok, note);
      // 4-column shape for legacy inserts.
      if (/country/.test(sql)) {
        rows.push({ ts: params[0], ip: params[1], country: params[2], ok: params[3], note: params[4] })
      } else {
        rows.push({ ts: params[0], ip: params[1], country: null, ok: params[2], note: params[3] })
      }
    } else if (/DELETE FROM sessions WHERE token_hash/.test(sql)) {
      const remaining = rows.filter((r) => r.token_hash !== params[0])
      this.tables.sessions = remaining
      rows.length = 0
      rows.push(...remaining)
    } else if (/DELETE FROM sessions WHERE expires_at/.test(sql)) {
      const absCutoff = String(params[0])
      const idleCutoff = params[1] ? String(params[1]) : absCutoff
      const remaining = rows.filter((r) => String(r.expires_at) > absCutoff && String(r.last_used_at) > idleCutoff)
      this.tables.sessions = remaining
      rows.length = 0
      rows.push(...remaining)
    } else if (/UPDATE content\s+SET draft_data/.test(sql)) {
      if (/draft_data = NULL/.test(sql)) {
        // discardDraft: params [updated_at, kind, key]
        const row = rows.find((r) => r.kind === params[1] && r.key === params[2])
        if (row) {
          row.draft_data = null
          row.draft_updated_at = null
          row.draft_sort_order = null
          row.updated_at = params[0]
          row.version = Number(row.version ?? 1) + 1
        }
      } else {
        const row = rows.find((r) => r.kind === params[3] && r.key === params[4])
        if (row) {
          row.draft_data = params[0]
          row.draft_updated_at = params[1]
          row.draft_sort_order = params[2]
          row.version = Number(row.version ?? 1) + 1
        }
      }
    } else if (/UPDATE content\s+SET data/.test(sql)) {
      // Phase 5 publish SQL has published_at (5 preceding params); Phase 4 edit does not.
      const offset = /published_at/.test(sql) ? 1 : 0
      const row = rows.find((r) => r.kind === params[3 + offset] && r.key === params[4 + offset])
      if (row) {
        row.data = params[0]
        row.sort_order = params[1]
        row.updated_at = params[2]
        row.version = Number(row.version ?? 1) + 1
        if (/published_at/.test(sql)) {
          row.draft_data = null
          row.draft_updated_at = null
          row.draft_sort_order = null
          row.published_at = params[3]
        }
      }
    } else if (/UPDATE content\s+SET state = 'published'/.test(sql)) {
      // Phase 6A draft-only promotion: params [updated_at, published_at, kind, key]
      const row = rows.find((r) => r.kind === params[2] && r.key === params[3])
      if (row) {
        row.state = 'published'
        row.updated_at = params[0]
        row.published_at = params[1]
        row.version = Number(row.version ?? 1) + 1
      }
    } else if (/UPDATE content\s+SET state/.test(sql)) {
      const row = rows.find((r) => r.kind === params[1] && r.key === params[2])
      if (row) {
        row.state = 'archived'
        row.updated_at = params[0]
        row.version = Number(row.version ?? 1) + 1
      }
    } else if (/UPDATE sessions/.test(sql)) {
      const tokenHash = params.length === 2 ? params[1] : params[2]
      const row = rows.find((r) => r.token_hash === tokenHash)
      if (row) {
        row.last_used_at = params[0]
        if (params.length > 2) {
          row.expires_at = params[1]
        }
      }
    } else if (/INSERT INTO media_assets/.test(sql)) {
      const [id, r2_key, url, original_name, display_name, mime_type, bytes, width, height, category, associated_key, created_at, updated_at] = params
      rows.push({
        id,
        r2_key,
        url,
        original_name,
        display_name,
        mime_type,
        bytes,
        width,
        height,
        category,
        associated_key,
        state: 'ready',
        created_at,
        updated_at,
        deleted_at: null,
      })
    } else if (/UPDATE media_assets/.test(sql)) {
      const [displayName, category, associatedKey, now, id] = params
      const row = rows.find((r) => r.id === id)
      if (row) {
        row.display_name = displayName
        row.category = category
        row.associated_key = associatedKey
        row.updated_at = now
      }
    } else if (/DELETE FROM media_assets WHERE id/.test(sql)) {
      const id = params[0]
      const remaining = rows.filter((r) => r.id !== id)
      this.tables.media_assets = remaining
      rows.length = 0
      rows.push(...remaining)
    } else if (/INSERT INTO page_view_events/.test(sql)) {
      const [id, session_hash, path, referrer, country, device_type, is_bot, created_at] = params
      const targetRows = (this.tables.page_view_events ??= [])
      targetRows.push({ id, session_hash, path, referrer, country, device_type, is_bot, created_at })
    } else if (/INSERT INTO analytics_daily/.test(sql)) {
      const [date, path, unique_visitors] = params
      const targetRows = (this.tables.analytics_daily ??= [])
      const existing = targetRows.find((r) => r.date === date && r.path === path)
      if (existing) {
        existing.views = Number(existing.views || 0) + 1
        existing.unique_visitors = Number(existing.unique_visitors || 0) + Number(unique_visitors || 0)
      } else {
        targetRows.push({ date, path, views: 1, unique_visitors: Number(unique_visitors || 0) })
      }
    } else if (/INSERT INTO project_analytics_daily/.test(sql)) {
      const [date, project_slug, unique_visitors] = params
      const targetRows = (this.tables.project_analytics_daily ??= [])
      const existing = targetRows.find((r) => r.date === date && r.project_slug === project_slug)
      if (existing) {
        existing.views = Number(existing.views || 0) + 1
        existing.unique_visitors = Number(existing.unique_visitors || 0) + Number(unique_visitors || 0)
      } else {
        targetRows.push({ date, project_slug, views: 1, unique_visitors: Number(unique_visitors || 0) })
      }
    } else if (/INSERT INTO admin_notifications/.test(sql)) {
      const [id, type, severity, title, message, metadata, created_at, expires_at] = params
      const targetRows = (this.tables.admin_notifications ??= [])
      targetRows.push({
        id,
        type,
        severity,
        title,
        message,
        metadata,
        state: 'active',
        created_at,
        expires_at,
        acknowledged_at: null,
        resolved_at: null,
      })
    } else if (/UPDATE admin_notifications\s+SET state = 'acknowledged'/.test(sql)) {
      const [now, id] = params
      const targetRows = (this.tables.admin_notifications ??= [])
      const row = targetRows.find((r) => r.id === id)
      if (row && row.state === 'active') {
        row.state = 'acknowledged'
        row.acknowledged_at = now
        return { success: true, meta: { changes: 1 } }
      }
      return { success: true, meta: { changes: 0 } }
    } else if (/UPDATE admin_notifications\s+SET state = 'resolved'/.test(sql)) {
      const [now, id] = params
      const targetRows = (this.tables.admin_notifications ??= [])
      const row = targetRows.find((r) => r.id === id)
      if (row && (row.state === 'active' || row.state === 'acknowledged')) {
        row.state = 'resolved'
        row.resolved_at = now
        return { success: true, meta: { changes: 1 } }
      }
      return { success: true, meta: { changes: 0 } }
    }
    return { success: true, meta: { changes: 1 } }
  }

  sessionRows(): Row[] {
    return this.tables.sessions ?? []
  }

  authRows(): Row[] {
    return this.tables.auth_log ?? []
  }

  mediaRows(): Row[] {
    return this.tables.media_assets ?? []
  }
}

/* --------------------------------- R2 stub --------------------------------- */

export class FakeR2Bucket {
  objects = new Map<string, { body: Uint8Array; httpMetadata?: Record<string, string>; customMetadata?: Record<string, string>; httpEtag: string }>()
  failPuts = false
  failDeletes = false

  async put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: Record<string, string>; customMetadata?: Record<string, string> }) {
    if (this.failPuts) throw new Error('R2 put failed')
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
    const httpEtag = '"fake-etag-' + key + '"'
    this.objects.set(key, { body: bytes, httpMetadata: options?.httpMetadata, customMetadata: options?.customMetadata, httpEtag })
    return { key, size: bytes.length, etag: httpEtag, httpEtag }
  }

  async get(key: string) {
    const obj = this.objects.get(key)
    if (!obj) return null
    return {
      key,
      size: obj.body.length,
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata,
      httpEtag: obj.httpEtag,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(obj.body)
          controller.close()
        },
      }),
      arrayBuffer: async () => obj.body.buffer,
      text: async () => new TextDecoder().decode(obj.body),
    }
  }

  async delete(key: string | string[]) {
    if (this.failDeletes) throw new Error('R2 delete failed')
    const keys = Array.isArray(key) ? key : [key]
    for (const k of keys) {
      this.objects.delete(k)
    }
  }

  async list() {
    const objects = Array.from(this.objects.entries()).map(([key, obj]) => ({
      key,
      size: obj.body.length,
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata,
      httpEtag: obj.httpEtag,
    }))
    return { objects, truncated: false }
  }
}

/* --------------------------------- KV stub --------------------------------- */

export class FakeKV implements KVNamespace {
  store = new Map<string, string>()
  failWrites = false
  failReads = false

  async get(key: string): Promise<string | null> {
    if (this.failReads) throw new Error('kv unavailable')
    return this.store.get(key) ?? null
  }
  async put(key: string, value: string): Promise<void> {
    if (this.failWrites) throw new Error('kv unavailable')
    this.store.set(key, value)
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
  getWithMetadata(): never {
    throw new Error('not implemented')
  }
  list(): never {
    throw new Error('not implemented')
  }
}

/* ------------------------------- fetch stubs ------------------------------- */

type FetchHandler = (url: string, init: RequestInit | undefined) => Response | Promise<Response>

let fetchHandlers: FetchHandler[] = []

export function interceptFetch(handler: FetchHandler): void {
  fetchHandlers.push(handler)
}

export function clearInterceptors(): void {
  fetchHandlers = []
}

export function installFetchStub(): void {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    for (const handler of [...fetchHandlers].reverse()) {
      const response = handler(url, init)
      if (response) return response
    }
    throw new Error('unhandled fetch: ' + url)
  })
}

export function turnstileHandler(accept: boolean) {
  return (url: string) => {
    if (url.includes('challenges.cloudflare.com/turnstile')) {
      return new Response(JSON.stringify({ success: accept }), { status: 200 })
    }
    return null
  }
}

/* --------------------------------- env/run --------------------------------- */

export interface TestEnv extends AdminEnv {
  ADMIN_PASSWORD: string
  TURNSTILE_SECRET: string
}

export function makeEnv(db: FakeD1Database, kv: FakeKV, overrides: Partial<TestEnv> = {}): TestEnv {
  return {
    DB: db as unknown as D1Database,
    RATE_LIMIT: kv as unknown as KVNamespace,
    MEDIA_BUCKET: (overrides.MEDIA_BUCKET ?? new FakeR2Bucket()) as unknown as R2Bucket,
    ASSETS: {} as Fetcher,
    ADMIN_PASSWORD: 'test-admin-password-correct',
    TURNSTILE_SECRET: 'test-turnstile-secret',
    ...overrides,
  }
}

export type Handler = (ctx: { request: Request; env: unknown }) => Promise<Response>

export function makeContext(requestOrContext: Request | Record<string, unknown>, env?: unknown) {
  if (requestOrContext instanceof Request) {
    return { request: requestOrContext, env } as unknown as Parameters<Handler>[0]
  }
  return requestOrContext as unknown as Parameters<Handler>[0]
}

export function postJson(path: string, body: unknown, headers: Record<string, string> = {}, ip = '203.0.113.10'): Request {
  return new Request('https://alifaniani.ir' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, ...headers },
    body: JSON.stringify(body),
  })
}

export function getRequest(path: string, cookie = '', ip = '203.0.113.10'): Request {
  return new Request('https://alifaniani.ir' + path, {
    method: 'GET',
    headers: cookie ? { 'CF-Connecting-IP': ip, Cookie: cookie } : { 'CF-Connecting-IP': ip },
  })
}
