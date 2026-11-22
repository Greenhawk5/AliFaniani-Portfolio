/**
 * System Diagnostics API Client — truthful live observability for the Admin Panel.
 */

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

export async function fetchSystemHealth(): Promise<SystemHealthReport | null> {
  try {
    const response = await fetch('/api/admin/system/health', {
      credentials: 'same-origin',
    })
    if (!response.ok) return null
    return (await response.json()) as SystemHealthReport
  } catch {
    return null
  }
}
