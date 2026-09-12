/**
 * POST /api/admin/publish — promote all validated draft overlays atomically,
 * then hand deployment off to the GitHub snapshot-sync workflow.
 *
 * Order of operations (each step's failure semantics):
 *   1. requireMutationAuth (session + CSRF)          → 401
 *   2. Load media manifest via env.ASSETS            → 500 on failure
 *   3. preparePublish: validate ALL drafts (Zod + media refs) → 400, no writes
 *   4. db.batch(statements) — atomic promotion        → 500, no partial state
 *   5. Dispatch GitHub snapshot sync (GITHUB_SYNC_TOKEN secret) → non-fatal
 *
 * The Cloudflare Deploy Hook is triggered by the GitHub Actions snapshot-sync
 * workflow (cms-snapshot-sync.yml, secret CLOUDFLARE_DEPLOY_HOOK_URL) AFTER
 * the regenerated snapshot is committed to main. Publish itself never calls
 * the hook — a Pages build can therefore never start from a stale snapshot
 * (the ordering race that produced stale production content is impossible
 * in this direction).
 *
 * Honest reporting: `pending_sync` means D1 is published and the sync
 * workflow has been dispatched; the deployment is queued only when the
 * workflow's hook POST succeeds. The CMS never claims deployment succeeded.
 *
 * No-draft publish is a safe no-op: 200 with counts of zero and NO dispatch
 * (nothing changed → no rebuild needed).
 */

import type { AdminEnv } from '../../lib/auth-env'
import { jsonResponse, unauthorizedResponse, clientIp } from '../../lib/http'
import { requireMutationAuth } from '../../lib/session-auth'
import { preparePublish, ValidationError } from '../../lib/publish'
import { recordDeployState } from '../../lib/deploy-state'
import { dispatchSnapshotSync, dispatchSyncReason } from '../../lib/github-sync'
import { logAuthEvent } from '../../lib/auth-log'

type Env = AdminEnv & { GITHUB_SYNC_TOKEN?: string }

interface ManifestShape {
  media?: Record<string, unknown>
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireMutationAuth(request, env.DB)
  if (!context) return unauthorizedResponse()
  const ip = clientIp(request)

  // 2 — media manifest from the deployed assets (generated at build time)
  let mediaManifest: Record<string, unknown>
  try {
    const manifestResponse = await env.ASSETS.fetch(new URL('/media-manifest.json', request.url).toString())
    if (manifestResponse.ok) {
      const manifest = (await manifestResponse.json()) as ManifestShape
      mediaManifest = manifest.media ?? {}
    } else {
      throw new Error(`manifest fetch returned ${manifestResponse.status}`)
    }
  } catch (error) {
    await logAuthEvent(env.DB, 'publish_failed', {
      ip,
      ok: false,
      note: `media manifest unavailable (${(error as Error).message.slice(0, 80)})`,
    })
    return jsonResponse({ ok: false, error: 'Media manifest unavailable — cannot validate publish.' }, 500)
  }

  // 3 — validate everything first
  let plan: Awaited<ReturnType<typeof preparePublish>>['plan']
  let statements: { sql: string; params: unknown[] }[]
  try {
    const prepared = await preparePublish(env.DB, mediaManifest)
    plan = prepared.plan
    statements = prepared.statements as { sql: string; params: unknown[] }[]
  } catch (error) {
    if (error instanceof ValidationError) {
      await logAuthEvent(env.DB, 'publish_failed', { ip, ok: false, note: 'validation' })
      return jsonResponse({ ok: false, error: error.message, issues: error.issues }, 400)
    }
    await logAuthEvent(env.DB, 'publish_failed', { ip, ok: false, note: 'prepare' })
    return jsonResponse({ ok: false, error: 'Could not prepare publish.' }, 500)
  }

  if (plan.targets.length === 0) {
    // Safe no-op — nothing to promote, no rebuild needed.
    return jsonResponse({
      ok: true,
      published: { projects: 0, profileSections: 0, links: 0 },
      deployment: { status: 'idle', note: 'No unpublished changes.' },
    })
  }

  // 4 — atomic promotion
  const counts = {
    projects: plan.targets.filter((t) => t.kind === 'project').length,
    profileSections: plan.targets.filter((t) => t.kind === 'profile-section').length,
    links: plan.targets.filter((t) => t.kind === 'link').length,
  }
  try {
    await env.DB.batch(
      statements.map((s) => env.DB.prepare(s.sql).bind(...s.params))
    )
  } catch (error) {
    await logAuthEvent(env.DB, 'publish_failed', {
      ip,
      ok: false,
      note: `batch: ${(error as Error).message.slice(0, 80)}`,
    })
    return jsonResponse({ ok: false, error: 'Publish transaction failed — nothing was published.' }, 500)
  }

  await logAuthEvent(env.DB, 'publish_succeeded', {
    ip,
    ok: true,
    note: `${counts.projects}p/${counts.profileSections}s/${counts.links}l`,
  })

  // 5 — repository synchronization dispatch (post-commit; failure does not
  // roll back the publish and never affects production). The dispatched
  // workflow reads production D1 itself, mirrors generated files to main,
  // and only then triggers the Cloudflare deploy hook.
  const sync = await dispatchSnapshotSync(env.GITHUB_SYNC_TOKEN)
  const syncReason = dispatchSyncReason(sync)
  await recordDeployState(env.RATE_LIMIT, {
    status: sync.ok ? 'pending_sync' : 'sync_dispatch_failed',
    requestedAt: new Date().toISOString(),
    lastError: sync.ok ? undefined : syncReason,
  })
  await logAuthEvent(env.DB, sync.ok ? 'sync_dispatched' : 'sync_dispatch_failed', {
    ip,
    ok: sync.ok,
    note: syncReason,
  })

  return jsonResponse({
    ok: true,
    published: counts,
    deployment: sync.ok
      ? { status: 'pending_sync' }
      : { status: 'pending_sync', reason: 'sync_dispatch_failed' },
    sync: sync.ok
      ? { status: 'dispatched' }
      : {
          status: 'dispatch_failed',
          reason: syncReason,
          ...(sync.diagnostics ?? {}),
        },
  })
}
