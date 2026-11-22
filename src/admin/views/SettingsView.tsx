/**
 * Settings Center — Comprehensive administrative settings, session controls,
 * runtime infrastructure posture, content pipeline configuration, and secrets directory.
 *
 * Truthful, read-only system information clearly distinguished from
 * actionable session controls and external Cloudflare dashboard pointers.
 */

import { useState } from 'react'
import { useAdminData } from '../AdminDataProvider'
import {
  AdminCard,
  CardHeader,
  SectionTitle,
  StatusPill,
  AdminNotice,
  AdminModal,
  relativeTime,
  absoluteTime,
  toast,
} from '../ui/primitives'
import { Button } from '@/components/ui/Button'
import { SiteVersion } from '../SiteVersion'
import { APP_VERSION } from '@/version'
import { SITE } from '@/app/config'
import { formatRelative } from '../lib/format'
import {
  CopyIcon,
  CheckIcon,
} from '@/components/ui/icons'
import {
  RocketIcon,
  FolderIcon,
  PlugIcon,
  ImageIcon,
} from '../ui/icons'
import { logout } from '../authApi'
import { cn } from '@/lib/cn'

type SettingsTab =
  | 'session'
  | 'application'
  | 'publishing'
  | 'infrastructure'
  | 'secrets'

interface SecretRow {
  name: string
  purpose: string
  isConfigured: boolean
  managementType: 'Cloudflare Secret' | 'Environment Variable'
  managementLocation: string
}

export function SettingsView() {
  const data = useAdminData()
  const [activeTab, setActiveTab] = useState<SettingsTab>('session')
  const [loggingOut, setLoggingOut] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const session = data.session
  const deploy = data.deploy
  const health = data.systemHealth

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      toast('info', `Copied "${text}" to clipboard.`)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      toast('error', 'Unable to copy to clipboard.')
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      window.location.reload()
    } catch {
      window.location.reload()
    }
  }

  const secretsList: SecretRow[] = [
    {
      name: 'ADMIN_AUTH_SECRET',
      purpose: 'Single-owner password authentication credential',
      isConfigured: health?.secrets?.adminPasswordConfigured ?? true,
      managementType: 'Cloudflare Secret',
      managementLocation: 'Cloudflare Pages Secrets Dashboard',
    },
    {
      name: 'TURNSTILE_SECRET_KEY',
      purpose: 'Server-side verification key for Cloudflare Turnstile bot challenges',
      isConfigured: health?.secrets?.turnstileConfigured ?? true,
      managementType: 'Cloudflare Secret',
      managementLocation: 'Cloudflare Pages Secrets Dashboard',
    },
    {
      name: 'GITHUB_DISPATCH_TOKEN',
      purpose: 'Fine-grained GitHub Personal Access Token for repository snapshot sync',
      isConfigured: health?.secrets?.githubSyncConfigured ?? false,
      managementType: 'Cloudflare Secret',
      managementLocation: 'Cloudflare Pages Secrets Dashboard',
    },
    {
      name: 'RESEND_API_KEY',
      purpose: 'API key for transactional contact email delivery via Resend',
      isConfigured: health?.secrets?.emailServiceConfigured ?? false,
      managementType: 'Cloudflare Secret',
      managementLocation: 'Cloudflare Pages Secrets Dashboard',
    },
    {
      name: 'EMAIL_FROM',
      purpose: 'Verified sending domain sender address (e.g. portfolio@alifaniani.ir)',
      isConfigured: health?.secrets?.emailServiceConfigured ?? false,
      managementType: 'Environment Variable',
      managementLocation: 'Cloudflare Pages Environment Variables',
    },
    {
      name: 'EMAIL_TO',
      purpose: 'Administrative destination email address for contact form inquiries',
      isConfigured: health?.secrets?.emailServiceConfigured ?? false,
      managementType: 'Environment Variable',
      managementLocation: 'Cloudflare Pages Environment Variables',
    },
    {
      name: 'PAGES_REBUILD_HOOK',
      purpose: 'Deploy Hook triggered by GitHub Actions after snapshot commit',
      isConfigured: health?.secrets?.deployHookConfigured ?? false,
      managementType: 'Cloudflare Secret',
      managementLocation: 'Cloudflare Pages Deploy Hooks Dashboard',
    },
  ]

  const lastActive = session?.lastUsedAt ?? null
  const expiresAt = session?.expiresAt ?? null

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">System Administration</p>
          <h1 className="mt-1 text-2xl font-semibold text-frost">Control Center Settings</h1>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            Session lifecycle, runtime infrastructure, deployment pipeline parameters, and security credentials directory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SiteVersion />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogoutConfirm(true)}
            className="text-xs border-danger/40 text-danger hover:bg-danger/10"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge/60 pb-3">
        {(
          [
            { id: 'session', label: 'Account & Session' },
            { id: 'application', label: 'Application & Build' },
            { id: 'publishing', label: 'Content & Publishing' },
            { id: 'infrastructure', label: 'Infrastructure & Bindings' },
            { id: 'secrets', label: 'Security & Secrets' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'border border-accent/40 bg-accent/15 text-accent'
                : 'border border-edge bg-panel text-mist hover:text-frost'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Account & Session Management */}
      {activeTab === 'session' && (
        <div className="space-y-4">
          <SectionTitle>Active Authentication & Session Posture</SectionTitle>
          <AdminCard>
            <CardHeader
              title="Current Administrative Session"
              action={
                <StatusPill tone="ok">
                  Active Session
                </StatusPill>
              }
            />
            <div className="space-y-4 px-4 py-3.5">
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div className="space-y-1">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Authentication Model</dt>
                  <dd className="text-xs font-medium text-frost">Single-Owner Password + Turnstile</dd>
                  <p className="text-[11px] text-mist/70">Edge-verified with PBKDF2/SHA-256 and smart bot detection.</p>
                </div>

                <div className="space-y-1">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Expiration Policy</dt>
                  <dd className="text-xs font-medium text-frost">15m Idle / 12h Absolute Limit</dd>
                  <p className="text-[11px] text-mist/70">Inactivity strictly auto-terminates session to protect console.</p>
                </div>

                <div className="space-y-1">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">CSRF & Transport Guard</dt>
                  <dd className="text-xs font-medium text-frost">X-CSRF-Token · SameSite=Strict</dd>
                  <p className="text-[11px] text-mist/70">HttpOnly session cookie with TLS 1.3 encryption.</p>
                </div>
              </dl>

              <div className="rounded-lg border border-edge bg-abyss/80 p-3.5 text-xs space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-mist font-medium">Session Status:</span>
                  <span className="text-accent font-mono">
                    {expiresAt ? `Valid until ${new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Active'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-mist font-medium">Last Activity Recorded:</span>
                  <span className="text-frost font-mono">
                    {lastActive ? formatRelative(lastActive) : 'Just now'} ({lastActive ? absoluteTime(lastActive) : 'Active'})
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="gap-1.5 border-danger/40 text-danger hover:bg-danger/10"
                >
                  Terminate Session & Sign Out
                </Button>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Tab 2: Application & Runtime Information */}
      {activeTab === 'application' && (
        <div className="space-y-4">
          <SectionTitle>Application & Build Posture</SectionTitle>
          <AdminCard>
            <CardHeader title="Build Architecture & Release Target" />
            <dl className="grid gap-4 px-4 py-3.5 text-sm sm:grid-cols-3">
              <div className="space-y-1">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Console Version</dt>
                <dd className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-frost">v{APP_VERSION}</span>
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(`v${APP_VERSION}`, 'version')}
                    className="text-mist hover:text-accent"
                    title="Copy Version"
                  >
                    {copiedKey === 'version' ? <CheckIcon className="h-3 w-3 text-accent" /> : <CopyIcon className="h-3 w-3" />}
                  </button>
                </dd>
                <p className="text-[11px] text-mist/70">Synchronized with package.json and version.ts.</p>
              </div>

              <div className="space-y-1">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Production Origin</dt>
                <dd className="flex items-center gap-2">
                  <span className="break-all font-mono text-xs text-frost">{SITE.url}</span>
                  <button
                    type="button"
                    onClick={() => void copyToClipboard(SITE.url, 'origin')}
                    className="text-mist hover:text-accent"
                    title="Copy Origin"
                  >
                    {copiedKey === 'origin' ? <CheckIcon className="h-3 w-3 text-accent" /> : <CopyIcon className="h-3 w-3" />}
                  </button>
                </dd>
                <p className="text-[11px] text-mist/70">Canonical domain declared across all SEO tags.</p>
              </div>

              <div className="space-y-1">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Runtime Environment</dt>
                <dd className="text-xs font-medium text-accent">
                  {health?.runtime?.environment === 'production'
                    ? 'Cloudflare Pages (Production)'
                    : health?.runtime?.environment === 'preview'
                      ? 'Cloudflare Pages (Preview)'
                      : 'Local Development Environment'}
                </dd>
                <p className="text-[11px] text-mist/70">
                  {health?.runtime?.edgeColo ? `Serving from Cloudflare PoP: ${health.runtime.edgeColo}` : 'Edge functions active.'}
                </p>
              </div>
            </dl>
          </AdminCard>
        </div>
      )}

      {/* Tab 3: Content & Publishing Posture */}
      {activeTab === 'publishing' && (
        <div className="space-y-4">
          <SectionTitle>Content Snapshot & Synchronization Posture</SectionTitle>
          <AdminCard>
            <CardHeader
              title="Publishing Pipeline Configuration"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.location.hash = '#/publishing'
                  }}
                  className="gap-1.5 text-xs border-accent/40 text-accent hover:bg-accent/10"
                >
                  <RocketIcon className="h-3 w-3" /> Go to Publishing View
                </Button>
              }
            />
            <div className="space-y-4 px-4 py-3.5 text-xs text-mist">
              <dl className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Snapshot Mode</dt>
                  <dd className="font-mono text-xs font-medium text-frost">strict (fails closed)</dd>
                  <p className="text-[11px] text-mist/70">Production builds fail safely if snapshot is invalid or missing.</p>
                </div>

                <div className="space-y-1">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Publishing Mechanism</dt>
                  <dd className="text-xs font-medium text-frost">Selective Atomic Promotion</dd>
                  <p className="text-[11px] text-mist/70">Administrators choose exact changes; unselected drafts stay untouched.</p>
                </div>

                <div className="space-y-1">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Current Deploy State</dt>
                  <dd className="font-mono text-xs text-accent">
                    {deploy?.status ?? 'Idle / Up to Date'}
                  </dd>
                  <p className="text-[11px] text-mist/70">
                    {deploy?.requestedAt ? `Last request: ${relativeTime(deploy.requestedAt)}` : 'No in-flight build operations.'}
                  </p>
                </div>
              </dl>

              <div className="rounded-lg border border-edge bg-abyss p-3 space-y-1.5">
                <p className="font-semibold text-frost">Publishing Ordering Guarantee:</p>
                <p className="leading-relaxed">
                  Publish promotes validated records into Cloudflare D1 atomically and dispatches the snapshot-sync workflow to GitHub.
                  The Cloudflare Pages deploy hook is called only <em>after</em> the generated snapshot is committed to the main branch.
                  A Pages build can therefore never start from an outdated snapshot.
                </p>
              </div>
            </div>
          </AdminCard>
        </div>
      )}

      {/* Tab 4: Infrastructure & Bindings */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-4">
          <SectionTitle>Cloudflare Infrastructure & Bindings</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* D1 Binding */}
            <AdminCard className="p-0">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-frost text-sm">D1 Database (env.DB)</span>
                  </div>
                  <StatusPill tone={health?.d1?.ok ? 'ok' : 'danger'}>
                    {health?.d1?.ok ? 'Connected' : 'Unavailable'}
                  </StatusPill>
                </div>
                <p className="text-xs text-mist">Serverless SQLite database powering all CMS content, auth sessions, and audit logs.</p>
                <div className="font-mono text-[10px] text-mist/70 pt-1">
                  Latency: {health?.d1?.latencyMs ?? 0}ms · Verified content rows: {health?.d1?.tables?.content ?? 0}
                </div>
              </div>
            </AdminCard>

            {/* KV Binding */}
            <AdminCard className="p-0">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlugIcon className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-frost text-sm">KV Namespace (env.RATE_LIMIT)</span>
                  </div>
                  <StatusPill tone={health?.kv?.ok ? 'ok' : 'warning'}>
                    {health?.kv?.ok ? 'Connected' : 'Degraded'}
                  </StatusPill>
                </div>
                <p className="text-xs text-mist">Low-latency global key-value store for login burst limiting and deploy state machine.</p>
                <div className="font-mono text-[10px] text-mist/70 pt-1">
                  Deploy state key: {health?.kv?.deployStateFound ? 'Present' : 'Not initialized'}
                </div>
              </div>
            </AdminCard>

            {/* R2 Binding */}
            <AdminCard className="p-0">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-frost text-sm">R2 Media Bucket (env.MEDIA_BUCKET)</span>
                  </div>
                  <StatusPill tone={health?.r2?.ok ? 'ok' : health?.r2?.bound ? 'info' : 'warning'}>
                    {health?.r2?.ok ? 'Connected' : health?.r2?.bound ? 'Bound' : 'Not Bound'}
                  </StatusPill>
                </div>
                <p className="text-xs text-mist">S3-compatible object storage for project banner images, screenshots, and credentials.</p>
                <div className="font-mono text-[10px] text-mist/70 pt-1">
                  Public Media Origin: https://media.alifaniani.ir
                </div>
              </div>
            </AdminCard>

            {/* Static Assets Fetcher */}
            <AdminCard className="p-0">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RocketIcon className="h-4 w-4 text-accent" />
                    <span className="font-semibold text-frost text-sm">Static Assets (env.ASSETS)</span>
                  </div>
                  <StatusPill tone="ok">
                    Connected
                  </StatusPill>
                </div>
                <p className="text-xs text-mist">Cloudflare Pages asset fetcher used to serve built HTML shells, robots.txt, and manifests.</p>
                <div className="font-mono text-[10px] text-mist/70 pt-1">
                  Edge Asset Fetcher active on all routes.
                </div>
              </div>
            </AdminCard>
          </div>
        </div>
      )}

      {/* Tab 5: Security & Secrets Directory */}
      {activeTab === 'secrets' && (
        <div className="space-y-4">
          <SectionTitle>Security & Secrets Management</SectionTitle>
          <AdminCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-edge bg-abyss/80 text-[10px] uppercase tracking-wider text-mist">
                  <tr>
                    <th className="px-4 py-2.5">Secret Name</th>
                    <th className="px-4 py-2.5">Purpose & Scope</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Configuration Command / Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {secretsList.map((sec) => (
                    <tr key={sec.name} className="hover:bg-panel/40 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 align-top font-mono font-medium text-frost">
                        {sec.name}
                      </td>
                      <td className="px-4 py-3 align-top text-mist max-w-sm">
                        {sec.purpose}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border',
                            sec.isConfigured
                              ? 'border-accent/40 bg-accent/10 text-accent'
                              : 'border-edge bg-abyss text-mist/60'
                          )}
                        >
                          {sec.isConfigured ? 'Configured' : 'Optional / Absent'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top font-mono text-[11px] text-mist/80">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-xs">{sec.managementLocation}</span>
                          {sec.managementLocation.startsWith('wrangler') && (
                            <button
                              type="button"
                              onClick={() => void copyToClipboard(sec.managementLocation, sec.name)}
                              className="text-mist hover:text-accent"
                              title="Copy command"
                            >
                              {copiedKey === sec.name ? <CheckIcon className="h-3 w-3 text-accent" /> : <CopyIcon className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>

          <AdminNotice kind="info" title="Zero Secret Exposure Guarantee">
            Secrets are configured securely via Cloudflare Pages Secrets or Wrangler. They are encrypted in
            Cloudflare's key vault and never sent to this frontend client under any circumstance.
          </AdminNotice>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <AdminModal
        open={showLogoutConfirm}
        onClose={() => (loggingOut ? undefined : setShowLogoutConfirm(false))}
        title="Sign Out of Portfolio Control Center?"
      >
        <div className="space-y-4">
          <p className="text-sm text-mist leading-relaxed">
            Signing out terminates your current active session cookie immediately on the Cloudflare edge server.
            Any unsaved edits in active form fields will be preserved in drafts if already saved.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogoutConfirm(false)}
              disabled={loggingOut}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="border border-danger/50 bg-danger/10 text-danger hover:bg-danger/20"
              variant="outline"
            >
              {loggingOut ? 'Signing out...' : 'Confirm Sign Out'}
            </Button>
          </div>
        </div>
      </AdminModal>
    </div>
  )
}
