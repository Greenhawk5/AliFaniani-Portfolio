/**
 * Turnstile widget hook for the admin login form — same script/render pattern
 * as the contact page, with action 'admin-login' (server-verified).
 * Admin-chunk-only module.
 */

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

export function useTurnstile(action: string) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [token, setToken] = useState('')

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        action,
        theme: 'dark',
        callback: (value: string) => setToken(value),
        'expired-callback': () => setToken(''),
        'error-callback': () => setToken(''),
      })
    }

    const script =
      document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]') ??
      (() => {
        const element = document.createElement('script')
        element.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        element.async = true
        element.defer = true
        element.dataset.turnstile = 'true'
        document.head.appendChild(element)
        return element
      })()
    script.addEventListener('load', render)
    if (window.turnstile) render()

    return () => {
      cancelled = true
      script.removeEventListener('load', render)
      // Remove the rendered widget from the DOM. Without this, React
      // StrictMode's mount→unmount→mount cycle (and any route transition)
      // leaves an orphaned iframe behind and Turnstile logs
      // "Cannot find Widget cf-chl-widget-…".
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [action])

  const reset = () => {
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current)
    setToken('')
  }

  return { containerRef, token, reset }
}
