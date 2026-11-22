/**
 * GET /api/admin/deploy-state — minimal deployment status for the admin UI.
 * Reports only CMS-side truth (queued / trigger_failed + timestamp). The CMS
 * never claims deployed/failed — Cloudflare Pages state is external and the
 * dashboard is the source for build results.
 */

import type { AdminEnv } from '../../lib/auth-env'
import { jsonResponse, unauthorizedResponse } from '../../lib/http'
import { requireSession } from '../../lib/session-auth'
import { readDeployState, recordDeployState } from '../../lib/deploy-state'
import { getLatestSnapshotWorkflowRun } from '../../lib/github-sync'

type Env = AdminEnv & { GITHUB_SYNC_TOKEN?: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireSession(request, env.DB)
  if (!context) return unauthorizedResponse()

  const state = await readDeployState(env.RATE_LIMIT)

  // When a publish operation is in flight, check GitHub Actions to update progress
  if (
    state &&
    (state.status === 'pending_sync' ||
      state.status === 'github_syncing' ||
      state.status === 'snapshot_generating')
  ) {
    try {
      const run = await getLatestSnapshotWorkflowRun(env.GITHUB_SYNC_TOKEN)
      if (run) {
        // Compare timestamps to ensure this run corresponds to or was started after the request
        const requestedTime = new Date(state.requestedAt).getTime()
        const runCreatedTime = new Date(run.createdAt).getTime()
        // If run was created within 5 minutes before or any time after requestedAt:
        if (runCreatedTime >= requestedTime - 300_000) {
          if (run.status === 'in_progress' || run.status === 'queued') {
            state.status = 'github_syncing'
            state.currentStep = 3
            state.stepMessage = 'Repository snapshot sync is running on GitHub Actions...'
            state.workflowRunUrl = run.htmlUrl
            await recordDeployState(env.RATE_LIMIT, state)
          } else if (run.status === 'completed' && run.conclusion === 'success') {
            state.status = 'deployment_queued'
            state.currentStep = 4
            state.commitSha = run.headSha
            state.completedAt = run.updatedAt
            state.stepMessage = 'Snapshot committed and Cloudflare Pages deployment queued.'
            state.workflowRunUrl = run.htmlUrl
            await recordDeployState(env.RATE_LIMIT, state)
          } else if (run.status === 'completed' && run.conclusion === 'failure') {
            state.status = 'failed'
            state.completedAt = run.updatedAt
            state.lastError = 'GitHub snapshot sync workflow failed.'
            state.workflowRunUrl = run.htmlUrl
            await recordDeployState(env.RATE_LIMIT, state)
          }
        }
      }
    } catch {
      // Background GitHub status check is non-fatal
    }
  }

  return jsonResponse(
    state ?? {
      status: null,
      requestedAt: null,
    }
  )
}
