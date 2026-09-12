/**
 * POST /api/admin/publish — promote all validated draft overlays atomically,
 * then trigger the Cloudflare Pages deploy hook.
 *
 * Order of operations (each step's failure semantics):
 *   1. requireMutationAuth (session + CSRF)          → 401
 *   2. Load media manifest via env.ASSETS            → 500 on failure
 *   3. preparePublish: validate ALL drafts (Zod + media refs) → 400, no writes
 *   4. db.batch(statements) — atomic promotion        → 500, no partial state
 *   5. Trigger DEPLOY_HOOK_URL (server-side secret)   → recorded, non-fatal
 *   6. Dispatch GitHub snapshot sync (GITHUB_SYNC_TOKEN secret) → non-fatal
 *
 * Honest reporting: D1 publish success is reported even when the hook fails
 * ("trigger_failed"); the CMS never claims deployment succeeded — hook 2xx
 * only means the build is queued.
 *
 * No-draft publish is a safe no-op: 200 with counts of zero and NO deploy
 * trigger (nothing changed → no rebuild needed).
 */

import type { AdminEnv } from '../../lib/auth-env'
import { jsonResponse, unauthorizedResponse, clientIp } from '../../lib/http'
import { requireMutationAuth } from '../../lib/session-auth'
import { preparePublish, ValidationError } from '../../lib/publish'
import { triggerDeployHook, recordDeployState } from '../../lib/deploy-state'
import { dispatchSnapshotSync, dispatchSyncReason } from '../../lib/github-sync'
import { logAuthEvent } from '../../lib/auth-log'

type Env = AdminEnv & { DEPLOY_HOOK_URL?: string; GITHUB_SYNC_TOKEN?: string }

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

  // 5 — deploy hook (post-commit; failure does not roll back)
  const trigger = await triggerDeployHook(env.DEPLOY_HOOK_URL)
  await recordDeployState(env.RATE_LIMIT, {
    status: trigger.ok ? 'queued' : 'trigger_failed',
    requestedAt: new Date().toISOString(),
    lastError: trigger.ok ? undefined : trigger.category,
  })
  await logAuthEvent(env.DB, trigger.ok ? 'deploy_triggered' : 'deploy_trigger_failed', {
    ip,
    ok: trigger.ok,
    note: trigger.ok ? `status ${trigger.status}` : trigger.category,
  })

  // 6 — repository synchronization dispatch (post-commit; failure does not
  // roll back the publish and never affects production). The dispatched
  // workflow reads production D1 itself, mirroring generated files only.
  const sync = await dispatchSnapshotSync(env.GITHUB_SYNC_TOKEN)
  const syncReason = dispatchSyncReason(sync)
  await logAuthEvent(env.DB, sync.ok ? 'sync_dispatched' : 'sync_dispatch_failed', {
    ip,
    ok: sync.ok,
    note: syncReason,
  })

  return jsonResponse({
    ok: true,
    published: counts,
    deployment: trigger.ok
      ? { status: 'queued' }
      : { status: 'trigger_failed', reason: trigger.category },
    sync: sync.ok
      ? { status: 'dispatched' }
      : {
          status: 'dispatch_failed',
          reason: syncReason,
          ...(sync.diagnostics ?? {}),
        },
  })
}
