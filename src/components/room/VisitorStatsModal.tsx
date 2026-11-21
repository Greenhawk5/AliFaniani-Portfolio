import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useUiStore } from '@/stores/uiStore'
import { CloseIcon, ShieldIcon, SparkleIcon } from '@/components/ui/icons'

interface PublicStats {
  totalVisitors: number
  totalViews: number
  activeProjects: number
  popularProjects?: string[]
}

export function VisitorStatsModal() {
  const open = useUiStore((s) => s.visitorStatsOpen)
  const setOpen = useUiStore((s) => s.setVisitorStatsOpen)
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      setLoading(true)
      setError(false)
      fetch('/api/analytics/stats')
        .then((res) => {
          if (!res.ok) throw new Error('Failed to fetch stats')
          return res.json()
        })
        .then((data: PublicStats) => {
          if (!cancelled) {
            setStats(data)
            setLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError(true)
            setLoading(false)
          }
        })
    })

    return () => {
      cancelled = true
    }
  }, [open])

  // Escape key handler
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-void/80 backdrop-blur-md"
          />

          {/* Dialog Card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="visitor-stats-title"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-edge-2 bg-gradient-to-b from-panel via-panel/95 to-panel-2 p-6 shadow-2xl backdrop-blur-xl"
          >
            {/* Header Ambient Glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl"
            />

            {/* Header */}
            <div className="flex items-start justify-between border-b border-edge/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
                  <SparkleIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2
                    id="visitor-stats-title"
                    className="font-mono text-base font-semibold text-frost"
                  >
                    Visitor Statistics
                  </h2>
                  <p className="font-mono text-[10px] tracking-wider text-accent uppercase">
                    3D Scene Telemetry
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close statistics dialog"
                className="rounded-lg border border-edge p-1.5 text-mist transition-colors hover:border-accent/40 hover:text-frost focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="mt-5 space-y-4">
              {loading && !stats ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
                  <p className="mt-3 font-mono text-xs text-mist">Querying D1 edge metrics...</p>
                </div>
              ) : error && !stats ? (
                <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-center">
                  <p className="text-xs text-danger">Telemetry temporarily unavailable.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-edge-2 bg-panel-2/60 p-3.5 text-center">
                      <span className="font-mono text-[10px] tracking-wider text-mist uppercase">
                        Total Visitors
                      </span>
                      <p className="mt-1 font-mono text-2xl font-bold text-accent">
                        {(stats?.totalVisitors ?? 0).toLocaleString()}
                      </p>
                      <span className="font-mono text-[9px] text-mist/60">Unique Sessions</span>
                    </div>

                    <div className="rounded-xl border border-edge-2 bg-panel-2/60 p-3.5 text-center">
                      <span className="font-mono text-[10px] tracking-wider text-mist uppercase">
                        Page Impressions
                      </span>
                      <p className="mt-1 font-mono text-2xl font-bold text-cyan">
                        {(stats?.totalViews ?? 0).toLocaleString()}
                      </p>
                      <span className="font-mono text-[9px] text-mist/60">Live Views</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-edge-2 bg-panel-2/40 p-3.5">
                    <div className="flex items-center justify-between font-mono text-xs text-mist">
                      <span>Active Projects</span>
                      <span className="font-bold text-frost">
                        {stats?.activeProjects ?? 5} Published
                      </span>
                    </div>
                    {stats?.popularProjects && stats.popularProjects.length > 0 && (
                      <div className="mt-2.5 border-t border-edge/40 pt-2">
                        <span className="font-mono text-[10px] tracking-wider text-mist uppercase">
                          Popular Projects
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {stats.popularProjects.slice(0, 4).map((slug) => (
                            <span
                              key={slug}
                              className="rounded border border-edge-2 bg-panel px-2 py-0.5 font-mono text-[10px] text-frost"
                            >
                              {slug}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Verification Badge */}
                  <div className="flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent/5 p-3 text-left">
                    <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <p className="text-[11px] leading-relaxed text-frost/80">
                      <strong className="text-accent">100% Privacy-Preserving:</strong> No third-party
                      trackers, cookies, or cross-site fingerprinting. Analytics are aggregated
                      directly on the Cloudflare edge into D1.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 border-t border-edge/60 pt-3 text-right">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-panel-2 border border-edge px-4 py-1.5 font-mono text-xs text-frost transition-colors hover:border-accent/40 hover:text-accent"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
