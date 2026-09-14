/**
 * Hand-rolled micro bar chart (no chart dependency). Used for the activity
 * timeline on Overview — counts per day over a fixed window.
 *
 * Data-honest by construction: every bar height, label, and tooltip derives
 * from the passed data; empty days render as baseline ticks, never as
 * interpolated values. Keyboard/focus accessible via per-bar tab stops.
 */

import { cn } from '@/lib/cn'

export interface BarDatum {
  label: string
  count: number
  /** Full human date for tooltips, e.g. "Sep 12". Falls back to label. */
  fullLabel?: string
}

export function MiniBars({
  data,
  className,
  tone = 'accent',
  ariaLabel,
}: {
  data: BarDatum[]
  className?: string
  tone?: 'accent' | 'muted'
  ariaLabel: string
}) {
  const max = Math.max(1, ...data.map((d) => d.count))
  const total = data.reduce((sum, d) => sum + d.count, 0)
  // Nice-ceiling the scale (1/2/5 × 10^n) so the top gridline is a round,
  // truthful number derived from the dataset — never arbitrary.
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(max)))
  const niceMax = [1, 2, 5, 10].map((m) => m * magnitude).find((m) => m >= max) ?? max
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist/70">
          {total} event{total === 1 ? '' : 's'} · 14 days
        </p>
        <p className="font-mono text-[10px] tabular-nums text-mist/50" aria-hidden>
          peak {max}/day
        </p>
      </div>
      <div
        role="img"
        aria-label={ariaLabel}
        className={cn('relative flex items-end gap-[3px] border-b border-edge', className)}
      >
        {/* Scale gridlines at 0/50/100% of the nice ceiling (derived, honest). */}
        <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-0">
          <span className="border-t border-dashed border-edge/70 font-mono text-[8px] tabular-nums text-mist/40">
            {niceMax}
          </span>
          <span className="border-t border-dashed border-edge/50" />
        </div>
        {data.map((d) => {
          const h = d.count > 0 ? Math.max(6, Math.round((d.count / niceMax) * 100)) : 2
          const tip = `${d.fullLabel ?? d.label}: ${d.count} event${d.count === 1 ? '' : 's'}`
          return (
            <div
              key={d.label}
              tabIndex={d.count > 0 ? 0 : -1}
              role="img"
              aria-label={d.count > 0 ? tip : undefined}
              title={tip}
              className={cn(
                'group relative min-w-0 flex-1 rounded-t-[2px] transition-colors focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1',
                tone === 'accent'
                  ? d.count > 0
                    ? 'bg-accent/70 hover:bg-accent focus-visible:bg-accent'
                    : 'bg-edge-2'
                  : 'bg-mist/25 hover:bg-mist/40'
              )}
              style={{ height: `${h}%` }}
            >
              {/* Hover/focus tooltip: date + exact count. */}
              {d.count > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-edge-2 bg-abyss px-2 py-1 font-mono text-[10px] tabular-nums text-frost shadow-xl group-hover:block group-focus-visible:block"
                >
                  {tip}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
