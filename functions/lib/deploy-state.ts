/**
 * CMS-side deployment state — deliberately minimal.
 *
 * Cloudflare Pages deployment state is external; the only fully reliable
 * states the CMS can know are its own. Since the v2.0.0 orchestration fix,
 * the deploy hook is triggered BY the GitHub snapshot-sync workflow (after
 * the generated snapshot is committed to main), not by publish directly:
 *
 *   idle → pending_sync (D1 published + snapshot-sync dispatch accepted)
 *        → sync_dispatch_failed (dispatch failed; sync can be retried)
 *        → trigger_failed (reserved: kept for backward compatibility with
 *          previously recorded KV state; no longer written by publish)
 *
 * 'building' / 'deployed' / 'failed' remain unknown to the CMS ("check the
 * Pages dashboard"): the workflow's hook POST only queues a build and the
 * CMS never polls (no D1/KV churn, no Pages API token).
 *
 * Storage: a single KV key written once per publish (well inside KV free
 * limits). Failures to record state are non-fatal.
 */

export const DEPLOY_STATE_KEY = 'deploy:state'

export type TriggerStatus = 'pending_sync' | 'sync_dispatch_failed' | 'queued' | 'trigger_failed'

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

/** The deploy hook is now triggered by the GitHub snapshot-sync workflow
 * (cms-snapshot-sync.yml) after the generated snapshot is on main — publish
 * itself never calls it, so a Pages build can never start from a stale
 * snapshot. This function is retained as the shared description of the
 * handoff contract for tests and future server-side callers. */
export const DEPLOY_HOOK_TRIGGERED_BY = 'github-actions:cms-snapshot-sync'
