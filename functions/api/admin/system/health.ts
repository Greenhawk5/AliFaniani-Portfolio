/**
 * GET /api/admin/system/health — Truthful, live diagnostics for the Admin Panel.
 *
 * Performs real server-side checks:
 *   1. Authentication validation via requireSession (probe mode: does not touch last_used_at)
 *   2. Cloudflare D1: ping latency measurement and core tables health check
 *   3. Cloudflare KV: RATE_LIMIT binding read access check
 *   4. Cloudflare R2: MEDIA_BUCKET binding presence and safe access check
 *   5. Cloudflare Pages Runtime: host, protocol, country, and edge data
 *   6. Security Posture: presence boolean for secrets (never reveals secret values)
 *   7. First-Party Analytics: recent event verification
 *   8. Turnstile: recent verification outcomes in auth log
 */

import type { AdminEnv } from '../../../lib/auth-env'
import { jsonResponse, unauthorizedResponse } from '../../../lib/http'
import { requireSession } from '../../../lib/session-auth'
import { readDeployState } from '../../../lib/deploy-state'

type Env = AdminEnv & {
  GITHUB_SYNC_TOKEN?: string
  CLOUDFLARE_DEPLOY_HOOK_URL?: string
}

export interface D1Health {
  ok: boolean
  latencyMs: number
  tables: {
    content: number
    auth_log: number
    auth_sessions: number
    page_view_events?: number
    media_assets?: number
  }
  error?: string
}

export interface KvHealth {
  ok: boolean
  bound: boolean
  deployStateFound: boolean
  error?: string
}

export interface R2Health {
  ok: boolean
  bound: boolean
  accessible: boolean
  assetCount?: number
  error?: string
}

export interface SecretsPosture {
  adminPasswordConfigured: boolean
  turnstileConfigured: boolean
  githubSyncConfigured: boolean
  emailServiceConfigured: boolean
  deployHookConfigured: boolean
}

export interface RuntimeInfo {
  environment: 'production' | 'preview' | 'development'
  edgeColo?: string
  clientCountry?: string
  protocol: string
  host: string
}

export interface SystemHealthReport {
  timestamp: string
  overall: 'operational' | 'degraded' | 'attention'
  runtime: RuntimeInfo
  d1: D1Health
  kv: KvHealth
  r2: R2Health
  secrets: SecretsPosture
  analytics: {
    ok: boolean
    eventsCount24h: number
  }
  turnstile: {
    ok: boolean
    recentVerificationsFound: boolean
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireSession(request, env.DB, { isProbe: true })
  if (!context) return unauthorizedResponse()

  const url = new URL(request.url)
  const startTime = Date.now()

  // 1. D1 Database Check
  let d1Health: D1Health = {
    ok: false,
    latencyMs: 0,
    tables: { content: 0, auth_log: 0, auth_sessions: 0 },
  }

  try {
    const d1Start = Date.now()
    const [contentRes, authLogRes, sessionsRes, analyticsRes, mediaRes] = await Promise.allSettled([
      env.DB.prepare('SELECT count(*) as count FROM content').first<{ count: number }>(),
      env.DB.prepare('SELECT count(*) as count FROM auth_log').first<{ count: number }>(),
      env.DB.prepare('SELECT count(*) as count FROM auth_sessions').first<{ count: number }>(),
      env.DB.prepare('SELECT count(*) as count FROM page_view_events').first<{ count: number }>(),
      env.DB.prepare('SELECT count(*) as count FROM media_assets').first<{ count: number }>(),
    ])
    const d1End = Date.now()

    d1Health = {
      ok: contentRes.status === 'fulfilled' && authLogRes.status === 'fulfilled',
      latencyMs: d1End - d1Start,
      tables: {
        content: contentRes.status === 'fulfilled' ? (contentRes.value?.count ?? 0) : 0,
        auth_log: authLogRes.status === 'fulfilled' ? (authLogRes.value?.count ?? 0) : 0,
        auth_sessions: sessionsRes.status === 'fulfilled' ? (sessionsRes.value?.count ?? 0) : 0,
        page_view_events: analyticsRes.status === 'fulfilled' ? (analyticsRes.value?.count ?? 0) : undefined,
        media_assets: mediaRes.status === 'fulfilled' ? (mediaRes.value?.count ?? 0) : undefined,
      },
    }
  } catch (error) {
    d1Health.error = (error as Error).message
  }

  // 2. Cloudflare KV Check
  const kvHealth: KvHealth = {
    ok: false,
    bound: Boolean(env.RATE_LIMIT),
    deployStateFound: false,
  }

  if (env.RATE_LIMIT) {
    try {
      const state = await readDeployState(env.RATE_LIMIT)
      kvHealth.ok = true
      kvHealth.deployStateFound = state !== null
    } catch (error) {
      kvHealth.error = (error as Error).message
    }
  }

  // 3. Cloudflare R2 Media Bucket Check
  const r2Health: R2Health = {
    ok: false,
    bound: Boolean(env.MEDIA_BUCKET),
    accessible: false,
  }

  if (env.MEDIA_BUCKET) {
    try {
      const list = await env.MEDIA_BUCKET.list({ limit: 1 })
      r2Health.ok = true
      r2Health.accessible = Boolean(list)
      r2Health.assetCount = d1Health.tables.media_assets
    } catch (error) {
      r2Health.error = (error as Error).message
    }
  }

  // 4. Secrets Posture (strict boolean presence flags — values NEVER exposed)
  const secretsPosture: SecretsPosture = {
    adminPasswordConfigured: Boolean(env.ADMIN_PASSWORD),
    turnstileConfigured: Boolean(env.TURNSTILE_SECRET),
    githubSyncConfigured: Boolean(env.GITHUB_SYNC_TOKEN),
    emailServiceConfigured: Boolean(env.RESEND_API_KEY && env.EMAIL_FROM && env.EMAIL_TO),
    deployHookConfigured: Boolean(env.CLOUDFLARE_DEPLOY_HOOK_URL),
  }

  // 5. Analytics & Turnstile Status
  let analyticsOk = false
  let eventsCount24h = 0
  try {
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const recent = await env.DB.prepare(
      'SELECT count(*) as count FROM page_view_events WHERE created_at >= ?'
    )
      .bind(yesterday)
      .first<{ count: number }>()
    if (recent) {
      analyticsOk = true
      eventsCount24h = recent.count ?? 0
    }
  } catch {
    // page_view_events table might not exist in early dev databases
  }

  let recentTurnstileFound = false
  try {
    const turnstileLog = await env.DB.prepare(
      `SELECT count(*) as count FROM auth_log WHERE note LIKE 'login_success%' OR note LIKE 'login_turnstile_failed%'`
    ).first<{ count: number }>()
    recentTurnstileFound = (turnstileLog?.count ?? 0) > 0
  } catch {
    // Non-fatal probe
  }

  // 6. Runtime Context
  const cf = (request as unknown as { cf?: { colo?: string; country?: string } }).cf
  const host = request.headers.get('host') ?? url.host
  const isProductionHost = host === 'alifaniani.ir' || host === 'www.alifaniani.ir'

  const runtimeInfo: RuntimeInfo = {
    environment: isProductionHost ? 'production' : host.includes('pages.dev') ? 'preview' : 'development',
    edgeColo: cf?.colo,
    clientCountry: cf?.country ?? request.headers.get('CF-IPCountry') ?? undefined,
    protocol: url.protocol.replace(':', ''),
    host,
  }

  // Overall Health Evaluation
  const isD1Good = d1Health.ok
  const isKvGood = kvHealth.ok
  const isSecretsGood = secretsPosture.adminPasswordConfigured && secretsPosture.turnstileConfigured

  const overall: SystemHealthReport['overall'] =
    isD1Good && isKvGood && isSecretsGood
      ? 'operational'
      : isD1Good
        ? 'attention'
        : 'degraded'

  const report: SystemHealthReport = {
    timestamp: new Date().toISOString(),
    overall,
    runtime: runtimeInfo,
    d1: d1Health,
    kv: kvHealth,
    r2: r2Health,
    secrets: secretsPosture,
    analytics: {
      ok: analyticsOk,
      eventsCount24h,
    },
    turnstile: {
      ok: secretsPosture.turnstileConfigured,
      recentVerificationsFound: recentTurnstileFound,
    },
  }

  return jsonResponse(report, 200, {
    'Server-Timing': `total;dur=${Date.now() - startTime}`,
  })
}
