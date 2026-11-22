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

import { useEffect, useRef, useState, useCallback } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

export type TurnstileStatus = 'idle' | 'loading' | 'ready' | 'success' | 'expired' | 'error'

/**
 * Public Cloudflare Turnstile site key for alifaniani.ir and localhost.
 * Public by definition — not a secret. Falls back to this verified key if
 * VITE_TURNSTILE_SITE_KEY was omitted during local/CLI builds.
 */
const FALLBACK_SITE_KEY = '0x4AAAAAAEaJ3GKT_GSYZE-7'
const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || FALLBACK_SITE_KEY

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
  const [status, setStatus] = useState<TurnstileStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [graceExpired, setGraceExpired] = useState(false)
  const [renderNonce, setRenderNonce] = useState(0)

  const renderWidget = useCallback(() => {
    if (!containerRef.current) return
    if (!SITE_KEY) {
      setStatus('error')
      setErrorMessage('Security configuration error: Cloudflare Turnstile site key is missing.')
      return
    }
    if (!window.turnstile) {
      setStatus('loading')
      return
    }
    if (widgetIdRef.current) return

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        action,
        theme: 'dark',
        callback: (value: string) => {
          setToken(value)
          setStatus('success')
          setErrorMessage(null)
        },
        'expired-callback': () => {
          setToken('')
          setStatus('expired')
          setErrorMessage('Verification expired. Please complete the security check again.')
        },
        'error-callback': (code?: string) => {
          setToken('')
          setStatus('error')
          setErrorMessage(
            code
              ? `Turnstile verification failed (code: ${code}). Please retry.`
              : 'Turnstile verification failed. Please check your connection or retry.'
          )
        },
      })
      setStatus('ready')
    } catch {
      setStatus('error')
      setErrorMessage('Failed to initialize the Cloudflare Turnstile widget.')
    }
  }, [action])

  useEffect(() => {
    let cancelled = false

    const onScriptLoad = () => {
      if (!cancelled) {
        renderWidget()
      }
    }

    const onScriptError = () => {
      if (!cancelled) {
        setStatus('error')
        setErrorMessage('Failed to load Cloudflare verification script. Check network or ad blocker.')
      }
    }

    let script = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]')
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.turnstile = 'true'
      document.head.appendChild(script)
    }

    script.addEventListener('load', onScriptLoad)
    script.addEventListener('error', onScriptError)

    if (window.turnstile) {
      queueMicrotask(() => {
        if (!cancelled) renderWidget()
      })
    }

    return () => {
      cancelled = true
      script?.removeEventListener('load', onScriptLoad)
      script?.removeEventListener('error', onScriptError)
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // ignore
        }
        widgetIdRef.current = null
      }
    }
  }, [action, renderWidget, renderNonce])

  // Dev-test builds only: surface the manual fallback when the widget cannot
  // deliver a token (no key in this build, or the widget hangs/errors).
  useEffect(() => {
    if (!DEV_TEST || token) return
    const timer = setTimeout(() => setGraceExpired(true), DEV_FALLBACK_GRACE_MS)
    return () => clearTimeout(timer)
  }, [token])

  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
      } catch {
        // ignore
      }
    }
    setToken('')
    setStatus('ready')
    setErrorMessage(null)
  }, [])

  const retry = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current)
      } catch {
        // ignore
      }
      widgetIdRef.current = null
    }
    setToken('')
    setStatus('loading')
    setErrorMessage(null)
    setRenderNonce((n) => n + 1)
  }, [])

  // Conditional closure: in production builds DEV_TEST folds to false, this
  // is `undefined`, and no code path references the marker token — so the
  // marker is tree-shaken out of the bundle entirely (asserted by
  // scripts/verify-build.mjs).
  const approveDevTest = DEV_TEST
    ? () => {
        setToken(DEV_TEST_TOKEN)
        setStatus('success')
      }
    : undefined

  return {
    containerRef,
    token,
    status,
    errorMessage,
    reset,
    retry,
    approveDevTest,
    showDevFallback: DEV_TEST && !token && (!SITE_KEY || graceExpired),
    widgetConfigured: !!SITE_KEY,
  }
}
