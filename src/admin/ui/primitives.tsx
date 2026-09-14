/**
 * Admin UI primitives — the shared design system for the Control Center.
 * Extends the portfolio tokens (void/abyss/panel/edge/frost/mist/accent)
 * with admin-only surface levels and status vocabulary.
 *
 * Surface hierarchy (dark-first):
 *   void  → app background
 *   abyss → sidebar / rail
 *   panel → cards (level 1)
 *   panel-2 → elevated/hover (level 2)
 *   edge/edge-2 → hairline borders
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { CloseIcon } from '@/components/ui/icons'
import { CheckIcon, AlertIcon } from '@/components/ui/icons'

/* --------------------------------- surfaces -------------------------------- */

export function AdminCard({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-edge bg-panel/70', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-edge px-4 py-3', className)}>
      <h2 className="text-sm font-semibold text-frost">{title}</h2>
      {action}
    </div>
  )
}

/* --------------------------------- stat tile -------------------------------- */

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'accent' | 'warning' | 'danger'
  icon?: ReactNode
}) {
  const valueTone = {
    default: 'text-frost',
    accent: 'text-accent',
    warning: 'text-amber',
    danger: 'text-danger',
  }[tone]
  return (
    <div className="rounded-xl border border-edge bg-panel/70 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
        {icon && <span className="text-mist/70">{icon}</span>}
      </div>
      <p className={cn('mt-1.5 text-2xl font-semibold tabular-nums leading-none', valueTone)}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-mist/80">{hint}</p>}
    </div>
  )
}

/* ------------------------------- status pills ------------------------------- */

export type StatusTone = 'ok' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent'

const pillTones: Record<StatusTone, string> = {
  ok: 'border-accent/35 bg-accent/10 text-accent',
  accent: 'border-accent/35 bg-accent/10 text-accent',
  warning: 'border-amber/35 bg-amber/10 text-amber',
  danger: 'border-danger/35 bg-danger/10 text-danger',
  info: 'border-cyan/35 bg-cyan/10 text-cyan',
  neutral: 'border-edge-2 bg-panel-2 text-mist',
}

export function StatusPill({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: StatusTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider',
        pillTones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

/** Status dot — color + a shape cue so state never relies on color alone.
 * Optically centered on the text x-height: the wrapper is a 1lh-tall
 * inline-flex box, bottom-aligned to the text baseline (align-bottom), with
 * the 8px marker centered inside it. This beats align-baseline centering
 * (which sits at cap-height, ~1-2px too low next to small text). Callers in
 * multi-line `items-start` rows add no margin — the first line's 1lh box
 * aligns the marker with that line's text automatically. */
export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  const shapes: Record<StatusTone, string> = {
    ok: 'rounded-full bg-accent',
    accent: 'rounded-full bg-accent',
    warning: 'rounded-[2px] rotate-45 bg-amber',
    danger: 'rounded-[2px] rotate-45 bg-danger',
    info: 'rounded-full bg-cyan',
    neutral: 'rounded-full bg-mist/60',
  }
  return (
    <span aria-hidden className={cn('inline-flex h-[1lh] shrink-0 items-center align-bottom', className)}>
      <span className={cn('block h-2 w-2', shapes[tone])} />
    </span>
  )
}

/* ---------------------------------- notice ---------------------------------- */

export function AdminNotice({
  kind,
  title,
  children,
}: {
  kind: 'success' | 'error' | 'info' | 'warning'
  title?: string
  children: ReactNode
}) {
  const styles = {
    success: 'border-accent/40 bg-accent/8 text-accent',
    error: 'border-danger/40 bg-danger/8 text-danger',
    info: 'border-cyan/35 bg-cyan/8 text-cyan',
    warning: 'border-amber/40 bg-amber/8 text-amber',
  }[kind]
  const Icon = kind === 'success' ? CheckIcon : AlertIcon
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed', styles)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn('text-[13px] opacity-90', title && 'mt-0.5')}>{children}</div>
      </div>
    </div>
  )
}

/* --------------------------------- skeleton --------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('block animate-pulse rounded-md bg-panel-2', className)}
    />
  )
}

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

/* -------------------------------- empty state ------------------------------- */

export function AdminEmpty({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-edge-2 bg-panel/40 px-6 py-12 text-center">
      {icon && <span className="mb-1 text-mist/50">{icon}</span>}
      <p className="text-sm font-medium text-frost">{title}</p>
      {description && <p className="max-w-sm text-xs leading-relaxed text-mist">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

/* ---------------------------------- modal ----------------------------------- */

export function AdminModal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-void/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl border border-edge-2 bg-panel shadow-2xl sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        )}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-edge bg-panel px-5 py-3.5">
          <h3 className="text-sm font-semibold text-frost">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="relative rounded-lg p-1.5 text-mist transition-colors hover:bg-panel-2 hover:text-frost cursor-pointer before:absolute before:-inset-2 before:content-['']"
          >
            <CloseIcon className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/* ---------------------------------- toast ----------------------------------- */

interface ToastState {
  id: number
  kind: 'success' | 'error' | 'info'
  message: string
}

let toastSeq = 0

/** Imperative toast controller — one host rendered by the shell. */
const toastListeners = new Set<(t: ToastState[]) => void>()
let toasts: ToastState[] = []

export function toast(kind: ToastState['kind'], message: string) {
  const t = { id: ++toastSeq, kind, message }
  toasts = [...toasts, t]
  toastListeners.forEach((l) => l(toasts))
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id)
    toastListeners.forEach((l) => l(toasts))
  }, 5000)
}

export function ToastHost() {
  const [current, setCurrent] = useState<ToastState[]>([])
  useEffect(() => {
    toastListeners.add(setCurrent)
    return () => {
      toastListeners.delete(setCurrent)
    }
  }, [])
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[95] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {current.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-xl backdrop-blur-md',
            t.kind === 'success' && 'border-accent/40 bg-panel/95 text-accent',
            t.kind === 'error' && 'border-danger/40 bg-panel/95 text-danger',
            t.kind === 'info' && 'border-edge-2 bg-panel/95 text-frost'
          )}
        >
          {t.kind === 'success' ? <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="min-w-0 flex-1">{t.message}</span>
          <button
            aria-label="Dismiss notification"
            className="cursor-pointer rounded p-0.5 text-mist transition-colors hover:text-frost"
            onClick={() => {
              toasts = toasts.filter((x) => x.id !== t.id)
              toastListeners.forEach((l) => l(toasts))
            }}
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

/* --------------------------------- section ---------------------------------- */

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-mist/70">{children}</h2>
  )
}

/* --------------------------------- utilities -------------------------------- */

/** Relative time for timestamps ("3m ago", "2h ago", "Sep 12"). Deterministic
 * per render; timestamps in the future render as "just now". */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return '—'
  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 45) return 'just now'
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`
  if (seconds < 86400 * 7) return `${Math.round(seconds / 86400)}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Short absolute timestamp for tooltips/meta rows. */
export function absoluteTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
