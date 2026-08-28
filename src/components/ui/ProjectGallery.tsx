import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

interface ProjectGalleryProps {
  images: { src: string; caption: string }[]
  /** Auto-rotation interval in ms (default 5000). */
  interval?: number
}

/**
 * Reusable screenshot slideshow with a fullscreen lightbox.
 * One image at a time, auto rotation, prev/next controls, dot indicators,
 * swipe support, autoplay pause on interaction, and click-to-zoom lightbox
 * with ESC close and keyboard/swipe navigation.
 */
export function ProjectGallery({ images, interval = 5000 }: ProjectGalleryProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
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

  // Lightbox keyboard controls + scroll lock
  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen, go])

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
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`Open ${img.caption} fullscreen`}
                className="block w-full cursor-zoom-in"
              >
                <img
                  src={img.src}
                  alt={img.caption}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="aspect-video w-full object-cover object-top transition-transform duration-500 hover:scale-[1.02]"
                />
              </button>
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
              className="flex h-6 w-6 cursor-pointer items-center justify-center"
            >
              <span
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === index
                    ? 'w-7 bg-accent shadow-[0_0_8px_rgba(57,255,139,0.6)]'
                    : 'w-3 bg-edge hover:bg-accent/50'
                )}
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={images[index].caption}
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[80] flex animate-[fadeIn_0.25s_ease-out] flex-col items-center justify-center bg-void/95 p-4 backdrop-blur-sm md:p-10"
        >
          <button
            type="button"
            aria-label="Close lightbox"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-edge bg-panel/80 text-frost transition-colors hover:border-accent/60 hover:text-accent"
          >
            ✕
          </button>

          {count > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation()
                  go(-1)
                }}
                className="absolute top-1/2 left-3 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-edge bg-panel/80 text-frost transition-colors hover:border-accent/60 hover:text-accent md:left-6"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation()
                  go(1)
                }}
                className="absolute top-1/2 right-3 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-edge bg-panel/80 text-frost transition-colors hover:border-accent/60 hover:text-accent md:right-6"
              >
                →
              </button>
            </>
          )}

          <figure
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full max-w-6xl animate-[fadeIn_0.3s_ease-out] flex-col"
          >
            <img
              src={images[index].src}
              alt={images[index].caption}
              className="max-h-[82vh] w-auto max-w-full rounded-xl border border-edge object-contain"
            />
            <figcaption className="mt-3 text-center font-mono text-xs text-mist">
              {images[index].caption}
              {count > 1 && (
                <span className="ml-2 text-mist/60">
                  {index + 1} / {count}
                </span>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  )
}
