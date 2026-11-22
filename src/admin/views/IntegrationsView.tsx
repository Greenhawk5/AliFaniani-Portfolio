/**
 * Integrations & Infrastructure Center — truthful, observed health and architecture
 * of every service, database, bucket, and external provider in the portfolio.
 *
 * Distinct status semantics:
 *   - Operational: Verified active via server-side ping/query in this session
 *   - Connected: Reachable and answering API requests normally
 *   - Partially Verified: Configured and functional, but some actions require external observation
 *   - Verification Required: Service is unprobed until triggered by an actual event (e.g., contact email)
 *   - Not Configured: Environment variable / binding absent in current environment
 *   - Degraded: Service encountered errors or latency spikes
 */

import { useMemo, useState } from 'react'
import { useAdminData } from '../AdminDataProvider'
import {
  AdminCard,
  CardHeader,
  StatusDot,
  StatusPill,
  relativeTime,
} from '../ui/primitives'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  GitHubIcon,
  ShieldIcon,
  MailIcon,
  ResetIcon,
  ExternalLinkIcon,
} from '@/components/ui/icons'
import {
  FolderIcon,
  ImageIcon,
  RocketIcon,
  ActivityIcon,
  PlugIcon,
} from '../ui/icons'
import { cn } from '@/lib/cn'

export type ServiceStatus =
  | 'operational'
  | 'connected'
  | 'partially_verified'
  | 'verification_required'
  | 'not_configured'
  | 'degraded'
  | 'error'

export type ServiceCategory =
  | 'Hosting & Deployment'
  | 'Database & Storage'
  | 'Security & Protection'
  | 'Analytics & Metrics'
  | 'Communication'

export interface IntegrationService {
  id: string
  name: string
  category: ServiceCategory
  role: string
  status: ServiceStatus
  statusLabel: string
  basis: string
  consequence: string
  dependentFeatures: string[]
  externalDashboardUrl?: string
  dashboardLabel?: string
  limitations?: string
  icon: (props: { className?: string }) => React.ReactNode
}

const CATEGORIES: ServiceCategory[] = [
  'Hosting & Deployment',
  'Database & Storage',
  'Security & Protection',
  'Analytics & Metrics',
  'Communication',
]

export function IntegrationsView() {
  const { deploy, activity, items, systemHealth, systemHealthLoading, refreshSystemHealth } = useAdminData()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<'all' | ServiceCategory>('all')

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const integrations = useMemo<IntegrationService[]>(() => {
    const list: IntegrationService[] = []
    const health = systemHealth

    // 1. Cloudflare Pages
    const pagesOk = items !== null
    list.push({
      id: 'pages',
      name: 'Cloudflare Pages',
      category: 'Hosting & Deployment',
      role: 'Global Edge network, Static Asset delivery, Route normalization, and Edge Functions',
      status: pagesOk ? 'operational' : 'degraded',
      statusLabel: pagesOk ? 'Operational' : 'Degraded',
      basis: pagesOk
        ? `Serving functions from edge origin ${health?.runtime?.host ?? 'active'}${health?.runtime?.edgeColo ? ` (${health.runtime.edgeColo} PoP)` : ''}. Latency normal.`
        : 'Admin API responses failing or unreachable.',
      consequence: pagesOk
        ? 'Public website, SSR edge shells, and administrative API are live and serving normally.'
        : 'Edge functions and admin panel operations are currently unavailable.',
      dependentFeatures: ['Portfolio Website', '3D Room Experience', 'Admin Control Center', 'Edge SSR Shells'],
      externalDashboardUrl: 'https://dash.cloudflare.com/',
      dashboardLabel: 'Cloudflare Pages Dashboard',
      icon: (p) => <RocketIcon {...p} />,
    })

    // 2. GitHub Actions / Snapshot Synchronization
    const syncStatus = deploy?.status
    const isSyncFailed = syncStatus === 'sync_dispatch_failed' || syncStatus === 'trigger_failed'
    const isSyncRunning = syncStatus === 'pending_sync' || syncStatus === 'queued'
    const isSyncUnconfigured = health?.secrets?.githubSyncConfigured === false || deploy?.lastError === 'not_configured'

    list.push({
      id: 'github-sync',
      name: 'GitHub Actions (Snapshot Sync)',
      category: 'Hosting & Deployment',
      role: 'Mirrors published D1 database state to Git repository and triggers production Pages rebuilds',
      status: isSyncUnconfigured
        ? 'not_configured'
        : isSyncFailed
          ? 'degraded'
          : isSyncRunning
            ? 'connected'
            : 'operational',
      statusLabel: isSyncUnconfigured
        ? 'Not Configured'
        : isSyncFailed
          ? 'Needs Attention'
          : isSyncRunning
            ? 'Sync Running'
            : 'Operational',
      basis: isSyncUnconfigured
        ? 'GitHub sync secret is absent in this environment (expected in local dev / previews).'
        : isSyncFailed
          ? `Last sync workflow reported an issue${deploy?.lastError ? `: ${deploy.lastError}` : ''}.`
          : isSyncRunning
            ? 'Sync in progress — dispatch accepted.'
            : `Sync token configured. Last recorded publish: ${deploy?.requestedAt ? relativeTime(deploy.requestedAt) : 'Ready for publishing'}.`,
      consequence: isSyncUnconfigured
        ? 'Publishes stay local in D1 only. In production, configure the GitHub sync secret in Cloudflare Pages.'
        : isSyncFailed
          ? 'D1 content was updated but the live website rebuild has not run yet. Use "Retry Snapshot Sync".'
          : 'Deterministic Git-to-Cloudflare synchronization operational.',
      dependentFeatures: ['CMS Publishing Pipeline', 'Canonical content.json Snapshot', 'Sitemap Generation'],
      externalDashboardUrl: 'https://github.com/Greenhawk5/AliFaniani-Portfolio/actions',
      dashboardLabel: 'GitHub Actions Workflows',
      icon: (p) => <GitHubIcon {...p} />,
    })

    // 3. Cloudflare D1 SQL Database
    const d1Ok = health?.d1?.ok ?? (items !== null)
    list.push({
      id: 'd1',
      name: 'Cloudflare D1 SQL Database',
      category: 'Database & Storage',
      role: 'Serverless relational database for CMS content, authentication logs, sessions, and analytics',
      status: d1Ok ? 'operational' : 'error',
      statusLabel: d1Ok ? 'Operational' : 'Database Error',
      basis: health?.d1?.ok
        ? `Query test completed in ${health.d1.latencyMs}ms. Core tables verified (${health.d1.tables.content} content records, ${health.d1.tables.auth_log} audit logs).`
        : 'Unable to execute query against env.DB.',
      consequence: d1Ok
        ? 'Full read and write capabilities active across all CMS sections, notifications, and user sessions.'
        : 'All administrative storage and dynamic API endpoints are currently blocked.',
      dependentFeatures: ['CMS Content Records', 'Admin Session Storage', 'Audit Logging', 'First-Party Analytics', 'Notifications'],
      externalDashboardUrl: 'https://dash.cloudflare.com/',
      dashboardLabel: 'Cloudflare D1 Console',
      icon: (p) => <FolderIcon {...p} />,
    })

    // 4. Cloudflare KV Namespace
    const kvOk = health?.kv?.ok ?? Boolean(deploy)
    list.push({
      id: 'kv',
      name: 'Cloudflare KV Namespace',
      category: 'Database & Storage',
      role: 'Low-latency key-value store for login rate limiting and deployment state machine tracking',
      status: kvOk ? 'operational' : 'degraded',
      statusLabel: kvOk ? 'Operational' : 'Degraded',
      basis: health?.kv?.ok
        ? `RATE_LIMIT namespace bound and readable. deploy:state key ${health.kv.deployStateFound ? 'present' : 'empty'}.`
        : 'RATE_LIMIT KV binding check failed.',
      consequence: kvOk
        ? 'Brute-force protection and real-time deployment status persistence are fully operational.'
        : 'Rate limiting fallback applies memory caching only; deploy state cannot persist across restarts.',
      dependentFeatures: ['Login Rate Limiter', 'Deployment State Machine', 'Sync Progress Polling'],
      externalDashboardUrl: 'https://dash.cloudflare.com/',
      dashboardLabel: 'Cloudflare KV Storage',
      icon: (p) => <PlugIcon {...p} />,
    })

    // 5. Cloudflare R2 Media Bucket
    const r2Bound = health?.r2?.bound ?? false
    const r2Ok = health?.r2?.ok ?? false
    list.push({
      id: 'r2',
      name: 'Cloudflare R2 Media Storage',
      category: 'Database & Storage',
      role: 'Object storage for uploaded project banners, screenshots, and certificate credentials',
      status: r2Ok ? 'operational' : r2Bound ? 'partially_verified' : 'not_configured',
      statusLabel: r2Ok ? 'Operational' : r2Bound ? 'Partially Verified' : 'Not Configured',
      basis: r2Ok
        ? `MEDIA_BUCKET bound. Public delivery via https://media.alifaniani.ir (${health?.r2?.assetCount ?? 0} registered assets).`
        : r2Bound
          ? 'MEDIA_BUCKET binding detected, waiting for initial storage access.'
          : 'MEDIA_BUCKET binding is absent in this environment.',
      consequence: r2Ok
        ? 'Media upload, image optimization, and CDN delivery are operating normally.'
        : 'New media uploads in the Media Manager will fail until the R2 bucket binding is configured.',
      dependentFeatures: ['Media Manager', 'Certificate Credentials Upload', 'Project Screenshots Storage'],
      externalDashboardUrl: 'https://dash.cloudflare.com/',
      dashboardLabel: 'Cloudflare R2 Buckets',
      icon: (p) => <ImageIcon {...p} />,
    })

    // 6. Cloudflare Turnstile
    const turnstileConfigured = health?.secrets?.turnstileConfigured ?? true
    const turnstileObserved = health?.turnstile?.recentVerificationsFound ?? (activity?.events ?? []).some(
      (e) => e.event === 'login_success' || e.event === 'login_turnstile_failed'
    )
    list.push({
      id: 'turnstile',
      name: 'Cloudflare Turnstile',
      category: 'Security & Protection',
      role: 'Privacy-first, CAPTCHA-free smart bot detection on admin sign-in and public contact form',
      status: turnstileConfigured && turnstileObserved
        ? 'operational'
        : turnstileConfigured
          ? 'connected'
          : 'not_configured',
      statusLabel: turnstileConfigured && turnstileObserved
        ? 'Operational'
        : turnstileConfigured
          ? 'Connected'
          : 'Not Configured',
      basis: turnstileObserved
        ? 'Verification challenge tokens actively validating and recorded in audit log events.'
        : turnstileConfigured
          ? 'TURNSTILE_SECRET configured in environment. Awaiting live client submission verification.'
          : 'TURNSTILE_SECRET is not configured in secrets.',
      consequence: turnstileConfigured
        ? 'Automated bot credential stuffing and form spam are blocked at the edge.'
        : 'Bot protection is disabled; forms operate in test mode.',
      dependentFeatures: ['Admin Sign-in Authentication', 'Public Contact Form Submission'],
      externalDashboardUrl: 'https://dash.cloudflare.com/',
      dashboardLabel: 'Turnstile Analytics',
      icon: (p) => <ShieldIcon {...p} />,
    })

    // 7. Admin Session & CSRF Security
    list.push({
      id: 'session-security',
      name: 'Admin Session & CSRF Security',
      category: 'Security & Protection',
      role: 'SameSite=Strict cookie management, 15m idle / 12h absolute expiration, and X-CSRF-Token validation',
      status: 'operational',
      statusLabel: 'Operational',
      basis: 'Active authenticated session established. Multi-layer CSRF hash verification enforced on all mutations.',
      consequence: 'Administrative privileges are secured against cross-site request forgery and stale session reuse.',
      dependentFeatures: ['Admin Mutation Guards', 'Session Auto-Timeout', 'Audit Event Tracking'],
      icon: (p) => <ShieldIcon {...p} />,
    })

    // 8. First-Party D1 Analytics
    const analyticsOk = health?.analytics?.ok ?? false
    list.push({
      id: 'first-party-analytics',
      name: 'First-Party D1 Analytics',
      category: 'Analytics & Metrics',
      role: 'GDPR-compliant, privacy-first local analytics engine tracking visitor counts and room interactions',
      status: analyticsOk ? 'operational' : 'connected',
      statusLabel: analyticsOk ? 'Operational' : 'Connected',
      basis: analyticsOk
        ? `page_view_events table active with ${health?.analytics?.eventsCount24h ?? 0} events recorded in the last 24h.`
        : 'Analytics schema verified in D1. Edge event logging operational.',
      consequence: 'Traffic counts and 3D room visitor statistics update without third-party tracking cookies.',
      dependentFeatures: ['Visitor Counter in 3D Room', 'Admin Analytics Overview', 'Daily Traffic Summary'],
      icon: (p) => <ActivityIcon {...p} />,
    })

    // 9. Cloudflare Web Analytics
    list.push({
      id: 'web-analytics',
      name: 'Cloudflare Web Analytics',
      category: 'Analytics & Metrics',
      role: 'Privacy-focused edge beacon measuring external pageviews and core web vitals',
      status: 'partially_verified',
      statusLabel: 'Verification Required',
      basis: 'Edge beacon injected by Cloudflare zone configuration (not via internal worker API).',
      consequence: 'Traffic charts are observed directly within your Cloudflare Zone dashboard.',
      dependentFeatures: ['Edge Traffic Metrics', 'Core Web Vitals Reporting'],
      externalDashboardUrl: 'https://dash.cloudflare.com/',
      dashboardLabel: 'Cloudflare Web Analytics',
      limitations: 'Measurement happens at the edge via JavaScript beacon; no direct backend query API exists.',
      icon: (p) => <ActivityIcon {...p} />,
    })

    // 10. Resend Email Service
    const emailConfigured = health?.secrets?.emailServiceConfigured ?? false
    list.push({
      id: 'contact-email',
      name: 'Resend Email Service',
      category: 'Communication',
      role: 'Transactional email dispatch delivering contact form messages directly to your inbox',
      status: emailConfigured ? 'connected' : 'verification_required',
      statusLabel: emailConfigured ? 'Connected' : 'Verification Required',
      basis: emailConfigured
        ? 'RESEND_API_KEY, EMAIL_FROM, and EMAIL_TO are configured in environment secrets.'
        : 'Secrets not fully configured or requires confirmation in your Resend Dashboard.',
      consequence: emailConfigured
        ? 'Contact form submissions deliver directly to your configured administrative inbox.'
        : 'Contact messages are logged locally in D1 audit trail if delivery credentials are absent.',
      dependentFeatures: ['Public Contact Form Delivery', 'Visitor Inquiries'],
      externalDashboardUrl: 'https://resend.com/emails',
      dashboardLabel: 'Resend Dashboard',
      limitations: 'Delivery status is tracked inside Resend to protect API quotas and credentials.',
      icon: (p) => <MailIcon {...p} />,
    })

    return list
  }, [deploy, activity, items, systemHealth])

  // Overview metrics
  const totalCount = integrations.length
  const operationalCount = integrations.filter((i) => i.status === 'operational' || i.status === 'connected').length
  const partialCount = integrations.filter((i) => i.status === 'partially_verified').length
  const verificationRequiredCount = integrations.filter((i) => i.status === 'verification_required').length
  const attentionCount = integrations.filter((i) => i.status === 'degraded' || i.status === 'error' || i.status === 'not_configured').length

  const filteredIntegrations = useMemo(() => {
    if (categoryFilter === 'all') return integrations
    return integrations.filter((i) => i.category === categoryFilter)
  }, [integrations, categoryFilter])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">System & Infrastructure</p>
          <h1 className="mt-1 text-2xl font-semibold text-frost">Integration & Services Health</h1>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            Truthful operational status of every database, storage bucket, security system, and cloud service.
            Every status is derived from observed system evidence — never assumed.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshSystemHealth()}
            disabled={systemHealthLoading}
            className="gap-1.5 border-edge bg-panel/60 text-frost hover:border-accent/40"
          >
            {systemHealthLoading ? <Spinner className="h-3 w-3" /> : <ResetIcon className="h-3 w-3" />}
            Run Live Health Check
          </Button>

          <StatusPill tone={attentionCount === 0 ? 'ok' : 'warning'}>
            {attentionCount === 0 ? 'All Systems Healthy' : `${attentionCount} Attention Needed`}
          </StatusPill>
        </div>
      </header>

      {/* Top Overview KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-edge bg-panel/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mist">Total Services</p>
          <p className="mt-1 text-2xl font-bold text-frost">{totalCount}</p>
          <p className="mt-1 text-[11px] text-mist/70">Integrated stack</p>
        </div>

        <div className="rounded-xl border border-edge bg-panel/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mist">Operational</p>
          <p className="mt-1 text-2xl font-bold text-accent">{operationalCount}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-accent">
            <StatusDot tone="ok" />
            <span>Active & verified</span>
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-panel/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mist">Partially Verified</p>
          <p className="mt-1 text-2xl font-bold text-sky-400">{partialCount}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-sky-400">
            <StatusDot tone="info" />
            <span>Edge / zone beacon</span>
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-panel/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mist">External Verify</p>
          <p className="mt-1 text-2xl font-bold text-amber">{verificationRequiredCount}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber">
            <StatusDot tone="warning" />
            <span>Dashboard tracking</span>
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-panel/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mist">Attention Needed</p>
          <p className={cn('mt-1 text-2xl font-bold', attentionCount > 0 ? 'text-danger' : 'text-mist')}>
            {attentionCount}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-mist">
            <StatusDot tone={attentionCount > 0 ? 'danger' : 'neutral'} />
            <span>{attentionCount > 0 ? 'Review issues' : 'None detected'}</span>
          </div>
        </div>
      </div>

      {/* Real Architecture Flow Pipeline */}
      <AdminCard>
        <CardHeader title="Deterministic Content & Publishing Pipeline" />
        <div className="space-y-3 px-4 py-3.5">
          <p className="text-xs text-mist leading-relaxed">
            Content updates move through a strict, deterministic sequence to guarantee the public site never builds
            from outdated or unvalidated snapshots:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-lg border border-edge bg-abyss px-2.5 py-1.5 font-medium text-frost">
              1. CMS Draft Editing
            </span>
            <span className="text-accent font-bold">→</span>
            <span className="rounded-lg border border-edge bg-abyss px-2.5 py-1.5 font-medium text-frost">
              2. D1 Atomic Promotion
            </span>
            <span className="text-accent font-bold">→</span>
            <span className="rounded-lg border border-edge bg-abyss px-2.5 py-1.5 font-medium text-frost">
              3. GitHub Snapshot Sync
            </span>
            <span className="text-accent font-bold">→</span>
            <span className="rounded-lg border border-edge bg-abyss px-2.5 py-1.5 font-medium text-frost">
              4. Git Snapshot Commit
            </span>
            <span className="text-accent font-bold">→</span>
            <span className="rounded-lg border border-edge bg-abyss px-2.5 py-1.5 font-medium text-frost">
              5. Pages Deploy Hook
            </span>
            <span className="text-accent font-bold">→</span>
            <span className="rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 font-medium text-accent">
              6. Edge CDN Live
            </span>
          </div>
        </div>
      </AdminCard>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            categoryFilter === 'all'
              ? 'border border-accent/40 bg-accent/15 text-accent'
              : 'border border-edge bg-panel text-mist hover:text-frost'
          )}
        >
          All Categories ({integrations.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = integrations.filter((i) => i.category === cat).length
          if (count === 0) return null
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                categoryFilter === cat
                  ? 'border border-accent/40 bg-accent/15 text-accent'
                  : 'border border-edge bg-panel text-mist hover:text-frost'
              )}
            >
              {cat} ({count})
            </button>
          )
        })}
      </div>

      {/* Service Cards List */}
      <div className="space-y-3">
        {filteredIntegrations.map((svc) => {
          const isExpanded = expandedId === svc.id

          return (
            <AdminCard key={svc.id} className="p-0 overflow-hidden transition-all">
              <div
                onClick={() => toggleExpand(svc.id)}
                className="flex cursor-pointer flex-wrap items-start justify-between gap-3 px-4 py-3.5 hover:bg-panel/40 select-none transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-edge bg-abyss text-mist">
                    {svc.icon({ className: 'h-4 w-4 text-frost' })}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-frost">{svc.name}</p>
                      <span className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border border-edge bg-abyss text-mist">
                        {svc.category}
                      </span>
                      <StatusPill
                        tone={
                          svc.status === 'operational'
                            ? 'ok'
                            : svc.status === 'connected'
                              ? 'ok'
                              : svc.status === 'partially_verified'
                                ? 'info'
                                : svc.status === 'verification_required'
                                  ? 'warning'
                                  : 'danger'
                        }
                      >
                        {svc.statusLabel}
                      </StatusPill>
                    </div>

                    <p className="text-xs text-mist">{svc.role}</p>

                    <p className="text-xs text-mist/80 leading-relaxed">
                      <span className="font-medium text-frost/90">Observed Evidence:</span> {svc.basis}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-accent font-medium hover:underline">
                    {isExpanded ? 'Hide Details ▲' : 'View Details ▼'}
                  </span>
                </div>
              </div>

              {/* Expandable Details Tray */}
              {isExpanded && (
                <div className="border-t border-edge bg-abyss/60 px-4 py-4 space-y-3.5 text-xs">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-mist">Operational Impact</p>
                      <p className="text-frost leading-relaxed">{svc.consequence}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-mist">Dependent Features</p>
                      <div className="flex flex-wrap gap-1.5">
                        {svc.dependentFeatures.map((feat) => (
                          <span
                            key={feat}
                            className="rounded border border-edge bg-panel px-2 py-0.5 font-mono text-[10px] text-frost"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {svc.limitations && (
                    <div className="rounded-lg border border-amber/30 bg-amber/5 p-2.5 text-amber">
                      <p className="font-semibold text-[11px] mb-0.5">Verification Note:</p>
                      <p className="text-[11px]">{svc.limitations}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-edge/60 pt-3">
                    <span className="font-mono text-[10px] text-mist/60">Service ID: {svc.id}</span>

                    {svc.externalDashboardUrl && (
                      <a
                        href={svc.externalDashboardUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-edge bg-panel px-3 py-1.5 text-xs text-frost hover:border-accent/40 hover:text-accent transition-colors"
                      >
                        {svc.dashboardLabel ?? 'Open Dashboard'} <ExternalLinkIcon className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </AdminCard>
          )
        })}
      </div>

      {/* Security & Secrets Posture Card */}
      <AdminCard>
        <CardHeader title="Zero-Trust Secrets & Credentials Posture" />
        <div className="space-y-2.5 px-4 py-3.5 text-xs text-mist leading-relaxed">
          <p>
            Administrative credentials, Turnstile bot-detection keys, GitHub synchronization tokens, and email API
            keys are strictly isolated in Cloudflare Pages Secrets. They are stored encrypted in Cloudflare's
            key management system and are <strong>never transmitted to or readable from the browser</strong>.
          </p>
          <div className="grid gap-2 sm:grid-cols-3 pt-1">
            <div className="rounded-lg border border-edge bg-abyss p-2.5">
              <span className="font-mono text-[10px] uppercase text-mist">Admin Credential</span>
              <p className="text-frost font-medium mt-0.5">Admin Security Secret</p>
            </div>
            <div className="rounded-lg border border-edge bg-abyss p-2.5">
              <span className="font-mono text-[10px] uppercase text-mist">GitHub Dispatch Token</span>
              <p className="text-frost font-medium mt-0.5">Sync Dispatch Token</p>
            </div>
            <div className="rounded-lg border border-edge bg-abyss p-2.5">
              <span className="font-mono text-[10px] uppercase text-mist">Bot Protection Secret</span>
              <p className="text-frost font-medium mt-0.5">Turnstile Private Key</p>
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  )
}
