/**
 * /admin application root — the Portfolio Control Center.
 *
 * Isolation: this module tree is only reachable through the lazy /admin
 * route — public chunks never include it (verified by scripts/verify-build).
 *
 * The session gate, password/Turnstile login, and logout flow are preserved
 * exactly (Phase 3 security behavior). The authenticated surface is now the
 * full Control Center: hash-routed views over the shared AdminDataProvider.
 */

import { useCallback, useEffect, useState } from 'react'
import { fetchSessionState, login, logout, type SessionState } from './authApi'
import { useTurnstile } from './useTurnstile'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon } from '@/components/ui/icons'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SiteVersion } from './SiteVersion'
import { MatrixDepthBackground } from './MatrixDepthBackground'
import { AdminDataProvider } from './AdminDataProvider'
import { AdminShell } from './AdminShell'
import { AdminRouterView } from './AdminRouterView'
import { ToastHost } from './ui/primitives'
import { useAdminRoute } from './routes'

type Phase = 'checking' | 'login' | 'ready'

export default function AdminApp() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [session, setSession] = useState<SessionState | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const route = useAdminRoute()

  const checkSession = useCallback(async () => {
    const state = await fetchSessionState()
    // Apply state after the await so the effect body never sets state
    // synchronously (react-hooks purity rule).
    queueMicrotask(() => {
      setSession(state)
      setPhase(state.authenticated ? 'ready' : 'login')
    })
  }, [])

  useEffect(() => {
    void checkSession()
  }, [checkSession])

  const handleLogout = useCallback(async () => {
    await logout()
    setSession(null)
    setPhase('login')
  }, [])

  if (phase === 'checking') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-void">
        <Spinner className="h-6 w-6 text-accent" />
      </div>
    )
  }

  if (phase === 'login' || !session?.authenticated) {
    return <LoginForm onSuccess={() => void checkSession()} />
  }

  return (
    <AdminDataProvider onAuthLost={() => void checkSession()}>
      <AdminShell
        view={route.view}
        onNavigate={(view) => route.navigate(view)}
        onLogout={() => void handleLogout()}
        sessionExpiresAt={session.expiresAt}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      >
        <AdminRouterView view={route.view} param={route.param} navigate={route.navigate} />
      </AdminShell>
      <ToastHost />
    </AdminDataProvider>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { containerRef, token, reset, approveDevTest, showDevFallback, widgetConfigured } = useTurnstile('admin-login')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!password || !token || submitting) return
    setSubmitting(true)
    setError('')
    const result = await login(password, token)
    setSubmitting(false)
    if (result.ok) {
      onSuccess()
    } else {
      setError(result.error ?? 'Authentication failed.')
      setPassword('')
      reset()
    }
  }

  return (
    <div className="admin-login relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-void px-5">
      <MatrixDepthBackground />
      <div className="relative mb-6 w-full max-w-sm">
        <Link
          to="/"
          className="group inline-flex items-center gap-1.5 rounded-full border border-edge bg-panel/60 py-1.5 pr-3.5 pl-2.5 text-xs text-mist transition-colors hover:border-edge-2 hover:text-frost"
        >
          <ChevronLeftIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden />
          Back to site
        </Link>
      </div>
      <form onSubmit={submit} className="relative w-full max-w-sm rounded-2xl border border-edge bg-panel/60 p-7">
        {/* Hidden username field: password-only login, but browsers/password
            managers expect a username sibling for `autocomplete="current-password"`
            to resolve (console: "Password forms should have (optionally hidden)
            username fields"). Never rendered or submitted — the login API is
            single-owner password auth and takes no username. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          defaultValue="admin"
          hidden
          readOnly
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 shrink-0">
            <img src="/favicon.svg" alt="" draggable={false} className="h-full w-full object-contain" />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Restricted</p>
            <h1 className="mt-0.5 text-lg font-semibold text-frost">Admin sign-in</h1>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Input
            label="Admin password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <div ref={containerRef} className="turnstile-container" />
          {showDevFallback && (
            <div className="space-y-1.5 rounded-lg border border-amber/40 bg-amber/8 px-3 py-2.5">
              <p className="text-xs leading-relaxed text-amber">
                {widgetConfigured
                  ? 'Turnstile widget is not responding (local browser).'
                  : 'This local build has no Turnstile site key.'}{' '}
                Local QA build — simulate a passed challenge. The login API still verifies the token
                server-side.
              </p>
              {approveDevTest && (
                <Button type="button" variant="outline" size="sm" onClick={approveDevTest}>
                  Simulate passed Turnstile (local QA)
                </Button>
              )}
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" size="md" className="w-full justify-center" disabled={!token || !password || submitting}>
            {submitting ? <Spinner className="h-4 w-4" /> : 'Sign in'}
          </Button>
        </div>
        <div className="mt-5 flex justify-center">
          <SiteVersion />
        </div>
      </form>
    </div>
  )
}
