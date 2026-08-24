import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SectionProps {
  title?: string
  subtitle?: string
  className?: string
  children: ReactNode
}

export function Section({ title, subtitle, className, children }: SectionProps) {
  return (
    <section className={cn('py-14 md:py-20', className)}>
      {(title || subtitle) && (
        <header className="mb-8 md:mb-12">
          {subtitle && (
            <p className="mb-2 font-mono text-xs tracking-[0.25em] text-accent uppercase">
              {subtitle}
            </p>
          )}
          {title && (
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-frost">
              {title}
            </h2>
          )}
        </header>
      )}
      {children}
    </section>
  )
}

export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-5xl px-5 md:px-8', className)}>{children}</div>
  )
}
