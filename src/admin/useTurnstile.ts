/**
 * Turnstile widget hook for the admin login form — same script/render pattern
 * as the contact page, with action 'admin-login' (server-verified).
 * Admin-chunk-only module.
 *
 * Local QA support (production behavior is unchanged):
 *   Production Pages builds always bake VITE_TURNSTILE_SITE_KEY, so the real
 *   widget renders and everything below about the dev fallback is
 *   constant-folded away (verify-build.mjs asserts the marker never reaches
 *   production bundles). A LOCAL build made with
 *   VITE_ADMIN_TURNSTILE_DEV_TEST=1 exposes a manual "simulate passed
 *   challenge" fallback when the real widget cannot deliver a token — e.g. a
 *   local dist built without a site key, or a browser that suspends the
 *   cross-origin challenge iframe. The fallback only fills a fixed marker
 *   token; the login API still runs the full siteverify check against
 *   TURNSTILE_SECRET, so with the real production secret this token is
 *   rejected like any forged token. (With Cloudflare's official dummy test
 *   secret in .dev.vars, ANY token passes by documented design — that is
 *   Cloudflare's own test configuration.)
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

/** Local-QA-only build flag — never set in the Cloudflare Pages environment. */
const DEV_TEST = import.meta.env.VITE_ADMIN_TURNSTILE_DEV_TEST === '1'

/**
 * Marker token for the local-QA fallback. Not a secret, not a credential:
 * the login API verifies every token against TURNSTILE_SECRET via siteverify.
 */
const DEV_TEST_TOKEN = 'dev-local-turnstile-pass'

/** How long a dev-test build waits for the real widget before offering the fallback. */
const DEV_FALLBACK_GRACE_MS = 7000

export function useTurnstile(action: string) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [token, setToken] = useState('')
  const [graceExpired, setGraceExpired] = useState(false)

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

  // Dev-test builds only: surface the manual fallback when the widget cannot
  // deliver a token (no key in this build, or the widget hangs/errors).
  useEffect(() => {
    if (!DEV_TEST || token) return
    const timer = setTimeout(() => setGraceExpired(true), DEV_FALLBACK_GRACE_MS)
    return () => clearTimeout(timer)
  }, [token])

  const reset = () => {
    if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current)
    setToken('')
  }

  // Conditional closure: in production builds DEV_TEST folds to false, this
  // is `undefined`, and no code path references the marker token — so the
  // marker is tree-shaken out of the bundle entirely (asserted by
  // scripts/verify-build.mjs).
  const approveDevTest = DEV_TEST
    ? () => {
        setToken(DEV_TEST_TOKEN)
      }
    : undefined

  return {
    containerRef,
    token,
    reset,
    approveDevTest,
    showDevFallback: DEV_TEST && !token && (!SITE_KEY || graceExpired),
    widgetConfigured: !!SITE_KEY,
  }
}
