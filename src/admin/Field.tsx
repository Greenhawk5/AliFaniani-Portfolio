/**
 * Form primitives for the admin editors — v2 design system. The exported
 * API (Field, inputClasses, StateBadge, Notice) is preserved; styling is
 * upgraded to the Control Center vocabulary (color + glyph state markers).
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-mist">{label}</span>
        {hint && <span className="text-[10px] text-mist/60">{hint}</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-danger">
          {error}
        </span>
      )}
    </label>
  )
}

export const inputClasses =
  'w-full rounded-lg border border-edge bg-abyss px-3 py-2 text-sm text-frost placeholder:text-mist/40 outline-none transition-colors focus:border-accent/60 focus:ring-2 focus:ring-accent/15 disabled:opacity-50'

/** Content state badge: color + a small glyph so state survives color-blind
 * viewing. 'edited' is a secondary marker (a draft overlay exists). */
export function StateBadge({ state, hasDraft }: { state: 'draft' | 'published' | 'archived'; hasDraft?: boolean }) {
  const styles: Record<string, string> = {
    published: 'border-accent/40 bg-accent/10 text-accent',
    draft: 'border-amber/40 bg-amber/10 text-amber',
    archived: 'border-edge-2 bg-panel-2 text-mist',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider', styles[state])}>
        <span
          aria-hidden
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            state === 'published' && 'bg-accent',
            state === 'draft' && 'bg-amber',
            state === 'archived' && 'bg-mist/60'
          )}
        />
        {state}
      </span>
      {hasDraft && (
        <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-cyan">
          edited
        </span>
      )}
    </span>
  )
}

export function Notice({ kind, children }: { kind: 'success' | 'error' | 'info' | 'warning'; children: ReactNode }) {
  const styles = {
    success: 'border-accent/40 bg-accent/8 text-accent',
    error: 'border-danger/40 bg-danger/8 text-danger',
    info: 'border-cyan/35 bg-cyan/8 text-cyan',
    warning: 'border-amber/40 bg-amber/8 text-amber',
  }[kind]
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn('rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed', styles)}
    >
      {children}
    </p>
  )
}
