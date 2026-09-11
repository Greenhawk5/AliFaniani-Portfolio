/**
 * Small form primitives for the CMS editors — deliberately simple, styled
 * with the existing portfolio tokens (panel/edge/frost/accent).
 */

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
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-mist">{label}</span>
        {hint && <span className="text-[10px] text-mist/60">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  )
}

export const inputClasses =
  'w-full rounded-lg border border-edge bg-void/60 px-3 py-2 text-sm text-frost outline-none transition-colors focus:border-accent/60'

export function StateBadge({ state, hasDraft }: { state: 'draft' | 'published' | 'archived'; hasDraft?: boolean }) {
  const styles: Record<string, string> = {
    published: 'border-accent/40 text-accent',
    draft: 'border-amber-400/40 text-amber-300',
    archived: 'border-edge text-mist',
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider', styles[state])}>
        {state}
      </span>
      {hasDraft && (
        <span className="rounded border border-cyan-400/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan-300">
          edited
        </span>
      )}
    </span>
  )
}

export function Notice({ kind, children }: { kind: 'success' | 'error'; children: React.ReactNode }) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-lg border px-3 py-2 text-sm',
        kind === 'success' ? 'border-accent/40 bg-accent/10 text-accent' : 'border-danger/40 bg-danger/10 text-danger'
      )}
    >
      {children}
    </p>
  )
}
