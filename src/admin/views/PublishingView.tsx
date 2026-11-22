/**
 * Publishing — selective draft queue → confirmation → atomic publish → deterministic pipeline.
 *
 * Implements:
 *   - Selective item selection with checkboxes, select-all, deselect-all, and change-type filters
 *   - Atomic promotion of selected records only (unselected drafts remain untouched in D1)
 *   - Real-time visual progress stepper tracking the 5 deployment pipeline stages
 *   - GitHub sync retry without re-promoting D1 records
 *   - Honest deployment reporting with commit SHA, operation ID, and workflow link
 */

import { useEffect, useMemo, useState } from 'react'
import { useAdminData } from '../AdminDataProvider'
import { discardDraft, type ContentListItem, type ContentKind } from '../contentApi'
import {
  publishSelected,
  retrySnapshotSync,
  type PublishResult,
  type PublishSelectedTarget,
} from '../publishApi'
import {
  AdminCard,
  CardHeader,
  SectionTitle,
  StatusDot,
  AdminNotice,
  AdminEmpty,
  SkeletonRows,
  relativeTime,
  toast,
  AdminModal,
} from '../ui/primitives'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { RocketIcon, CheckIcon, UndoIcon } from '../ui/icons'
import { ExternalLinkIcon } from '@/components/ui/icons'
import { DeployStatusLine } from './OverviewView'
import { cn } from '@/lib/cn'

const KIND_LABELS: Record<ContentKind, string> = {
  project: 'Project',
  'profile-section': 'Profile Section',
  link: 'Link',
}

const SECTION_DISPLAY_NAMES: Record<string, string> = {
  hero: 'Hero Section',
  about: 'About Me',
  focus: 'Areas of Focus',
  education: 'Education',
  skills: 'Skills & Proficiencies',
  technologies: 'Technologies & Tools',
  certificates: 'Certificates & Credentials',
  experience: 'Work Experience',
}

export function PublishingView() {
  const data = useAdminData()
  const [unselectedKeys, setUnselectedKeys] = useState<Set<string>>(() => new Set())
  const [kindFilter, setKindFilter] = useState<'all' | ContentKind>('all')
  const [confirming, setConfirming] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [retryingSync, setRetryingSync] = useState(false)
  const [result, setResult] = useState<PublishResult | null>(null)
  const [discardTarget, setDiscardTarget] = useState<ContentListItem | null>(null)
  const [discarding, setDiscarding] = useState(false)
  const [discardError, setDiscardError] = useState('')

  const draftQueue = useMemo(
    () => (data.items ?? []).filter((i) => i.hasDraft || i.state === 'draft'),
    [data.items]
  )

  // Filtered items based on kind tab
  const filteredQueue = useMemo(() => {
    if (kindFilter === 'all') return draftQueue
    return draftQueue.filter((i) => i.kind === kindFilter)
  }, [draftQueue, kindFilter])

  // Selected targets ready for publishing (all items not in unselectedKeys)
  const selectedTargets = useMemo<PublishSelectedTarget[]>(() => {
    return draftQueue
      .filter((i) => !unselectedKeys.has(`${i.kind}:${i.key}`))
      .map((i) => ({ kind: i.kind, key: i.key }))
  }, [draftQueue, unselectedKeys])

  // Poll deploy state every 6 seconds when in-flight
  const inFlight =
    data.deploy?.status === 'pending_sync' ||
    data.deploy?.status === 'github_syncing' ||
    data.deploy?.status === 'snapshot_generating' ||
    data.deploy?.status === 'queued'

  useEffect(() => {
    if (!inFlight) return
    const timer = setInterval(() => void data.refreshDeploy(), 6_000)
    return () => clearInterval(timer)
  }, [inFlight, data])

  const toggleSelect = (id: string) => {
    setUnselectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setUnselectedKeys(new Set())
  }

  const deselectAll = () => {
    setUnselectedKeys(new Set(draftQueue.map((i) => `${i.kind}:${i.key}`)))
  }

  const selectNewOnly = () => {
    setUnselectedKeys(new Set(draftQueue.filter((i) => i.state !== 'draft').map((i) => `${i.kind}:${i.key}`)))
  }

  const selectUpdatedOnly = () => {
    setUnselectedKeys(new Set(draftQueue.filter((i) => !i.hasDraft).map((i) => `${i.kind}:${i.key}`)))
  }

  const doPublish = async () => {
    if (selectedTargets.length === 0) return
    setPublishing(true)
    setResult(null)
    const publishResult = await publishSelected(selectedTargets)
    setPublishing(false)
    setConfirming(false)
    setResult(publishResult)

    await Promise.all([data.refreshDeploy(), data.refreshContent(), data.refreshActivity()])

    const total =
      (publishResult.published?.projects ?? 0) +
      (publishResult.published?.profileSections ?? 0) +
      (publishResult.published?.links ?? 0)

    if (publishResult.ok && total > 0) {
      toast('success', `Published ${total} selected change${total === 1 ? '' : 's'} — build pipeline dispatched.`)
      setUnselectedKeys(new Set())
    } else if (!publishResult.ok) {
      toast('error', publishResult.error ?? 'Publish failed.')
    }
  }

  const doRetrySync = async () => {
    setRetryingSync(true)
    try {
      const retryResult = await retrySnapshotSync()
      if (retryResult.ok) {
        toast('success', 'Repository snapshot sync re-dispatched to GitHub Actions.')
        await data.refreshDeploy()
      } else {
        toast('error', retryResult.error ?? 'Retry sync failed.')
      }
    } catch (e) {
      toast('error', (e as Error).message ?? 'Retry request failed.')
    } finally {
      setRetryingSync(false)
    }
  }

  const doDiscard = async (item: ContentListItem) => {
    setDiscarding(true)
    setDiscardError('')
    try {
      await discardDraft(item.kind, item.key)
      toast('success', `Discarded unpublished changes to ${item.key} — live content untouched.`)
      setUnselectedKeys((prev) => {
        const next = new Set(prev)
        next.delete(`${item.kind}:${item.key}`)
        return next
      })
      setDiscardTarget(null)
      await Promise.all([data.refreshContent(), data.refreshActivity()])
    } catch (e) {
      setDiscardError((e as Error).message ?? 'Discarding failed.')
    } finally {
      setDiscarding(false)
    }
  }

  const newDraftCount = draftQueue.filter((i) => i.state === 'draft').length
  const updatedDraftCount = draftQueue.filter((i) => i.hasDraft).length
  const selectedCount = selectedTargets.length

  const currentDeploy = data.deploy

  // Stage calculation for visual progress tracker (1: D1, 2: Snapshot, 3: Sync, 4: Pages Build, 5: Live)
  const activeStep = useMemo(() => {
    if (!currentDeploy || !currentDeploy.status || currentDeploy.status === 'idle') return 0
    if (currentDeploy.status === 'database_published') return 1
    if (currentDeploy.status === 'snapshot_generating') return 2
    if (currentDeploy.status === 'pending_sync' || currentDeploy.status === 'github_syncing') return 3
    if (currentDeploy.status === 'queued' || currentDeploy.status === 'deployment_queued') return 4
    if (currentDeploy.status === 'deployed') return 5
    if (currentDeploy.status === 'failed' || currentDeploy.status === 'sync_dispatch_failed') return 3
    return 0
  }, [currentDeploy])

  return (
    <div className="space-y-6">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-frost">Selective Publishing</h1>
        <p className="mt-1 max-w-2xl text-sm text-mist">
          Choose exactly which pending content changes to publish. Selected records promote atomically to the
          database, then GitHub Actions mirrors the snapshot and triggers the Cloudflare Pages deployment.
        </p>
      </header>

      {/* Deployment status & pipeline tracker */}
      <AdminCard>
        <CardHeader
          title="Deployment status"
          action={
            (currentDeploy?.status === 'failed' ||
              currentDeploy?.status === 'sync_dispatch_failed' ||
              currentDeploy?.lastError) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void doRetrySync()}
                disabled={retryingSync}
                className="gap-1.5 border-accent/40 text-accent hover:bg-accent/10"
              >
                {retryingSync ? <Spinner className="h-3 w-3" /> : <UndoIcon className="h-3 w-3" />}
                Retry Snapshot Sync
              </Button>
            )
          }
        />
        <div className="space-y-4 px-4 py-3.5">
          <DeployStatusLine
            status={currentDeploy?.status ?? null}
            requestedAt={currentDeploy?.requestedAt ?? null}
            lastError={currentDeploy?.lastError}
          />

          {/* 5-step visual pipeline stepper */}
          {activeStep > 0 && (
            <div className="mt-3 rounded-xl border border-edge/60 bg-abyss/60 p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-mist">
                <span className="font-mono text-[11px] text-accent">
                  Operation: {currentDeploy?.operationId ?? 'CMS Sync'}
                </span>
                {currentDeploy?.workflowRunUrl && (
                  <a
                    href={currentDeploy.workflowRunUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent hover:underline"
                  >
                    View GitHub Run <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                )}
                {currentDeploy?.commitSha && (
                  <span className="font-mono text-[10px] text-mist/80">
                    Commit: {currentDeploy.commitSha.slice(0, 7)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { step: 1, label: '1. Database', desc: 'Promoted to D1' },
                  { step: 2, label: '2. Snapshot', desc: 'Canonical Export' },
                  { step: 3, label: '3. GitHub Sync', desc: 'Repository Mirror' },
                  { step: 4, label: '4. Pages Build', desc: 'Cloudflare Queued' },
                  { step: 5, label: '5. Live Site', desc: 'Production Live' },
                ].map((s) => {
                  const isDone = activeStep > s.step || (activeStep === 5 && s.step === 5)
                  const isCurrent = activeStep === s.step && activeStep < 5
                  const isFailed =
                    (currentDeploy?.status === 'failed' || currentDeploy?.status === 'sync_dispatch_failed') &&
                    s.step === 3

                  return (
                    <div
                      key={s.step}
                      className={cn(
                        'flex flex-col rounded-lg border p-2.5 transition-all',
                        isFailed
                          ? 'border-danger/40 bg-danger/10 text-danger'
                          : isDone
                            ? 'border-accent/40 bg-accent/5 text-frost'
                            : isCurrent
                              ? 'border-accent bg-accent/10 text-frost ring-1 ring-accent/30'
                              : 'border-edge/40 bg-panel/30 text-mist/60'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium">{s.label}</span>
                        {isFailed ? (
                          <span className="text-danger">✗</span>
                        ) : isDone ? (
                          <CheckIcon className="h-3.5 w-3.5 text-accent" />
                        ) : isCurrent ? (
                          <Spinner className="h-3 w-3 text-accent" />
                        ) : (
                          <span className="text-[10px] text-mist/40">•</span>
                        )}
                      </div>
                      <span className="mt-1 text-[10px] text-mist">{s.desc}</span>
                    </div>
                  )
                })}
              </div>

              {currentDeploy?.stepMessage && (
                <p className="mt-3 text-xs text-frost/90">{currentDeploy.stepMessage}</p>
              )}
            </div>
          )}
        </div>
      </AdminCard>

      {/* Main Publishing Workflow */}
      <AdminCard>
        <CardHeader
          title="Publish Selected Changes"
          action={
            draftQueue.length > 0 && (
              <Button
                size="sm"
                onClick={() => setConfirming(true)}
                disabled={selectedCount === 0 || publishing || inFlight}
                className="gap-1.5"
              >
                <RocketIcon className="h-3.5 w-3.5" />
                Publish Selected ({selectedCount})
              </Button>
            )
          }
        />

        <div className="space-y-4 px-4 py-3.5">
          {result && !result.ok && <AdminNotice kind="error">{result.error ?? 'Publish failed.'}</AdminNotice>}

          {result?.ok && (
            <AdminNotice kind="success">
              Published {summary(result.published)} to the database. Repository snapshot sync has been dispatched.
              The live website updates automatically after the build completes.
            </AdminNotice>
          )}

          {draftQueue.length === 0 ? (
            <div className="flex items-center gap-3 py-2">
              <StatusDot tone="ok" />
              <p className="text-sm text-mist">No unpublished changes — the database and live site are current.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Controls bar: Select All / Deselect All / Type Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge/60 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="rounded-md border border-edge bg-panel px-2.5 py-1 text-xs text-frost hover:border-accent/40"
                  >
                    Select All ({draftQueue.length})
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="rounded-md border border-edge bg-panel px-2.5 py-1 text-xs text-mist hover:text-frost"
                  >
                    Deselect All
                  </button>
                  {newDraftCount > 0 && (
                    <button
                      type="button"
                      onClick={selectNewOnly}
                      className="rounded-md border border-edge bg-panel px-2.5 py-1 text-xs text-amber hover:border-amber/40"
                    >
                      New Only ({newDraftCount})
                    </button>
                  )}
                  {updatedDraftCount > 0 && (
                    <button
                      type="button"
                      onClick={selectUpdatedOnly}
                      className="rounded-md border border-edge bg-panel px-2.5 py-1 text-xs text-frost hover:border-accent/40"
                    >
                      Updated Only ({updatedDraftCount})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-mist">
                    Selected: <strong className="text-accent">{selectedCount}</strong> / {draftQueue.length}
                  </span>
                </div>
              </div>

              {/* Kind Tabs */}
              <div className="flex gap-2">
                {(['all', 'project', 'profile-section', 'link'] as const).map((kind) => {
                  const count = kind === 'all' ? draftQueue.length : draftQueue.filter((i) => i.kind === kind).length
                  if (count === 0 && kind !== 'all') return null
                  const active = kindFilter === kind
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setKindFilter(kind)}
                      className={cn(
                        'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'bg-accent/15 text-accent border border-accent/40'
                          : 'bg-panel text-mist hover:text-frost border border-transparent'
                      )}
                    >
                      {kind === 'all' ? 'All Types' : KIND_LABELS[kind]} ({count})
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </AdminCard>

      {/* Itemized Queue Table */}
      <section>
        <SectionTitle>Pending Content Changes ({filteredQueue.length})</SectionTitle>
        {data.items === null ? (
          <SkeletonRows rows={4} className="mt-2" />
        ) : filteredQueue.length === 0 ? (
          <div className="mt-2">
            <AdminEmpty
              title="No pending changes in this filter"
              description="Any edits or new drafts will queue here for selective publishing."
              icon={<RocketIcon className="h-8 w-8" />}
            />
          </div>
        ) : (
          <AdminCard className="mt-2 p-0 overflow-hidden">
            <ul className="divide-y divide-edge">
              {filteredQueue.map((item) => {
                const id = `${item.kind}:${item.key}`
                const isSelected = !unselectedKeys.has(id)
                const isNew = item.state === 'draft'
                const displayName =
                  item.kind === 'profile-section'
                    ? SECTION_DISPLAY_NAMES[item.key] ?? item.key
                    : item.key

                return (
                  <li
                    key={id}
                    onClick={() => toggleSelect(id)}
                    className={cn(
                      'flex cursor-pointer flex-wrap items-center gap-3.5 px-4 py-3 transition-colors select-none',
                      isSelected ? 'bg-accent/[0.04] hover:bg-accent/[0.07]' : 'hover:bg-panel/40'
                    )}
                  >
                    {/* Custom Checkbox */}
                    <div
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        isSelected
                          ? 'border-accent bg-accent text-abyss'
                          : 'border-edge bg-abyss hover:border-mist/60'
                      )}
                    >
                      {isSelected && <CheckIcon className="h-3 w-3 stroke-[3]" />}
                    </div>

                    {/* Kind Badge */}
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border',
                        item.kind === 'project'
                          ? 'border-sky-500/30 bg-sky-500/10 text-sky-400'
                          : item.kind === 'profile-section'
                            ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      )}
                    >
                      {item.kind === 'profile-section' ? 'Profile' : item.kind}
                    </span>

                    {/* Change Type Badge */}
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border',
                        isNew
                          ? 'border-amber/40 bg-amber/10 text-amber'
                          : 'border-accent/40 bg-accent/10 text-accent'
                      )}
                    >
                      {isNew ? 'New Draft' : 'Updated Overlay'}
                    </span>

                    {/* Title / Key & Timestamp */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-frost">{displayName}</p>
                      <p className="font-mono text-[10px] text-mist/70">
                        key: {item.key} · modified {relativeTime(item.hasDraft ? item.draftUpdatedAt ?? item.updatedAt : item.updatedAt)}
                      </p>
                    </div>

                    {/* Actions: Stop propagation so clicking buttons doesn't toggle checkbox */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDiscardTarget(item)}
                        className="text-mist hover:text-danger"
                      >
                        Discard
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.location.hash =
                            item.kind === 'project'
                              ? `#/projects/${encodeURIComponent(item.key)}`
                              : item.kind === 'link'
                                ? `#/links/${encodeURIComponent(item.key)}`
                                : `#/profile/${encodeURIComponent(item.key)}`
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </AdminCard>
        )}
      </section>

      {/* Confirmation Modal */}
      <AdminModal
        open={confirming}
        onClose={() => (publishing ? undefined : setConfirming(false))}
        title={`Publish ${selectedCount} selected change${selectedCount === 1 ? '' : 's'}?`}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-mist">
            The selected items will be validated against schemas and media assets, then promoted to the live
            database atomically.
          </p>

          <div className="rounded-lg border border-edge bg-abyss p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-frost">
              Selected for publication ({selectedCount}):
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {selectedTargets.map((t) => (
                <span
                  key={`${t.kind}:${t.key}`}
                  className="rounded border border-edge bg-panel px-2 py-0.5 font-mono text-[11px] text-frost"
                >
                  {t.kind === 'profile-section' ? (SECTION_DISPLAY_NAMES[t.key] ?? t.key) : t.key}
                </span>
              ))}
            </div>
          </div>

          <AdminNotice kind="info">
            Unselected drafts ({draftQueue.length - selectedCount}) will remain completely untouched in the
            database as drafts. The live site will update after the Cloudflare Pages build completes.
          </AdminNotice>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={publishing}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void doPublish()} disabled={publishing || selectedCount === 0}>
              {publishing ? (
                <>
                  <Spinner className="h-4 w-4" /> Promoting...
                </>
              ) : (
                `Confirm & Publish (${selectedCount})`
              )}
            </Button>
          </div>
        </div>
      </AdminModal>

      {/* Discard Modal */}
      <AdminModal
        open={discardTarget !== null}
        onClose={() => (discarding ? undefined : setDiscardTarget(null))}
        title="Discard unpublished changes"
      >
        <p className="text-sm leading-relaxed text-mist">
          Discard unpublished draft changes to{' '}
          <span className="font-mono text-frost">{discardTarget?.key}</span>? The record returns to its last
          published state. Live published content is untouched.
        </p>
        {discardError && (
          <div className="mt-3">
            <AdminNotice kind="error">{discardError}</AdminNotice>
          </div>
        )}
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
    </div>
  )
}

function summary(counts?: PublishResult['published']): string {
  if (!counts) return 'no changes'
  const parts: string[] = []
  if (counts.projects) parts.push(`${counts.projects} project${counts.projects === 1 ? '' : 's'}`)
  if (counts.profileSections)
    parts.push(`${counts.profileSections} profile section${counts.profileSections === 1 ? '' : 's'}`)
  if (counts.links) parts.push(`${counts.links} link${counts.links === 1 ? '' : 's'}`)
  return parts.join(', ') || 'no changes'
}
