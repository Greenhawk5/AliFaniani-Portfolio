/**
 * Publish + deployment-state API client (Phase 5) — admin-chunk-only.
 */

import { readCsrfToken } from './authApi'

export interface PublishCounts {
  projects: number
  profileSections: number
  links: number
}

export interface PublishResult {
  ok: boolean
  published?: PublishCounts
  deployment?: {
    status: 'pending_sync' | 'queued' | 'trigger_failed' | 'idle'
    reason?: string
    note?: string
  }
  sync?: {
    status: 'dispatched' | 'dispatch_failed'
    reason?: string
  }
  error?: string
}

export async function publishAll(): Promise<PublishResult> {
  const response = await fetch('/api/admin/publish', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': readCsrfToken() },
  })
  const payload = (await response.json().catch(() => null)) as PublishResult | null
  if (!payload) return { ok: false, error: 'Publish request failed.' }
  return payload
}

export interface DeployStateInfo {
  status: 'pending_sync' | 'sync_dispatch_failed' | 'queued' | 'trigger_failed' | null
  requestedAt: string | null
  lastError?: string
}

export async function fetchDeployState(): Promise<DeployStateInfo> {
  const response = await fetch('/api/admin/deploy-state', { credentials: 'same-origin' })
  if (!response.ok) return { status: null, requestedAt: null }
  return (await response.json()) as DeployStateInfo
}
