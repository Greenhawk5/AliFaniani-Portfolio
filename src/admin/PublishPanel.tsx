/**
 * Publish panel (Phase 5): draft-change summary → confirmation → publish →
 * honest deployment reporting. Never claims the site is updated — a queued
 * build is only queued.
 */

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { publishAll, fetchDeployState, type PublishResult, type PublishCounts, type DeployStateInfo } from './publishApi'
import { Notice } from './Field'

interface Props {
  draftCount: number
  onPublished: () => void
}

export function PublishPanel({ draftCount, onPublished }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [result, setResult] = useState<PublishResult | null>(null)
  const [deployState, setDeployState] = useState<DeployStateInfo | null>(null)

  const refreshDeployState = useCallback(() => {
    void fetchDeployState().then(setDeployState)
  }, [])

  useEffect(() => {
    refreshDeployState()
  }, [refreshDeployState])

  const doPublish = async () => {
    setPublishing(true)
    setResult(null)
    const publishResult = await publishAll()
    setPublishing(false)
    setConfirming(false)
    setResult(publishResult)
    refreshDeployState()
    if (publishResult.ok && (publishResult.published?.projects ?? 0) + (publishResult.published?.profileSections ?? 0) + (publishResult.published?.links ?? 0) > 0) {
      onPublished()
    }
  }

  const counts = result?.published
  const total = counts ? counts.projects + counts.profileSections + counts.links : 0

  return (
    <section className="space-y-3 rounded-2xl border border-edge bg-panel/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-frost">Publish</h2>
          <p className="mt-1 text-xs text-mist">
            {draftCount > 0
              ? `${draftCount} unpublished change${draftCount === 1 ? '' : 's'} in D1.`
              : 'No unpublished changes.'}
          </p>
        </div>
        {draftCount > 0 && !confirming && (
          <Button size="sm" onClick={() => setConfirming(true)}>
            Publish changes
          </Button>
        )}
        {confirming && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-mist">Publish all drafts?</span>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void doPublish()} disabled={publishing}>
              {publishing ? <Spinner className="h-4 w-4" /> : 'Confirm publish'}
            </Button>
          </div>
        )}
      </div>

      {confirming && draftCount > 0 && (
        <p className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-xs leading-relaxed text-cyan-200/90">
          You have {draftCount} unpublished change{draftCount === 1 ? '' : 's'}. Publishing updates the
          website after the next Cloudflare Pages build (usually 1–3 minutes). Publishing does not take
          effect instantly.
        </p>
      )}

      {result && !result.ok && <Notice kind="error">{result.error ?? 'Publish failed.'}</Notice>}

      {result?.ok && (
        <Notice kind="success">
          {total === 0 ? (
            'Nothing to publish — content already up to date.'
          ) : result.deployment?.status === 'pending_sync' && result.sync?.status === 'dispatched' ? (
            <>Published successfully ({summary(counts)}). Repository snapshot sync dispatched — the GitHub workflow mirrors the content and then queues the Cloudflare deployment. The public site updates after that build completes (usually 2–4 minutes).</>
          ) : (
            <>Published to D1 ({summary(counts)}), but the snapshot-sync dispatch failed ({result.sync?.reason ?? 'unknown reason'}). The public site has not changed — re-run the "CMS snapshot sync" workflow from the GitHub Actions tab to retry.</>
          )}
        </Notice>
      )}

      {deployState?.status === 'sync_dispatch_failed' && !result && (
        <Notice kind="error">
          Last publish reached D1 but its snapshot-sync dispatch failed ({deployState.lastError}).
          The public site has not changed — re-run the "CMS snapshot sync" workflow from the GitHub
          Actions tab to retry.
        </Notice>
      )}
      {deployState?.status === 'trigger_failed' && !result && (
        <Notice kind="error">
          Last deployment trigger failed ({deployState.lastError}). Content published to D1 is not live
          until a build runs — use Publish to retry.
        </Notice>
      )}
      {deployState?.status === 'pending_sync' && !result && (
        <p className="text-xs text-mist/70">
          Last publish: snapshot sync dispatched at {deployState.requestedAt ?? 'unknown time'}.
          The GitHub workflow mirrors the content and queues the Cloudflare deployment — check the
          Actions tab and the Cloudflare Pages dashboard for progress.
        </p>
      )}
      {deployState?.status === 'queued' && !result && (
        <p className="text-xs text-mist/70">
          Last publish: deployment queued at {deployState.requestedAt ?? 'unknown time'}. Check the
          Cloudflare Pages dashboard for build results.
        </p>
      )}
    </section>
  )
}

function summary(counts?: PublishCounts): string {
  if (!counts) return 'no changes'
  const parts: string[] = []
  if (counts.projects) parts.push(`${counts.projects} project${counts.projects === 1 ? '' : 's'}`)
  if (counts.profileSections) parts.push(`${counts.profileSections} profile section${counts.profileSections === 1 ? '' : 's'}`)
  if (counts.links) parts.push(`${counts.links} link${counts.links === 1 ? '' : 's'}`)
  return parts.join(', ') || 'no changes'
}
