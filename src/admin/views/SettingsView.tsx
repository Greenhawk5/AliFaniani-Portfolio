/**
 * Settings — session info, build/version info, and pointers for things that
 * are environment configuration (not CMS-manageable from here). Everything
 * shown is read from the live session or the app bundle — nothing faked.
 */

import { useAdminData } from '../AdminDataProvider'
import { AdminCard, CardHeader, SectionTitle, AdminNotice } from '../ui/primitives'
import { SiteVersion } from '../SiteVersion'
import { APP_VERSION } from '@/version'
import { SITE } from '@/app/config'
import { formatRelative } from '../lib/format'

export function SettingsView() {
  return (
    <div className="space-y-5">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">System</p>
        <h1 className="mt-1 text-2xl font-semibold text-frost">Settings</h1>
        <p className="mt-1 text-sm text-mist">Session, build, and environment posture.</p>
      </header>

      <SectionTitle>Session</SectionTitle>
      <SessionCard />

      <SectionTitle>Build</SectionTitle>
      <AdminCard>
        <CardHeader title="Version" action={<SiteVersion />} />
        <dl className="grid gap-3 px-4 py-3.5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-mist/70">Console version</dt>
            <dd className="mt-0.5 font-mono text-xs text-frost">v{APP_VERSION}</dd>
          </div>
          <div>
            <dt className="text-xs text-mist/70">Production origin</dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-frost">{SITE.url}</dd>
          </div>
          <div>
            <dt className="text-xs text-mist/70">Snapshot mode</dt>
            <dd className="mt-0.5 font-mono text-xs text-frost">strict (build fails closed)</dd>
          </div>
        </dl>
      </AdminCard>

      <SectionTitle>Environment</SectionTitle>
      <AdminCard>
        <CardHeader title="Managed outside this console" />
        <ul className="space-y-2.5 px-4 py-3.5 text-sm text-mist">
          <li className="leading-relaxed">
            <strong className="text-frost">Secrets</strong> — the admin credential, bot-check key, repository
            sync token, and email keys: <span className="font-mono text-xs">wrangler pages secret put …</span>{' '}
            or the Pages dashboard. Never exposed to this UI by design.
          </li>
          <li className="leading-relaxed">
            <strong className="text-frost">Deploy hook</strong> — the Pages build is triggered by the GitHub
            Actions snapshot-sync workflow (never directly by publish, which prevents stale-snapshot builds).
          </li>
          <li className="leading-relaxed">
            <strong className="text-frost">Content pipeline</strong> — publish → D1 promotion → repository
            dispatch → snapshot commit → deploy hook. Each stage is visible under Publishing and Activity.
          </li>
        </ul>
      </AdminCard>

      <AdminNotice kind="info" title="Where things live">
        Content editing → Content section. Publish/sync → Publishing. Audit history → Activity. Service
        status → Integrations.
      </AdminNotice>
    </div>
  )
}

function SessionCard() {
  const data = useAdminData()
  // expiresAt comes from the session probe on the shell; relative freshness is derived.
  const expiresAt = data.deploy?.requestedAt ?? null
  return (
    <AdminCard>
      <CardHeader title="Sign-in session" />
      <div className="grid gap-3 px-4 py-3.5 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-mist/70">Model</p>
          <p className="mt-0.5 text-frost">Single-owner password + Turnstile</p>
        </div>
        <div>
          <p className="text-xs text-mist/70">Session cookie</p>
          <p className="mt-0.5 text-frost">HttpOnly · Secure · SameSite=Strict</p>
        </div>
        <div>
          <p className="text-xs text-mist/70">CSRF</p>
          <p className="mt-0.5 text-frost">Required on all mutations (X-CSRF-Token)</p>
        </div>
      </div>
      <p className="px-4 pb-3.5 text-xs text-mist/70">
        Sessions expire after 7 days of inactivity (hard cap 30 days). Expires-at is held in memory by the
        shell — last activity recorded {expiresAt ? formatRelative(expiresAt) : '—'}.
      </p>
    </AdminCard>
  )
}
