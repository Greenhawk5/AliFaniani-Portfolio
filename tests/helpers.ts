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
    if (/sessions/i.test(sql)) return this.tables.sessions ??= []
    if (/auth_log/i.test(sql)) return this.tables.auth_log ??= []
    if (/[s]{0}content/i.test(sql)) return this.tables.content ??= []
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
    if (/FROM content WHERE kind = \? AND key = \?/.test(sql)) {
      const [kind, key] = params
      return (rows.find((r) => r.kind === kind && r.key === key) ?? null) as Row | null
    }
    return null
  }

  private selectMany(sql: string, params: unknown[]): Row[] {
    void params
    if (sql.includes('FROM content')) {
      return [...(this.tables.content ?? [])]
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
      rows.push({ ts: params[0], ip: params[1], ok: params[2], note: params[3] })
    } else if (/DELETE FROM sessions WHERE token_hash/.test(sql)) {
      const remaining = rows.filter((r) => r.token_hash !== params[0])
      this.tables.sessions = remaining
      rows.length = 0
      rows.push(...remaining)
    } else if (/DELETE FROM sessions WHERE expires_at/.test(sql)) {
      const nowIso = String(params[0])
      const remaining = rows.filter((r) => String(r.expires_at) > nowIso)
      this.tables.sessions = remaining
      rows.length = 0
      rows.push(...remaining)
    } else if (/UPDATE content\s+SET draft_data/.test(sql)) {
      const row = rows.find((r) => r.kind === params[3] && r.key === params[4])
      if (row) {
        row.draft_data = params[0]
        row.draft_updated_at = params[1]
        row.draft_sort_order = params[2]
        row.version = Number(row.version ?? 1) + 1
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
      const row = rows.find((r) => r.token_hash === params[2])
      if (row) {
        row.last_used_at = params[0]
        row.expires_at = params[1]
      }
    }
    return { success: true, meta: { changes: 1 } }
  }

  sessionRows(): Row[] {
    return this.tables.sessions ?? []
  }

  authRows(): Row[] {
    return this.tables.auth_log ?? []
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
