import { useEffect, useState } from 'react'
import { ArrowUpIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

const SHOW_AFTER_PX = 500

/**
 * Global floating "back to top" button.
 * Renders on every page it is mounted on (Layout mounts it on all non-home pages).
 * Appears after the user scrolls past SHOW_AFTER_PX and smoothly scrolls to top on click.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className={cn(
        'fixed right-5 bottom-5 z-50 flex h-11 w-11 cursor-pointer items-center justify-center',
        'rounded-full border border-edge bg-panel/80 text-mist backdrop-blur-md',
        'shadow-[0_0_24px_-8px_rgba(57,255,139,0.5)] transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent hover:shadow-[0_0_30px_-6px_rgba(57,255,139,0.7)]',
        'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      )}
    >
      <ArrowUpIcon className="h-5 w-5" />
    </button>
  )
}
