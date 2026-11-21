/**
 * Hook for client-side session inactivity tracking and warning modal (v2.2.0).
 *
 * Enforces:
 *   - Idle timeout warning at 13 minutes (2 minutes remaining).
 *   - Auto-logout at 15 minutes of inactivity.
 *   - Absolute session cap at 12 hours.
 *   - User-driven "Stay signed in" keepalive.
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { refreshSession, type SessionState } from './authApi'
import { toast } from './ui/primitives'

const IDLE_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const WARNING_THRESHOLD_MS = 13 * 60 * 1000 // Warning at 13 minutes
const ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1000 // 12 hours

export function useSessionTimeout({
  session,
  onLogout,
  onSessionRefreshed,
}: {
  session: SessionState | null
  onLogout: () => void
  onSessionRefreshed?: (next: SessionState) => void
}) {
  const [showWarning, setShowWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(120)
  const lastActiveRef = useRef(Date.now())
  const keepingAliveRef = useRef(false)

  // Track genuine user interaction
  const recordActivity = useCallback(() => {
    // Only update activity timestamp when not currently showing the warning modal
    if (!showWarning) {
      lastActiveRef.current = Date.now()
    }
  }, [showWarning])

  useEffect(() => {
    if (!session?.authenticated) return

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    const handler = () => recordActivity()
    for (const evt of events) {
      window.addEventListener(evt, handler, { passive: true })
    }

    const interval = setInterval(() => {
      const now = Date.now()
      const idleMs = now - lastActiveRef.current

      // Check absolute timeout if createdAt is known
      if (session.createdAt) {
        const absoluteAgeMs = now - new Date(session.createdAt).getTime()
        if (absoluteAgeMs >= ABSOLUTE_TIMEOUT_MS) {
          toast('error', 'Session reached 12-hour maximum lifetime. Please sign in again.')
          onLogout()
          return
        }
      }

      if (idleMs >= IDLE_TIMEOUT_MS) {
        setShowWarning(false)
        toast('error', 'Session expired due to 15 minutes of inactivity.')
        onLogout()
      } else if (idleMs >= WARNING_THRESHOLD_MS) {
        setShowWarning(true)
        setSecondsRemaining(Math.max(1, Math.ceil((IDLE_TIMEOUT_MS - idleMs) / 1000)))
      } else {
        if (showWarning) setShowWarning(false)
      }
    }, 1000)

    return () => {
      for (const evt of events) {
        window.removeEventListener(evt, handler)
      }
      clearInterval(interval)
    }
  }, [session, onLogout, showWarning, recordActivity])

  const keepAlive = useCallback(async () => {
    if (keepingAliveRef.current) return
    keepingAliveRef.current = true
    try {
      const next = await refreshSession()
      if (next.authenticated) {
        lastActiveRef.current = Date.now()
        setShowWarning(false)
        onSessionRefreshed?.(next)
        toast('success', 'Session renewed.')
      } else {
        onLogout()
      }
    } catch {
      onLogout()
    } finally {
      keepingAliveRef.current = false
    }
  }, [onLogout, onSessionRefreshed])

  return {
    showWarning,
    secondsRemaining,
    keepAlive,
  }
}

