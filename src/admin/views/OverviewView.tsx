/**
 * Overview — the Control Center dashboard. Everything shown is derived from
 * real sources: D1 content records (counts, drafts, freshness), the deploy
 * state KV, and the auth_log audit trail. No analytics exist in this
 * codebase, so there are no traffic widgets — the visitor story is honestly
 * delegated to Cloudflare Web Analytics (see Integrations).
 */

import { useEffect, useMemo, useState } from 'react'
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
import { AreaTrendChart } from '../ui/EvilCharts'
import { FolderIcon, UserIcon, UsersIcon, LinkIcon, RocketIcon, SearchIcon } from '../ui/icons'
import { CheckIcon } from '@/components/ui/icons'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

interface Attention {
  id: string
  notifId?: string
  state?: string
  isPinned?: boolean
  isUnread?: boolean
  tone: 'danger' | 'warning' | 'info'
  title: string
  description: string
  action?: { label: string; view: AdminView }
}

export function OverviewView({ onNavigate: navigate }: { onNavigate: (view: AdminView, param?: string) => void }) {
  const data = useAdminData()
  const counts = useContentCounts()
  const [visitorStats, setVisitorStats] = useState<{ totalVisitors: number; totalViews: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/analytics/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { totalVisitors?: number; totalViews?: number } | null) => {
        if (!cancelled && json && typeof json.totalVisitors === 'number') {
          setVisitorStats({
            totalVisitors: json.totalVisitors,
            totalViews: json.totalViews ?? 0,
          })
        }
      })
      .catch(() => {
        /* non-fatal fallback */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const unreadCount = useMemo(() => {
    return (data.notifications ?? []).filter(
      (n) => !n.readAt && n.state !== 'archived' && n.state !== 'dismissed' && n.state !== 'resolved' && n.state !== 'deleted'
    ).length
  }, [data.notifications])

  const attention = useMemo<Attention[]>(() => {
    const issues: Attention[] = []

    // Actionable notifications from D1 admin_notifications table
    if (data.notifications) {
      const activeNotifications = data.notifications.filter((n) => {
        if (n.state === 'resolved' || n.state === 'expired' || n.state === 'dismissed' || n.state === 'archived' || n.state === 'deleted') {
          return false
        }
        return !n.readAt || n.isPinned
      })

      // Sort: pinned first, then newest
      activeNotifications.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
        return b.createdAt.localeCompare(a.createdAt)
      })

      // Limit to top 4 for a compact preview
      for (const n of activeNotifications.slice(0, 4)) {
        const tone: 'danger' | 'warning' | 'info' =
          n.priority === 'critical' || n.severity === 'critical'
            ? 'danger'
            : n.priority === 'important' || n.severity === 'warning'
              ? 'warning'
              : 'info'

        let action: { label: string; view: AdminView } | undefined = undefined
        if (n.linkUrl?.includes('publishing') || n.type === 'deploy' || n.type === 'content') {
          action = { label: 'Publishing', view: 'publishing' }
        } else if (n.linkUrl?.includes('activity') || n.type === 'security') {
          action = { label: 'Activity', view: 'activity' }
        }

        issues.push({
          id: n.id,
          notifId: n.id,
          state: n.state,
          isPinned: n.isPinned,
          isUnread: !n.readAt,
          tone,
          title: n.title,
          description: n.message,
          action,
        })
      }
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
  }, [data.notifications, data.itemsError])

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
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void data.refreshAll()
            fetch('/api/analytics/stats')
              .then((res) => (res.ok ? res.json() : null))
              .then((json: { totalVisitors?: number; totalViews?: number } | null) => {
                if (json && typeof json.totalVisitors === 'number') {
                  setVisitorStats({
                    totalVisitors: json.totalVisitors,
                    totalViews: json.totalViews ?? 0,
                  })
                }
              })
              .catch(() => {})
          }}
        >
          Refresh
        </Button>
      </header>

      {/* Needs attention */}
      <section aria-labelledby="attention-heading">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 id="attention-heading" className="text-sm font-semibold text-frost">
            Needs attention
          </h2>
          <button
            onClick={() => navigate('notifications')}
            className="flex items-center gap-1.5 font-mono text-xs text-accent hover:underline cursor-pointer"
          >
            <span>Notification Center</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-accent/20 px-1.5 py-0.2 font-mono text-[10px] font-bold text-accent">
                {unreadCount}
              </span>
            )}
            <span>&rarr;</span>
          </button>
        </div>
        {attention.length === 0 ? (
          <AdminCard className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <CheckIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-frost">All clear</p>
              <p className="text-xs text-mist">No unread alerts, unpublished changes, failed syncs, or recent sign-in failures.</p>
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-frost">{issue.title}</p>
                    {issue.isPinned && (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-accent">
                        Pinned
                      </span>
                    )}
                    {issue.state === 'acknowledged' && (
                      <span className="rounded border border-edge-2 bg-panel-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-mist">
                        Acknowledged
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-mist">{issue.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {issue.action && (
                    <Button variant="outline" size="sm" onClick={() => navigate(issue.action!.view)}>
                      {issue.action.label}
                    </Button>
                  )}
                  {issue.notifId && issue.isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void data.markNotificationRead(issue.notifId!, true)}
                    >
                      Mark read
                    </Button>
                  )}
                  {issue.notifId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-mist hover:text-danger hover:border-danger/30"
                      onClick={() => void data.dismissNotification(issue.notifId!)}
                      title="Dismiss notification from overview"
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[92px] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
              label="Total visits"
              value={visitorStats ? visitorStats.totalVisitors.toLocaleString() : '—'}
              hint={visitorStats ? `${visitorStats.totalViews.toLocaleString()} views` : 'Unique sessions'}
              tone="accent"
              icon={<UsersIcon className="h-4 w-4" />}
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
    const days: Array<{ label: string; value: number; fullDate: string }> = []
    const today = new Date()
    for (let i = 13; i >= 0; i--) {
      const day = new Date(today)
      day.setDate(today.getDate() - i)
      const key = day.toISOString().slice(0, 10)
      days.push({
        label: key.slice(5),
        fullDate: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: events.filter((e) => e.ts.slice(0, 10) === key).length,
      })
    }
    return days
  }, [events])

  if (error) return <p className="text-xs text-mist">{error}</p>
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) {
    return <p className="py-6 text-center text-xs text-mist/70">No admin events in the last 14 days.</p>
  }
  const range = `${data[0]?.fullDate} – ${data[data.length - 1]?.fullDate}`
  return (
    <div>
      <AreaTrendChart
        data={data}
        height={130}
        color="#39ff8b"
        ariaLabel={`Admin events per day, ${range}, ${total} total`}
      />
    </div>
  )
}
