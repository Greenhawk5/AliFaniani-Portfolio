/**
 * Activity — the audit trail (auth_log) rendered as a paginated, filterable
 * timeline. Origin (IP + edge country) is Admin-only; full IPs are masked
 * by default and revealed per-session on explicit request. Newest first.
 */

import { useMemo, useState } from 'react'
import { useAdminData } from '../AdminDataProvider'
import { AdminCard, AdminEmpty, AdminNotice, StatusDot, SkeletonRows, relativeTime, absoluteTime } from '../ui/primitives'
import { AdminSelect, AdminSwitch } from '../ui/form-controls'
import { DonutDistributionChart, AreaTrendChart } from '../ui/EvilCharts'
import { eventLabel } from './OverviewView'
import { cn } from '@/lib/cn'

type Category = 'all' | 'content' | 'publish' | 'auth'

const CATEGORY_FILTERS: { value: Category; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'content', label: 'Content' },
  { value: 'publish', label: 'Publish' },
  { value: 'auth', label: 'Sign-in' },
]

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const

function categoryOf(event: string): Exclude<Category, 'all'> {
  if (event.startsWith('content_')) return 'content'
  if (event.startsWith('publish_') || event.startsWith('sync_') || event.startsWith('deploy_')) return 'publish'
  return 'auth'
}

/** Mask a full IPv4/IPv6 address to its routing prefix (matches the API). */
function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown'
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length !== 4) return 'unknown'
    return `${parts[0]}.${parts[1]}.0.0`
  }
  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean)
    if (parts.length < 3) return 'unknown'
    return `${parts[0]}:${parts[1]}:${parts[2]}::`
  }
  return 'unknown'
}

/** Small flag-free country chip: 2-letter code, or an honest fallback. */
function CountryMark({ code }: { code: string | null }) {
  if (!code) {
    return <span className="text-mist/50">Country: not recorded</span>
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="rounded border border-edge-2 bg-panel-2 px-1 font-mono text-[9px] font-semibold tracking-wider text-frost">
        {code}
      </span>
      <span className="sr-only">Country {code}</span>
    </span>
  )
}

export function ActivityView() {
  const { activity, activityError, refreshActivity } = useAdminData()
  const [category, setCategory] = useState<Category>('all')
  const [pageSize, setPageSize] = useState<number>(10)
  const [page, setPage] = useState(1)
  const [showFullIp, setShowFullIp] = useState(false)

  const events = useMemo(() => activity?.events ?? [], [activity])
  const filtered = useMemo(
    () => (category === 'all' ? events : events.filter((e) => categoryOf(e.event) === category)),
    [events, category]
  )

  const counts = useMemo(() => {
    const c: Record<Category, number> = { all: events.length, content: 0, publish: 0, auth: 0 }
    for (const e of events) c[categoryOf(e.event)]++
    return c
  }, [events])

  // Reset to page 1 whenever the filter or page size changes.
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, filtered.length)
  const pageEvents = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const setCategoryAndReset = (next: Category) => {
    setCategory(next)
    setPage(1)
  }
  const setPageSizeAndReset = (next: number) => {
    setPageSize(next)
    setPage(1)
  }

  const distributionSlices = useMemo(() => {
    const allTime = activity?.summary.allTime
    if (allTime && allTime.total > 0) {
      return [
        { id: 'content', label: 'Content', value: allTime.content, color: '#39ff8b' },
        { id: 'publish', label: 'Publish', value: allTime.publish, color: '#37d5ff' },
        { id: 'auth', label: 'Sign-in', value: allTime.auth, color: '#f59e0b' },
      ]
    }
    return [
      { id: 'content', label: 'Content', value: counts.content, color: '#39ff8b' },
      { id: 'publish', label: 'Publish', value: counts.publish, color: '#37d5ff' },
      { id: 'auth', label: 'Sign-in', value: counts.auth, color: '#f59e0b' },
    ]
  }, [counts, activity?.summary.allTime])

  const activityTrendData = useMemo(() => {
    const days: Array<{ label: string; value: number; fullDate: string }> = []
    const today = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const dateKey = d.toISOString().slice(0, 10)
      const count = events.filter((e) => e.ts.startsWith(dateKey)).length
      days.push({
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: count,
        fullDate: dateKey,
      })
    }
    return days
  }, [events])

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">System</p>
          <h1 className="mt-1 text-2xl font-semibold text-frost">Activity</h1>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            The audit trail recorded by the API — sign-ins, content changes, publish outcomes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSwitch
            checked={showFullIp}
            onChange={setShowFullIp}
            label="Reveal full IPs"
            className="rounded-lg border border-edge-2 bg-panel px-3 py-1.5"
          />
          <button
            onClick={() => void refreshActivity()}
            className="cursor-pointer rounded-lg border border-edge-2 px-3 py-1.5 font-mono text-xs text-mist transition-colors hover:border-accent/60 hover:text-accent"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* EvilCharts Visual Analytics Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <AdminCard>
          <div className="p-4">
            <h2 className="mb-3 font-mono text-xs font-semibold tracking-wider text-mist uppercase">
              Event Distribution
            </h2>
            <DonutDistributionChart
              data={distributionSlices}
              ariaLabel="Event category distribution"
            />
          </div>
        </AdminCard>

        <AdminCard>
          <div className="p-4">
            <h2 className="mb-3 font-mono text-xs font-semibold tracking-wider text-mist uppercase">
              14-Day Activity Pulse
            </h2>
            <AreaTrendChart
              data={activityTrendData}
              height={180}
              color="#37d5ff"
              ariaLabel="14-day activity trend"
            />
          </div>
        </AdminCard>
      </div>

      {activityError && <AdminNotice kind="error">{activityError}</AdminNotice>}

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Filter events" className="flex flex-wrap gap-1 rounded-xl border border-edge bg-panel/60 p-1">
          {CATEGORY_FILTERS.map((option) => (
            <button
              key={option.value}
              role="tab"
              aria-selected={category === option.value}
              onClick={() => setCategoryAndReset(option.value)}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors',
                category === option.value ? 'bg-accent/15 text-accent' : 'text-mist hover:text-frost'
              )}
            >
              {option.label}
              <span className="ml-1.5 text-mist/70">{counts[option.value]}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <AdminSelect
            value={pageSize}
            onChange={(val) => setPageSizeAndReset(Number(val))}
            options={PAGE_SIZE_OPTIONS.map((size) => ({
              value: size,
              label: `${size} per page`,
            }))}
            ariaLabel="Events per page"
          />
        </div>
      </div>

      {activity === null && !activityError ? (
        <SkeletonRows rows={8} />
      ) : filtered.length === 0 ? (
        <AdminEmpty
          title="No events in this category"
          description="Events appear as you use the CMS — edits, publishes, sign-ins."
        />
      ) : (
        <>
          <p className="text-xs text-mist/70" aria-live="polite">
            Showing {start}–{end} of {filtered.length}
          </p>
          <AdminCard className="p-0">
            <ol className="divide-y divide-edge">
              {pageEvents.map((event, i) => (
                <li key={`${event.ts}-${i}`} className="flex items-start gap-3 px-4 py-3">
                  <StatusDot
                    tone={event.ok ? (categoryOf(event.event) === 'auth' ? 'neutral' : 'accent') : 'danger'}

                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-frost">
                      {eventLabel(event.event)}
                      {event.detail && <span className="text-mist"> — {event.detail}</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-mist/60" title={absoluteTime(event.ts)}>
                      <span>{absoluteTime(event.ts)} · {relativeTime(event.ts)}</span>
                      <span aria-hidden>·</span>
                      <span>IP: {showFullIp ? event.ip : maskIp(event.ip)}</span>
                      <span aria-hidden>·</span>
                      <CountryMark code={event.country} />
                    </p>
                  </div>
                  {!event.ok && (
                    <span className="rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-danger">
                      failed
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </AdminCard>
          {totalPages > 1 && (
            <nav aria-label="Activity pages" className="flex flex-wrap items-center justify-center gap-1.5">
              <PagerButton disabled={safePage === 1} onClick={() => setPage(safePage - 1)} label="Previous" />
              {pageNumbers(safePage, totalPages).map((n, i) =>
                n === '…' ? (
                  <span key={`gap-${i}`} aria-hidden className="px-1 text-xs text-mist/50">
                    …
                  </span>
                ) : (
                  <PagerButton
                    key={n}
                    active={n === safePage}
                    onClick={() => setPage(n)}
                    label={`Page ${n}`}
                  >
                    {n}
                  </PagerButton>
                )
              )}
              <PagerButton
                disabled={safePage === totalPages}
                onClick={() => setPage(safePage + 1)}
                label="Next"
              />
            </nav>
          )}
        </>
      )}
      <p className="text-[11px] leading-relaxed text-mist/50">
        Origin data is Admin-only and never leaves this console. IPs are masked unless revealed; country is
        the Cloudflare edge value recorded at event time — older rows predate capture and show "not recorded".
      </p>
    </div>
  )
}

function PagerButton({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children?: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'min-w-9 cursor-pointer rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-35',
        active
          ? 'border-accent/60 bg-accent/12 text-accent'
          : 'border-edge-2 text-mist hover:border-accent/50 hover:text-frost'
      )}
    >
      {children ?? label}
    </button>
  )
}

/** Compact page window: first, last, and ±1 around current. */
function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const keep = new Set([1, 2, total - 1, total, current - 1, current, current + 1])
  const sorted = [...keep].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…')
    out.push(sorted[i])
  }
  return out
}
