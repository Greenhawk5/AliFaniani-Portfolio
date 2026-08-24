import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const tones = {
  accent: 'bg-accent/10 text-accent border-accent/25',
  /** Premium glass style for overlays on imagery: high contrast + soft green glow. */
  glass:
    'border-accent/40 bg-void/60 text-accent backdrop-blur-md shadow-[0_0_16px_-4px_rgba(57,255,139,0.45)]',
  violet: 'bg-violet/10 text-violet border-violet/25',
  cyan: 'bg-cyan/10 text-cyan border-cyan/25',
  amber: 'bg-amber/10 text-amber border-amber/25',
  neutral: 'bg-panel-2 text-mist border-edge-2',
} as const

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: keyof typeof tones
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function TechTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-edge-2 bg-panel-2 px-2 py-1 font-mono text-[11px] text-mist transition-colors hover:border-accent/40 hover:text-accent">
      {children}
    </span>
  )
}
