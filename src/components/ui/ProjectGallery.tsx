import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

interface ProjectGalleryProps {
  images: { src: string; caption: string }[]
  /** Auto-rotation interval in ms (default 5000). */
  interval?: number
}

/**
 * Reusable screenshot slideshow: one image at a time, auto rotation,
 * prev/next controls, dot indicators, swipe support, and autoplay
 * pause while the user interacts.
 */
export function ProjectGallery({ images, interval = 5000 }: ProjectGalleryProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const count = images.length

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count),
    [count]
  )

  useEffect(() => {
    if (paused || count <= 1) return
    const id = setInterval(() => go(1), interval)
    return () => clearInterval(id)
  }, [paused, go, interval, count])

  if (count === 0) return null

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
        setPaused(true)
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current !== null) {
          const dx = e.changedTouches[0].clientX - touchStartX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchStartX.current = null
        }
      }}
      className="group/gallery relative"
    >
      <div className="overflow-hidden rounded-2xl border border-edge bg-panel">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {images.map((img, i) => (
            <figure key={img.src} className="w-full shrink-0">
              <img
                src={img.src}
                alt={img.caption}
                loading={i === 0 ? 'eager' : 'lazy'}
                className="aspect-video w-full object-cover object-top"
              />
              <figcaption className="border-t border-edge px-4 py-2.5 font-mono text-xs text-mist">
                {img.caption}
              </figcaption>
            </figure>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous screenshot"
              onClick={() => go(-1)}
              className="absolute top-1/2 left-3 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-edge bg-void/70 text-frost opacity-0 backdrop-blur-sm transition-all duration-200 hover:border-accent/60 hover:text-accent group-hover/gallery:opacity-100 max-md:opacity-100"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Next screenshot"
              onClick={() => go(1)}
              className="absolute top-1/2 right-3 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-edge bg-void/70 text-frost opacity-0 backdrop-blur-sm transition-all duration-200 hover:border-accent/60 hover:text-accent group-hover/gallery:opacity-100 max-md:opacity-100"
            >
              →
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to ${img.caption}`}
              className={cn(
                'h-1.5 cursor-pointer rounded-full transition-all duration-300',
                i === index
                  ? 'w-8 bg-accent shadow-[0_0_8px_rgba(57,255,139,0.6)]'
                  : 'w-3 bg-edge hover:bg-accent/50'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
