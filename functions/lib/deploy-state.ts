/**
 * CMS-side deployment state (Phase 5) — deliberately minimal.
 *
 * Cloudflare Pages deployment state is external; the only fully reliable
 * states the CMS can know are its own:
 *   idle → queued (deploy hook POST returned 2xx)
 *        → trigger_failed (hook request failed; D1 content IS published)
 *
 * 'building' / 'deployed' / 'failed' are reported to the UI as
 * "unknown — check the Pages dashboard": POSTing the hook only queues a
 * build and the CMS never polls (no D1/KV churn, no Pages API token).
 *
 * Storage: a single KV key written once per publish (well inside KV free
 * limits). Failures to record state are non-fatal.
 */

export const DEPLOY_STATE_KEY = 'deploy:state'

export type TriggerStatus = 'queued' | 'trigger_failed'

export interface DeployState {
  status: TriggerStatus
  requestedAt: string
  lastError?: string
}

export async function recordDeployState(kv: KVNamespace, state: DeployState): Promise<void> {
  try {
    await kv.put(DEPLOY_STATE_KEY, JSON.stringify(state))
  } catch {
    // state recording is best-effort
  }
}

export async function readDeployState(kv: KVNamespace): Promise<DeployState | null> {
  try {
    const raw = await kv.get(DEPLOY_STATE_KEY)
    return raw ? (JSON.parse(raw) as DeployState) : null
  } catch {
    return null
  }
}

/** POSTs the secret deploy hook URL. Returns true only on a 2xx response.
 * The URL is never included in errors (only its failure category). */
export async function triggerDeployHook(
  hookUrl: string | undefined
): Promise<{ ok: boolean; category: 'ok' | 'not_configured' | 'network_error' | 'http_error' | 'invalid_response'; status?: number }> {
  if (!hookUrl) return { ok: false, category: 'not_configured' }
  try {
    const response = await fetch(hookUrl, { method: 'POST' })
    if (response.ok) return { ok: true, category: 'ok', status: response.status }
    return { ok: false, category: 'http_error', status: response.status }
  } catch {
    return { ok: false, category: 'network_error' }
  }
}
