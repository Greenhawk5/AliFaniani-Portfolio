import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function ProjectArt({
  initial,
  accent,
  accent2,
  className,
}: {
  initial: string
  accent: string
  accent2: string
  className?: string
}) {
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        background: `radial-gradient(120% 140% at 20% 10%, ${accent}26 0%, transparent 55%), radial-gradient(120% 140% at 85% 90%, ${accent2}26 0%, transparent 55%), linear-gradient(150deg, #0d1120 0%, #0a0d16 100%)`,
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <span
        className="absolute -right-4 -bottom-7 text-[7rem] leading-none font-black tracking-tighter opacity-[0.16] select-none"
        style={{ color: accent }}
      >
        {initial}
      </span>
      <span
        className="absolute top-4 left-4 h-2 w-2 rounded-full"
        style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
      />
    </div>
  )
}

export function ArtFrame({ children }: { children: ReactNode }) {
  return <>{children}</>
}
