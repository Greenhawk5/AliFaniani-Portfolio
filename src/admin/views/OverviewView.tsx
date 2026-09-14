/**
 * Overview — the Control Center dashboard. Everything shown is derived from
 * real sources: D1 content records (counts, drafts, freshness), the deploy
 * state KV, and the auth_log audit trail. No analytics exist in this
 * codebase, so there are no traffic widgets — the visitor story is honestly
 * delegated to Cloudflare Web Analytics (see Integrations).
 */

import { useMemo } from 'react'
import { useAdminData, useContentCounts } from '../AdminDataProvider'
import type { AdminView } from '../routes'
import {
  AdminCard,
  CardHeader,
  StatTile,
  StatusDot,
  Skeleton,
  SkeletonRows,
  AdminEmpty,
  relativeTime,
  absoluteTime,
} from '../ui/primitives'
import { MiniBars } from '../ui/MiniBars'
import { FolderIcon, UserIcon, LinkIcon, RocketIcon, SearchIcon } from '../ui/icons'
import { CheckIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface Attention {
  id: string
  tone: 'danger' | 'warning' | 'info'
  title: string
  description: string
  action?: { label: string; view: AdminView }
}

export function OverviewView({ onNavigate: navigate }: { onNavigate: (view: AdminView, param?: string) => void }) {
  const data = useAdminData()
  const counts = useContentCounts()

  const attention = useMemo<Attention[]>(() => {
    const issues: Attention[] = []
    if (counts.edited > 0) {
      issues.push({
        id: 'unpublished',
        tone: 'warning',
        title: `${counts.edited} unpublished change${counts.edited === 1 ? '' : 's'}`,
        description: 'Edits exist in D1 that the live website does not show yet.',
        action: { label: 'Review publishing', view: 'publishing' },
      })
    }
    if (data.deploy?.status === 'sync_dispatch_failed' && data.deploy?.lastError !== 'not_configured') {
      issues.push({
        id: 'sync',
        tone: 'danger',
        title: 'Snapshot sync dispatch failed',
        description: 'Published content has not reached the website — the sync workflow must be retried.',
        action: { label: 'Open publishing', view: 'publishing' },
      })
    }
    if (data.deploy?.status === 'queued' || data.deploy?.status === 'pending_sync') {
      issues.push({
        id: 'building',
        tone: 'info',
        title: 'Deployment in progress',
        description: 'A build is queued or syncing — the site updates when it completes.',
        action: { label: 'Check publishing', view: 'publishing' },
      })
    }
    if ((data.activity?.summary.failedAccess ?? 0) > 0) {
      const n = data.activity!.summary.failedAccess
      issues.push({
        id: 'access',
        tone: 'warning',
        title: `${n} failed sign-in attempt${n === 1 ? '' : 's'} recently`,
        description: 'Review the audit trail to confirm these are your own mistakes.',
        action: { label: 'Open activity', view: 'activity' },
      })
    }
    if (data.itemsError) {
      issues.push({
        id: 'content-error',
        tone: 'danger',
        title: 'Content list unavailable',
        description: data.itemsError,
      })
    }
    return issues
  }, [counts.edited, data.deploy, data.activity, data.itemsError])

  return (
    <div className="space-y-5">
      {/* Greeting / status line */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold text-frost">Portfolio status</h1>
          <p className="mt-1 text-sm text-mist">
            {attention.length === 0
              ? 'Everything looks good — nothing needs your attention.'
              : `${attention.length} item${attention.length === 1 ? '' : 's'} need${attention.length === 1 ? 's' : ''} attention.`}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void data.refreshAll()}>
          Refresh
        </Button>
      </header>

      {/* Needs attention */}
      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="mb-2.5 text-sm font-semibold text-frost">
          Needs attention
        </h2>
        {attention.length === 0 ? (
          <AdminCard className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <CheckIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-frost">All clear</p>
              <p className="text-xs text-mist">No unpublished changes, failed syncs, or recent sign-in failures.</p>
            </div>
          </AdminCard>
        ) : (
          <ul className="space-y-2">
            {attention.map((issue) => (
              <li
                key={issue.id}
                className={cn(
                  'flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3',
                  issue.tone === 'danger' && 'border-danger/30 bg-danger/6',
                  issue.tone === 'warning' && 'border-amber/30 bg-amber/6',
                  issue.tone === 'info' && 'border-cyan/25 bg-cyan/6'
                )}
              >
                <StatusDot tone={issue.tone === 'info' ? 'info' : issue.tone} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-frost">{issue.title}</p>
                  <p className="text-xs text-mist">{issue.description}</p>
                </div>
                {issue.action && (
                  <Button variant="outline" size="sm" onClick={() => navigate(issue.action!.view)}>
                    {issue.action.label}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Content stats */}
      <section aria-labelledby="content-heading">
        <h2 id="content-heading" className="mb-2.5 text-sm font-semibold text-frost">
          Content
        </h2>
        {data.items === null && !data.itemsError ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[92px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="Projects"
              value={counts.projects.filter((p) => p.state !== 'archived').length}
              hint={`${counts.projects.filter((p) => p.state === 'draft').length} draft · ${counts.projects.filter((p) => p.state === 'archived').length} archived`}
              icon={<FolderIcon className="h-4 w-4" />}
            />
            <StatTile
              label="Profile sections"
              value={counts.profileSections.filter((p) => p.state !== 'archived').length}
              hint="Fixed section set — all published"
              icon={<UserIcon className="h-4 w-4" />}
            />
            <StatTile
              label="Links"
              value={counts.links.filter((p) => p.state !== 'archived').length}
              hint="Social + contact destinations"
              icon={<LinkIcon className="h-4 w-4" />}
            />
            <StatTile
              label="Unpublished changes"
              value={counts.edited}
              hint={counts.edited === 0 ? 'Live site is current' : 'Awaiting publish'}
              tone={counts.edited > 0 ? 'warning' : 'accent'}
              icon={<RocketIcon className="h-4 w-4" />}
            />
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Deploy state */}
        <AdminCard className="xl:col-span-1">
          <CardHeader
            title="Deployment"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('publishing')}>
                Details
              </Button>
            }
          />
          <div className="px-4 py-3.5">
            <DeployStatusLine status={data.deploy?.status ?? null} requestedAt={data.deploy?.requestedAt ?? null} lastError={data.deploy?.lastError} />
          </div>
        </AdminCard>

        {/* Recent activity */}
        <AdminCard className="xl:col-span-2">
          <CardHeader
            title="Recent activity"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('activity')}>
                View all
              </Button>
            }
          />
          <div className="px-4 py-2">
            {data.activity === null && !data.activityError ? (
              <SkeletonRows rows={3} className="py-2" />
            ) : data.activityError ? (
              <AdminEmpty title="Activity unavailable" description={data.activityError} />
            ) : (data.activity?.events.length ?? 0) === 0 ? (
              <AdminEmpty title="No activity yet" description="Administrative events will appear here as they happen." />
            ) : (
              <RecentActivityList
                events={data.activity!.events.slice(0, 5)}
                onNavigate={navigate}
              />
            )}
          </div>
        </AdminCard>
      </div>

      {/* Activity pulse + quick actions */}
      <div className="grid gap-4 xl:grid-cols-3">
        <AdminCard className="xl:col-span-2">
          <CardHeader title="Admin events — last 14 days" />
          <div className="px-4 py-4">
            {data.activity === null && !data.activityError ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <ActivityPulse
                events={data.activity?.events ?? []}
                error={data.activityError}
              />
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <CardHeader title="Quick actions" />
          <div className="grid grid-cols-2 gap-2 p-3">
            <QuickAction icon={<FolderIcon className="h-4.5 w-4.5" />} label="New project" onClick={() => navigate('projects', 'new')} />
            <QuickAction icon={<LinkIcon className="h-4.5 w-4.5" />} label="Add link" onClick={() => navigate('links', 'new')} />
            <QuickAction icon={<UserIcon className="h-4.5 w-4.5" />} label="Edit profile" onClick={() => navigate('profile')} />
            <QuickAction icon={<SearchIcon className="h-4.5 w-4.5" />} label="SEO checks" onClick={() => navigate('seo')} />
          </div>
        </AdminCard>
      </div>
    </div>
  )
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-edge bg-panel-2/50 px-3 py-4 text-center transition-colors hover:border-accent/50 hover:bg-panel-2"
    >
      <span className="text-mist transition-colors group-hover:text-accent">{icon}</span>
      <span className="text-xs font-medium text-frost">{label}</span>
    </button>
  )
}

export function DeployStatusLine({
  status,
  requestedAt,
  lastError,
}: {
  status: string | null
  requestedAt: string | null
  lastError?: string
}) {
  // Note: 'idle' is the KV representation of "nothing pending" — the deploy
  // endpoint returns status:null for it, so it renders as no activity.
  if (!status) {
    return (
      <div className="flex items-start gap-2.5">
        <StatusDot tone="neutral" />
        <div>
          <p className="text-sm text-frost">No deployment in progress</p>
          <p className="text-xs text-mist">Publish to start the sync → build chain.</p>
        </div>
      </div>
    )
  }
  // Local-only configuration gap: no repository sync token exists outside
  // production, so a local publish can never dispatch. This is expected —
  // not a failure — and says exactly how the site still gets updated.
  if (status === 'sync_dispatch_failed' && lastError === 'not_configured') {
    return (
      <div className="flex items-start gap-2.5">
        <StatusDot tone="neutral" />
        <div>
          <p className="text-sm text-frost">Sync dispatch unavailable in this environment</p>
          <p className="text-xs text-mist">
            {relativeTime(requestedAt)} — no repository sync token is configured here, so the publish stayed
            local-only. In production the token is configured and dispatch runs automatically. The site
            updates via the normal GitHub workflow, not from here.
          </p>
        </div>
      </div>
    )
  }
  if (status === 'pending_sync') {
    return (
      <div className="flex items-start gap-2.5">
        <StatusDot tone="info" />
        <div>
          <p className="text-sm text-frost">Snapshot sync dispatched</p>
          <p className="text-xs text-mist">
            {relativeTime(requestedAt)} — the site updates after the GitHub workflow's build completes.
          </p>
        </div>
      </div>
    )
  }
  if (status === 'queued') {
    return (
      <div className="flex items-start gap-2.5">
        <StatusDot tone="info" />
        <div>
          <p className="text-sm text-frost">Deployment queued</p>
          <p className="text-xs text-mist">{relativeTime(requestedAt)} — check the Cloudflare Pages dashboard.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2.5">
      <StatusDot tone="danger" />
      <div>
        <p className="text-sm text-frost">Last publish step failed</p>
        <p className="text-xs text-mist">{relativeTime(requestedAt)} — see Publishing for recovery steps.</p>
      </div>
    </div>
  )
}

const EVENT_LABELS: Record<string, string> = {
  login_success: 'Signed in',
  login_password_failed: 'Failed sign-in attempt',
  login_turnstile_failed: 'Blocked sign-in (bot check)',
  login_rate_limited: 'Sign-in rate limited',
  content_created: 'Created',
  content_updated: 'Updated',
  content_draft_discarded: 'Discarded draft',
  content_archived: 'Archived',
  content_deleted: 'Deleted',
  publish_succeeded: 'Published',
  publish_failed: 'Publish failed',
  sync_dispatched: 'Snapshot sync dispatched',
  sync_dispatch_failed: 'Snapshot sync failed',
  logout: 'Signed out',
}

export function eventLabel(event: string): string {
  return EVENT_LABELS[event] ?? event
}

function RecentActivityList({
  events,
  onNavigate,
}: {
  events: { ts: string; ok: boolean; event: string; detail: string | null }[]
  onNavigate: (view: AdminView, param?: string) => void
}) {
  return (
    <ul className="divide-y divide-edge/60">
      {events.map((event, i) => (
        <li key={`${event.ts}-${i}`} className="flex items-center gap-3 py-2.5">
          <StatusDot tone={event.ok ? (event.event.startsWith('content_') ? 'accent' : 'ok') : 'danger'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-frost">
              {eventLabel(event.event)}
              {event.detail && <span className="text-mist"> — {event.detail}</span>}
            </p>
            <p className="text-xs text-mist/70" title={absoluteTime(event.ts)}>
              {relativeTime(event.ts)}
            </p>
          </div>
          {(event.event.startsWith('content_') ||
            event.event.startsWith('publish') ||
            event.event.startsWith('sync_') ||
            event.event.startsWith('deploy_')) && (
            <Button variant="ghost" size="sm" onClick={() => onNavigate('publishing')}>
              <span className="sr-only">Open publishing</span>
              <span aria-hidden>→</span>
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}

/** 14-day histogram of admin events from the real audit log. Always the
 * same chart (honest at any density: empty days are baseline ticks); the
 * footer names the exact date range so sparse windows read clearly. */
function ActivityPulse({ events, error }: { events: { ts: string }[]; error: string }) {
  const data = useMemo(() => {
    const days: { label: string; fullLabel: string; count: number }[] = []
    const today = new Date()
    for (let i = 13; i >= 0; i--) {
      const day = new Date(today)
      day.setDate(today.getDate() - i)
      const key = day.toISOString().slice(0, 10)
      days.push({
        label: key.slice(5),
        fullLabel: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        count: events.filter((e) => e.ts.slice(0, 10) === key).length,
      })
    }
    return days
  }, [events])

  if (error) return <p className="text-xs text-mist">{error}</p>
  const total = data.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) {
    return <p className="py-6 text-center text-xs text-mist/70">No admin events in the last 14 days.</p>
  }
  const range = `${data[0]?.fullLabel} – ${data[data.length - 1]?.fullLabel}`
  return (
    <div>
      <MiniBars data={data} className="h-28" ariaLabel={`Admin events per day, ${range}, ${total} total`} />
      <div className="mt-2 flex justify-between font-mono text-[9px] tabular-nums text-mist/60">
        <span>{data[0]?.fullLabel}</span>
        <span>today</span>
      </div>
    </div>
  )
}
