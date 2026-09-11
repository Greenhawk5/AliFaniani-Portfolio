/**
 * /admin application root (Phase 3 foundation).
 *
 * Isolation: this module tree is only reachable through the lazy /admin
 * route — public chunks never include it (verified by scripts/verify-build).
 *
 * Phase 3 scope: session gate + password/Turnstile login + logout. CMS CRUD
 * surfaces arrive in Phase 4; the placeholder panel only proves auth state.
 */

import { useCallback, useEffect, useState } from 'react'
import { fetchSessionState, login, logout, type SessionState } from './authApi'
import { useTurnstile } from './useTurnstile'
import { CmsView } from './CmsView'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SiteVersion } from './SiteVersion'

type Phase = 'checking' | 'login' | 'ready'

export default function AdminApp() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [session, setSession] = useState<SessionState | null>(null)

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
    <div className="min-h-dvh bg-void px-5 py-8 text-frost">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between border-b border-edge pb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Admin</p>
            <h1 className="mt-1 text-xl font-semibold">Content console</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => void logout().then(() => void checkSession())}>
            Log out
          </Button>
        </header>
        <CmsView />
        <SiteVersion />
      </div>
    </div>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { containerRef, token, reset } = useTurnstile('admin-login')

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
    <div className="flex min-h-dvh items-center justify-center bg-void px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-edge bg-panel/60 p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">Restricted</p>
        <h1 className="mt-2 text-lg font-semibold text-frost">Admin sign-in</h1>

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
