import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  children: ReactNode
}

export function Card({ hover = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-panel border border-edge rounded-2xl',
        hover && 'card-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
