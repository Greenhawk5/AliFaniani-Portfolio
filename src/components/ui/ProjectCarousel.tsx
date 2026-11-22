import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '@/data/types'
import { ArrowRightIcon } from './icons'
import { cn } from '@/lib/cn'

interface ProjectCarouselProps {
  projects: Project[]
  totalProjects?: number
  className?: string
  autoRotateInterval?: number
}

export function ProjectCarousel({
  projects,
  totalProjects,
  className,
  autoRotateInterval = 5000,
}: ProjectCarouselProps) {
  const items = projects.slice(0, 5)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reduced motion preference detection
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const nextSlide = useCallback(() => {
    if (items.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % items.length)
  }, [items.length])

  const prevSlide = useCallback(() => {
    if (items.length <= 1) return
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
  }, [items.length])

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  // Auto-rotation effect
  useEffect(() => {
    if (items.length <= 1 || isPaused || prefersReducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = window.setInterval(() => {
      nextSlide()
    }, autoRotateInterval)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [items.length, isPaused, prefersReducedMotion, autoRotateInterval, nextSlide])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      nextSlide()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      prevSlide()
    }
  }

  if (items.length === 0) return null

  const current = items[currentIndex]

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Selected Work Carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={(e) => {
        // Only unpause if focus left the entire container
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setIsPaused(false)
        }
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={cn(
        'group relative w-full max-w-full overflow-hidden rounded-xl border border-edge-2 bg-panel/75 p-4 sm:p-5 backdrop-blur-md transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/80 md:p-6',
        className
      )}
    >
      {/* Background ambient decorative glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/5 blur-3xl transition-opacity duration-500 group-hover:bg-accent/10"
      />

      {/* Header controls: Progress and Prev/Next buttons */}
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-edge/60 pb-3">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span className="shrink-0 font-mono text-xs font-semibold text-accent">
            {String(currentIndex + 1).padStart(2, '0')}
          </span>
          <span className="shrink-0 font-mono text-xs text-mist/40">/</span>
          <span className="shrink-0 font-mono text-xs text-mist/60">
            {String(items.length).padStart(2, '0')}
          </span>
          <span
            className="ml-1 sm:ml-2 inline-flex min-w-0 max-w-[125px] xs:max-w-[160px] sm:max-w-none items-center rounded border border-accent/20 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-accent uppercase truncate"
            title={current.category}
          >
            {current.category}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous project"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-edge bg-panel-2 text-mist transition-colors hover:border-accent/40 hover:text-frost focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
          >
            <span aria-hidden="true" className="font-mono text-xs">
              ←
            </span>
          </button>
          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next project"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-edge bg-panel-2 text-mist transition-colors hover:border-accent/40 hover:text-frost focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
          >
            <span aria-hidden="true" className="font-mono text-xs">
              →
            </span>
          </button>
        </div>
      </div>

      {/* Main slide display */}
      <div
        key={current.slug}
        aria-live="polite"
        className="my-4 sm:my-5 min-w-0 transition-all duration-300"
      >
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <Link
            to={`/projects/${current.slug}`}
            className="group/link min-w-0 flex-1 inline-flex items-center gap-2 focus:outline-none focus-visible:underline"
          >
            <h3 className="truncate text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-frost transition-colors group-hover/link:text-accent">
              {current.title}
            </h3>
            <ArrowRightIcon className="h-4 w-4 shrink-0 text-accent transition-transform duration-200 group-hover/link:translate-x-1" />
          </Link>
          <span className="shrink-0 font-mono text-xs text-mist/60">{current.year}</span>
        </div>

        {/* Dedicated fixed-height, single-line subtitle to prevent layout shift */}
        <div className="mt-1.5 flex h-5 min-w-0 items-center overflow-hidden">
          <p
            className="w-full truncate font-mono text-xs text-mist/80"
            title={current.subtitle || ''}
          >
            {current.subtitle || ''}
          </p>
        </div>
      </div>

      {/* Bottom navigation dots and View All action */}
      <div className="mt-4 sm:mt-5 flex min-w-0 items-center justify-between gap-2 border-t border-edge/60 pt-3">
        <div className="flex shrink-0 items-center gap-1.5">
          {items.map((project, idx) => (
            <button
              key={project.slug}
              type="button"
              onClick={() => goToSlide(idx)}
              aria-label={`Slide ${idx + 1}: ${project.title}`}
              aria-current={idx === currentIndex ? 'true' : 'false'}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer',
                idx === currentIndex
                  ? 'w-5 sm:w-6 bg-accent'
                  : 'w-2 bg-edge-2 hover:bg-mist/50'
              )}
            />
          ))}
        </div>

        <Link
          to="/projects"
          className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-semibold text-accent transition-colors hover:text-accent/80 whitespace-nowrap cursor-pointer"
        >
          View all {totalProjects ? `(${totalProjects}) ` : ''}<ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
