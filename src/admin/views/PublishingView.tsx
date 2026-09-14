/**
 * Publishing — draft queue → confirmation → publish → honest deployment
 * reporting. This is the redesigned PublishPanel: the exact workflow copy is
 * preserved (pending_sync semantics, sync-failure recovery text), plus:
 *   - poll deploy-state while pending_sync so the panel follows the sync →
 *     queued transition without a manual refresh
 *   - draft queue with per-kind breakdown
 *   - recorded deploy history note from KV (deploy-state endpoint)
 */

import { useEffect, useMemo, useState } from 'react'
import { useAdminData, useContentCounts } from '../AdminDataProvider'
import { discardDraft, type ContentListItem } from '../contentApi'
import { publishAll, type PublishResult } from '../publishApi'
import { AdminModal } from '../ui/primitives'
import { AdminCard, CardHeader, SectionTitle, StatusDot, AdminNotice, AdminEmpty, SkeletonRows, relativeTime, absoluteTime, toast } from '../ui/primitives'
import { StateBadge } from '../Field'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { RocketIcon } from '../ui/icons'
import { DeployStatusLine } from './OverviewView'

export function PublishingView() {
  const data = useAdminData()
  const counts = useContentCounts()
  const [confirming, setConfirming] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<PublishResult | null>(null)
  const [discardTarget, setDiscardTarget] = useState<ContentListItem | null>(null)
  const [discarding, setDiscarding] = useState(false)
  const [discardError, setDiscardError] = useState('')

  const draftQueue = useMemo(
    () =>
      (data.items ?? []).filter(
        (i) => i.hasDraft || i.state === 'draft'
      ),
    [data.items]
  )

  // While a sync/build is in flight, poll deploy-state every 20s so the
  // status line transitions without a manual refresh. Stops when idle.
  const inFlight = data.deploy?.status === 'pending_sync' || data.deploy?.status === 'queued'
  useEffect(() => {
    if (!inFlight) return
    const timer = setInterval(() => void data.refreshDeploy(), 20_000)
    return () => clearInterval(timer)
  }, [inFlight, data])

  const doPublish = async () => {
    setPublishing(true)
    setResult(null)
    const publishResult = await publishAll()
    setPublishing(false)
    setConfirming(false)
    setResult(publishResult)
    void data.refreshDeploy()
    void data.refreshContent()
    const total =
      (publishResult.published?.projects ?? 0) +
      (publishResult.published?.profileSections ?? 0) +
      (publishResult.published?.links ?? 0)
    if (publishResult.ok && total > 0) {
      toast('success', `Published ${total} change${total === 1 ? '' : 's'} to D1 — build chain started.`)
    } else if (!publishResult.ok) {
      toast('error', publishResult.error ?? 'Publish failed.')
    }
  }

  const publishedCounts = result?.published
  const publishedTotal = publishedCounts
    ? publishedCounts.projects + publishedCounts.profileSections + publishedCounts.links
    : 0

  const doDiscard = async (item: ContentListItem) => {
    setDiscarding(true)
    setDiscardError('')
    try {
      await discardDraft(item.kind, item.key)
      toast('success', `Discarded unpublished changes to ${item.key} — live content untouched.`)
      setDiscardTarget(null)
      await data.refreshContent()
      await data.refreshActivity()
    } catch (e) {
      setDiscardError((e as Error).message ?? 'Discarding failed.')
    } finally {
      setDiscarding(false)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-frost">Publishing</h1>
        <p className="mt-1 max-w-2xl text-sm text-mist">
          Publishing promotes every validated draft to the content database, then the snapshot-sync workflow
          mirrors it to the repository and queues the site build. The site updates after that build — never
          instantly.
        </p>
      </header>

      {/* Deploy status */}
      <AdminCard>
        <CardHeader title="Deployment status" />
        <div className="px-4 py-3.5">
          <DeployStatusLine status={data.deploy?.status ?? null} requestedAt={data.deploy?.requestedAt ?? null} lastError={data.deploy?.lastError} />
        </div>
      </AdminCard>

      {/* Publish workflow */}
      <AdminCard>
        <CardHeader title="Publish workflow" />
        <div className="space-y-3 px-4 py-3.5">
          {counts.edited > 0 && !confirming && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-frost">
                  {counts.edited} unpublished change{counts.edited === 1 ? '' : 's'} ready.
                </p>
                <p className="text-xs text-mist">{draftQueue.length} record{draftQueue.length === 1 ? '' : 's'} will be promoted after validation.</p>
              </div>
              <Button size="sm" onClick={() => setConfirming(true)}>
                <RocketIcon className="h-3.5 w-3.5" /> Publish changes
              </Button>
            </div>
          )}

          {confirming && (
            <div className="space-y-3">
              <AdminNotice kind="warning" title={`Publish ${counts.edited} change${counts.edited === 1 ? '' : 's'}?`}>
                Publishing updates the website after the next Cloudflare Pages build (usually 1–3 minutes).
                Publishing does not take effect instantly. Validation runs first — one invalid draft aborts
                the whole publish (nothing is partially promoted).
              </AdminNotice>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={() => void doPublish()} disabled={publishing}>
                  {publishing ? <Spinner className="h-4 w-4" /> : 'Confirm publish'}
                </Button>
              </div>
            </div>
          )}

          {counts.edited === 0 && !result && (
            <div className="flex items-center gap-3">
              <StatusDot tone="ok" />
              <p className="text-sm text-mist">No unpublished changes — the live site is current.</p>
            </div>
          )}

          {result && !result.ok && <AdminNotice kind="error">{result.error ?? 'Publish failed.'}</AdminNotice>}

          {result?.ok && (
            <AdminNotice kind="success">
              {publishedTotal === 0 ? (
                'Nothing to publish — content already up to date.'
              ) : result.deployment?.status === 'pending_sync' && result.sync?.status === 'dispatched' ? (
                <>
                  Published successfully ({summary(publishedCounts)}). Repository snapshot sync dispatched — the
                  GitHub workflow mirrors the content and then queues the Cloudflare deployment. The public site
                  updates after that build completes (usually 2–4 minutes).
                </>
              ) : (
                <>
                  Published to D1 ({summary(publishedCounts)}), but the snapshot-sync dispatch failed
                  ({result.sync?.reason ?? 'unknown reason'}). The public site has not changed — re-run the
                  "CMS snapshot sync" workflow from the GitHub Actions tab to retry.
                </>
              )}
            </AdminNotice>
          )}

          {data.deploy?.status === 'sync_dispatch_failed' && data.deploy?.lastError !== 'not_configured' && !result && (
            <AdminNotice kind="error">
              Last publish reached D1 but its snapshot-sync dispatch failed ({data.deploy.lastError}).
              The public site has not changed — re-run the "CMS snapshot sync" workflow from the GitHub
              Actions tab to retry.
            </AdminNotice>
          )}
          {data.deploy?.status === 'sync_dispatch_failed' && data.deploy?.lastError === 'not_configured' && !result && (
            <AdminNotice kind="info">
              Last publish stayed local-only: no repository sync token is configured in this environment
              (expected outside production — dispatch runs automatically where the token exists). The public
              site updates via the normal GitHub workflow, not from here.
            </AdminNotice>
          )}
          {data.deploy?.status === 'trigger_failed' && !result && (
            <AdminNotice kind="error">
              Last deployment trigger failed ({data.deploy.lastError}). Content published to D1 is not live
              until a build runs — use Publish to retry.
            </AdminNotice>
          )}
          {data.deploy?.status === 'pending_sync' && !result && (
            <p className="text-xs text-mist/70">
              Last publish: snapshot sync dispatched at {absoluteTime(data.deploy.requestedAt)}. The GitHub
              workflow mirrors the content and queues the Cloudflare deployment — check the Actions tab and
              the Cloudflare Pages dashboard for progress.
            </p>
          )}
          {data.deploy?.status === 'queued' && !result && (
            <p className="text-xs text-mist/70">
              Last publish: deployment queued at {absoluteTime(data.deploy.requestedAt)}. Check the
              Cloudflare Pages dashboard for build results.
            </p>
          )}
        </div>
      </AdminCard>

      {/* Draft queue */}
      <section>
        <SectionTitle>Draft queue</SectionTitle>
        {data.items === null ? (
          <SkeletonRows rows={4} className="mt-2" />
        ) : draftQueue.length === 0 ? (
          <div className="mt-2">
            <AdminEmpty
              title="All content is published"
              description="Edits made in the content editors will queue here until you publish them."
              icon={<RocketIcon className="h-8 w-8" />}
            />
          </div>
        ) : (
          <AdminCard className="mt-2 p-0">
            <ul className="divide-y divide-edge">
              {draftQueue.map((item) => (
                <li key={`${item.kind}:${item.key}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <StateBadge state={item.state} hasDraft={item.hasDraft} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-frost">{item.key}</p>
                    <p className="font-mono text-[10px] text-mist/70">
                      {item.kind} · {relativeTime(item.hasDraft ? item.draftUpdatedAt ?? item.updatedAt : item.updatedAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDiscardTarget(item)}
                  >
                    Discard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      window.location.hash =
                        item.kind === 'project' ? `#/projects/${encodeURIComponent(item.key)}` : item.kind === 'link' ? `#/links/${encodeURIComponent(item.key)}` : `#/profile/${encodeURIComponent(item.key)}`
                    }}
                  >
                    Open
                  </Button>
                </li>
              ))}
            </ul>
          </AdminCard>
        )}
      </section>

      {discardError && <AdminNotice kind="error">{discardError}</AdminNotice>}

      <AdminModal
        open={discardTarget !== null}
        onClose={() => (discarding ? undefined : setDiscardTarget(null))}
        title="Discard unpublished changes"
      >
        <p className="text-sm leading-relaxed text-mist">
          Discard all unpublished changes to{' '}
          <span className="font-mono text-frost">{discardTarget?.key}</span>? The record returns to its last
          published state. Live content is untouched — this cannot delete or archive anything.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDiscardTarget(null)} disabled={discarding}>
            Keep changes
          </Button>
          <Button
            size="sm"
            className="border border-danger/50 bg-danger/10 text-danger hover:bg-danger/20"
            variant="outline"
            onClick={() => discardTarget && void doDiscard(discardTarget)}
            disabled={discarding}
          >
            {discarding ? <Spinner className="h-4 w-4" /> : 'Discard changes'}
          </Button>
        </div>
      </AdminModal>

      <AdminNotice kind="info">
        Publishing never claims the site is updated — a queued build is only queued. The CMS-side states are
        the only fully reliable ones; Cloudflare build results live in the Pages dashboard.
      </AdminNotice>
    </div>
  )
}

function summary(counts?: PublishResult['published']): string {
  if (!counts) return 'no changes'
  const parts: string[] = []
  if (counts.projects) parts.push(`${counts.projects} project${counts.projects === 1 ? '' : 's'}`)
  if (counts.profileSections) parts.push(`${counts.profileSections} profile section${counts.profileSections === 1 ? '' : 's'}`)
  if (counts.links) parts.push(`${counts.links} link${counts.links === 1 ? '' : 's'}`)
  return parts.join(', ') || 'no changes'
}
