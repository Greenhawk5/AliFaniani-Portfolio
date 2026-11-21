import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Lightweight, non-blocking page view tracking.
 *
 * Uses `navigator.sendBeacon` with JSON payload for zero-overhead background
 * delivery that does not block DOM rendering or route transitions.
 */
export function useAnalyticsTracker() {
  const { pathname } = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined' || pathname.startsWith('/admin')) return

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
    })

    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/analytics/track', blob)
      } else {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    } catch {
      // Analytics must never disrupt user experience
    }
  }, [pathname])
}
