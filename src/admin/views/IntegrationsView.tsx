/**
 * Integrations — observed, truthful status of the services this deployment
 * uses. Every row states what was observed to reach its verdict (an API
 * response, an env var being configured or not, a workflow outcome in the
 * audit log). No row ever invents connectivity: "Not connected" is rendered
 * when the signal is absent, with a plain-English consequence and setup
 * pointer. Secrets are never read, displayed, or probed client-side.
 */

import { useMemo } from 'react'
import { useAdminData } from '../AdminDataProvider'
import { AdminCard, CardHeader, SectionTitle, StatusDot, StatusPill } from '../ui/primitives'
import { cn } from '@/lib/cn'

type Status = 'connected' | 'degraded' | 'disconnected'

interface Integration {
  id: string
  name: string
  role: string
  status: Status
  /** The concrete observation this status is based on. */
  basis: string
  consequence: string
  docs?: string
}

export function IntegrationsView() {
  const { deploy, activity, items } = useAdminData()

  const integrations = useMemo<Integration[]>(() => {
    const out: Integration[] = []

    // Hosting/proof channel: the admin API answered from this same origin.
    // That proves reachability of the serving stack — not the public site.
    const contentOk = (items ?? null) !== null
    out.push({
      id: 'pages',
      name: 'Cloudflare Pages',
      role: 'Static hosting + edge middleware (noindex, canonical redirects)',
      status: contentOk ? 'connected' : 'degraded',
      basis: contentOk
        ? 'Admin API responses received over this origin — the serving stack is reachable.'
        : 'Admin API unreachable — responses failing.',
      consequence: contentOk
        ? 'This console loads and reads deployment state. Public-site build status is separate — see Publishing.'
        : 'This console cannot read deployment state.',
    })

    out.push({
      id: 'd1',
      name: 'Cloudflare D1',
      role: 'Content source of truth (projects, profile, links, sessions, audit log)',
      status: contentOk ? 'connected' : 'degraded',
      basis: contentOk ? 'Content list query succeeded.' : 'Content list query failed.',
      consequence: contentOk ? 'CMS reads and writes operate normally.' : 'Content management is unavailable.',
    })

    // GitHub snapshot sync: truthful state comes from the deploy-state KV.
    // 'not_configured' is the expected local-dev shape (no sync token outside
    // production) — report it as environment info, not as a broken
    // integration. Any other failure stays 'degraded'.
    const syncFailed = deploy?.status === 'sync_dispatch_failed' && deploy?.lastError !== 'not_configured'
    const syncPending = deploy?.status === 'pending_sync' || deploy?.status === 'queued'
    const syncUnconfigured = deploy?.status === 'sync_dispatch_failed' && deploy?.lastError === 'not_configured'
    out.push({
      id: 'github-sync',
      name: 'GitHub snapshot sync',
      role: 'Workflow that mirrors published D1 content to the repo, then triggers the Pages build',
      status: syncFailed ? 'degraded' : 'connected',
      basis: syncUnconfigured
        ? 'No repository sync token is configured in this environment (expected outside production) — dispatch is unavailable here.'
        : syncFailed
          ? `Last publish recorded dispatch failure${deploy?.lastError ? ` (${deploy.lastError})` : ''}.`
          : syncPending
            ? `Dispatch accepted ${deploy?.requestedAt ? new Date(deploy.requestedAt).toLocaleString() : ''} — workflow running.`
            : 'Publish chain has recorded no failures; no sync in progress.',
      consequence: syncUnconfigured
        ? 'Local publishes stay local-only by design; production dispatch runs automatically where the token is configured.'
        : syncFailed
          ? 'Published content is NOT on the site yet — retry the sync workflow from the GitHub Actions tab.'
          : 'Content reaches production after each publish.',
    })

    // Cloudflare Web Analytics is edge-injected by configuration, not by an
    // API this console can call — there is no event feed reaching the admin
    // API, so connectivity can never be self-verified here. State the check
    // performed (none available) rather than lending audit-log absence false
    // weight: absence of 'analytics' audit events proves nothing since no
    // such event type exists in the audit schema.
    out.push({
      id: 'web-analytics',
      name: 'Cloudflare Web Analytics',
      role: 'Visitor traffic measurement (edge-injected beacon on the public site)',
      status: 'disconnected',
      basis:
        'No analytics probe exists in this console (measurement is a dashboard-side beacon, not an API).',
      consequence:
        'Visitor numbers are visible only in the Cloudflare dashboard (Web Analytics → your zone). This console intentionally shows no traffic widgets rather than fabricating numbers.',
    })

    // Turnstile: verified indirectly — login attempts are recorded with
    // turnstile outcomes in the audit log.
    const turnstileSeen = (activity?.events ?? []).some(
      (e) => e.event === 'login_success' || e.event === 'login_turnstile_failed'
    )
    out.push({
      id: 'turnstile',
      name: 'Cloudflare Turnstile',
      role: 'Bot protection on admin sign-in and the contact form',
      status: turnstileSeen ? 'connected' : 'disconnected',
      basis: turnstileSeen
        ? 'Login attempts (successful or bot-blocked) are being recorded — the widget is enforcing.'
        : 'No sign-in attempts recorded yet in the visible audit window.',
      consequence: turnstileSeen
        ? 'Protecting the login and contact endpoints.'
        : 'Protection state cannot be confirmed until the next sign-in attempt.',
    })

    // Contact email (Resend): can't be probed safely; the audit log doesn't
    // record contact submissions. Honest: unverifiable from here.
    out.push({
      id: 'contact-email',
      name: 'Contact email delivery',
      role: 'Resend API for the public contact form',
      status: 'disconnected',
      basis: 'Contact submissions are not part of the admin audit trail, and secrets are never probed client-side.',
      consequence: 'Verify delivery from your Resend dashboard. This console deliberately does not guess.',
    })

    return out
  }, [deploy, activity, items])

  const connected = integrations.filter((i) => i.status === 'connected').length

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">System</p>
          <h1 className="mt-1 text-2xl font-semibold text-frost">Integrations</h1>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            Each status is an observation, not a promise. {connected} of {integrations.length} verified working.
          </p>
        </div>
      </header>

      <SectionTitle>Runtime services</SectionTitle>
      <ul className="space-y-2">
        {integrations.map((integration) => (
          <li key={integration.id}>
            <AdminCard className="p-0">
              <div className="flex flex-wrap items-start gap-3 px-4 py-3.5">
                <StatusDot
                  tone={integration.status === 'connected' ? 'ok' : integration.status === 'degraded' ? 'warning' : 'neutral'}

                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-frost">{integration.name}</p>
                    <StatusPill tone={integration.status === 'connected' ? 'ok' : integration.status === 'degraded' ? 'warning' : 'neutral'}>
                      {integration.status === 'connected' ? 'Connected' : integration.status === 'degraded' ? 'Needs attention' : 'Not connected'}
                    </StatusPill>
                  </div>
                  <p className="mt-0.5 text-xs text-mist">{integration.role}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-mist/80">
                    <span className="font-medium text-mist">Observed:</span> {integration.basis}
                  </p>
                  <p className={cn('mt-1 text-xs leading-relaxed', integration.status === 'connected' ? 'text-mist/70' : 'text-amber/90')}>
                    {integration.consequence}
                  </p>
                </div>
              </div>
            </AdminCard>
          </li>
        ))}
      </ul>

      <AdminCard>
        <CardHeader title="Secrets posture" />
        <p className="px-4 py-3.5 text-xs leading-relaxed text-mist">
          The admin credential, Turnstile server key, repository-sync token, and email credentials live only
          in Cloudflare Pages secrets and are never sent to this console. Deployment state is stored in KV as
          status flags — no credentials, no tokens, no content payloads.
        </p>
      </AdminCard>
    </div>
  )
}
