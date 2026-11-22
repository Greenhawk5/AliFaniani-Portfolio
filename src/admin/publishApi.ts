/**
 * Publish + deployment-state API client (Phase 5) — admin-chunk-only.
 */

import { readCsrfToken } from './authApi'
import type { ContentKind } from './contentApi'

export interface PublishCounts {
  projects: number
  profileSections: number
  links: number
}

export interface PublishSelectedTarget {
  kind: ContentKind
  key: string
}

export interface PublishResult {
  ok: boolean
  operationId?: string
  published?: PublishCounts
  targets?: Array<{ kind: string; key: string; changeType?: string }>
  deployment?: {
    status:
      | 'pending_sync'
      | 'queued'
      | 'trigger_failed'
      | 'idle'
      | 'github_syncing'
      | 'deployment_queued'
      | 'deployed'
      | 'failed'
    reason?: string
    note?: string
  }
  sync?: {
    status: 'dispatched' | 'dispatch_failed'
    reason?: string
  }
  error?: string
}

export async function publishSelected(
  targets: PublishSelectedTarget[]
): Promise<PublishResult> {
  const response = await fetch('/api/admin/publish', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': readCsrfToken(),
    },
    body: JSON.stringify({ targets }),
  })
  const payload = (await response.json().catch(() => null)) as PublishResult | null
  if (!payload) return { ok: false, error: 'Publish request failed.' }
  return payload
}

export async function publishAll(): Promise<PublishResult> {
  const response = await fetch('/api/admin/publish', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': readCsrfToken(),
    },
    body: JSON.stringify({}),
  })
  const payload = (await response.json().catch(() => null)) as PublishResult | null
  if (!payload) return { ok: false, error: 'Publish request failed.' }
  return payload
}

export async function retrySnapshotSync(): Promise<PublishResult> {
  const response = await fetch('/api/admin/publish', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': readCsrfToken(),
    },
    body: JSON.stringify({ action: 'retry_sync' }),
  })
  const payload = (await response.json().catch(() => null)) as PublishResult | null
  if (!payload) return { ok: false, error: 'Retry sync request failed.' }
  return payload
}

export interface DeployStateInfo {
  status:
    | 'idle'
    | 'database_published'
    | 'snapshot_generating'
    | 'github_syncing'
    | 'deployment_queued'
    | 'deployed'
    | 'failed'
    | 'pending_sync'
    | 'sync_dispatch_failed'
    | 'queued'
    | 'trigger_failed'
    | null
  requestedAt: string | null
  completedAt?: string
  operationId?: string
  targetCount?: number
  targetSummary?: string
  commitSha?: string
  lastError?: string
  currentStep?: number
  stepMessage?: string
  workflowRunUrl?: string
}

export async function fetchDeployState(): Promise<DeployStateInfo> {
  const response = await fetch('/api/admin/deploy-state', { credentials: 'same-origin' })
  if (!response.ok) return { status: null, requestedAt: null }
  return (await response.json()) as DeployStateInfo
}
