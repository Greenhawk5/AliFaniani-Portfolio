/**
 * SEO Center — deterministic checks against REAL build artifacts:
 *   /robots.txt, /sitemap.xml (lastmod vs content freshness), and
 *   /_content_meta.json (route + project slug coverage). Each check reports
 *   pass/fail with a concrete remedy; no invented numeric score — the
 *   overall status is derived from the actual check outcomes.
 *
 * The project-sitemap check compares sitemap.xml against the admin's own
 * content list (published projects), so a stale build or an unpublished
 * project is visible immediately.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAdminData, useContentCounts } from '../AdminDataProvider'
import { AdminCard, CardHeader, SectionTitle, StatusPill, StatusDot, AdminNotice, Skeleton, absoluteTime } from '../ui/primitives'
import { SearchIcon } from '../ui/icons'
import { CheckIcon, AlertIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { SITE } from '@/app/config'

type CheckStatus = 'pass' | 'warn' | 'fail'

interface Check {
  id: string
  area: string
  status: CheckStatus
  title: string
  detail: string
  remedy?: string
}

const CHECK_ORDER: Record<CheckStatus, number> = { fail: 0, warn: 1, pass: 2 }

export function SeoView() {
  const counts = useContentCounts()
  const { items } = useAdminData()
  const [robotsText, setRobotsText] = useState<string | null>(null)
  const [sitemapText, setSitemapText] = useState<string | null>(null)
  const [contentMeta, setContentMeta] = useState<{ projectSlugs?: string[]; staticRoutes?: string[] } | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadArtifacts = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    const results = await Promise.allSettled([
      fetch('/robots.txt').then((r) => (r.ok ? r.text() : Promise.reject(new Error(`robots.txt → ${r.status}`)))),
      fetch('/sitemap.xml').then((r) => (r.ok ? r.text() : Promise.reject(new Error(`sitemap.xml → ${r.status}`)))),
      fetch('/_content_meta.json').then((r) => (r.ok ? r.json() : Promise.reject(new Error(`_content_meta.json → ${r.status}`)))),
    ])
    setRobotsText(results[0].status === 'fulfilled' ? results[0].value : null)
    setSitemapText(results[1].status === 'fulfilled' ? results[1].value : null)
    setContentMeta(results[2].status === 'fulfilled' ? (results[2].value as typeof contentMeta) : null)
    if (results.every((r) => r.status === 'rejected')) {
      setFetchError('Build artifacts are unreachable from this origin — checks cannot run.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    // Async kick-off; setLoading fires after the internal await, not in the
    // effect body synchronously.
    void Promise.resolve().then(() => {
      if (cancelled) return
      return loadArtifacts()
    })
    return () => {
      cancelled = true
    }
  }, [loadArtifacts])

  const publishedProjects = useMemo(
    () => (items ?? []).filter((i) => i.kind === 'project' && i.state === 'published').map((i) => i.key),
    [items]
  )

  const checks = useMemo<Check[]>(() => {
    const out: Check[] = []

    /* robots.txt */
    if (robotsText !== null) {
      const hasSitemapDirective = /sitemap:/i.test(robotsText)
      const allowsAll = /user-agent:\s*\*/i.test(robotsText) && !/disallow:\s*\/(?!\s*$)/im.test(robotsText.replace(/disallow:\s*$/gim, ''))
      out.push({
        id: 'robots',
        area: 'Technical',
        status: hasSitemapDirective && allowsAll ? 'pass' : 'warn',
        title: 'robots.txt',
        detail: hasSitemapDirective
          ? 'Present, crawl-friendly, and declares the sitemap.'
          : 'Present but missing a "Sitemap:" directive.',
        remedy: hasSitemapDirective ? undefined : 'Regenerate robots.txt (scripts/generate-sitemap.mjs writes it).',
      })
    } else {
      out.push({
        id: 'robots',
        area: 'Technical',
        status: fetchError ? 'fail' : 'warn',
        title: 'robots.txt',
        detail: fetchError || 'Could not load robots.txt.',
        remedy: 'Verify the deployment serves /robots.txt.',
      })
    }

    /* sitemap */
    if (sitemapText !== null) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(sitemapText, 'text/xml')
      const urls = Array.from(doc.getElementsByTagName('loc')).map((loc) => loc.textContent ?? '')
      const lastmods = Array.from(doc.getElementsByTagName('lastmod')).map((n) => n.textContent ?? '')
      const missing = publishedProjects.filter((slug) => !urls.some((u) => u.endsWith(`/projects/${slug}`)))
      const stale =
        counts.lastUpdated && lastmods[0]
          ? Date.parse(counts.lastUpdated) > Date.parse(lastmods[0]) + 60_000
          : false
      out.push({
        id: 'sitemap-coverage',
        area: 'Technical',
        status: missing.length > 0 ? 'fail' : 'pass',
        title: 'Sitemap covers published projects',
        detail:
          missing.length > 0
            ? `${missing.length} published project${missing.length === 1 ? '' : 's'} missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}`
            : `All ${publishedProjects.length} published projects are listed.`,
        remedy: missing.length > 0 ? 'Republish and let the build regenerate sitemap.xml.' : undefined,
      })
      out.push({
        id: 'sitemap-freshness',
        area: 'Technical',
        status: stale ? 'warn' : 'pass',
        title: stale ? 'Sitemap is stale — rebuild will refresh it' : 'Sitemap lastmod matches content',
        detail: stale
          ? `Content changed (${absoluteTime(counts.lastUpdated)}) after the sitemap was generated (${absoluteTime(lastmods[0])}). Cause: edits saved since the last build. Fix: publish (or any build) regenerates sitemap.xml from the snapshot.`
          : lastmods[0]
            ? `Generated ${absoluteTime(lastmods[0])} — no content edits since.`
            : 'No lastmod found in sitemap.xml — the generator always writes one; verify the build ran generate-sitemap.',
      })
      out.push({
        id: 'sitemap-valid',
        area: 'Technical',
        status: urls.length > 0 ? 'pass' : 'fail',
        title: 'Sitemap parses and has URLs',
        detail: urls.length > 0 ? `${urls.length} URLs listed.` : 'No <loc> entries found.',
      })
    } else {
      out.push({
        id: 'sitemap-coverage',
        area: 'Technical',
        status: fetchError ? 'fail' : 'warn',
        title: 'sitemap.xml',
        detail: fetchError || 'Could not load sitemap.xml.',
        remedy: 'Verify the deployment serves /sitemap.xml.',
      })
    }

    /* content meta (route coverage / middleware source of truth) */
    if (contentMeta !== null) {
      const slugs = contentMeta.projectSlugs ?? []
      const routes = contentMeta.staticRoutes ?? []
      const missingMeta = publishedProjects.filter((slug) => !slugs.includes(slug))
      out.push({
        id: 'meta-routes',
        area: 'Routing',
        status: missingMeta.length > 0 ? 'fail' : 'pass',
        title: 'Route metadata matches published projects',
        detail:
          missingMeta.length > 0
            ? `Middleware route list is missing: ${missingMeta.slice(0, 3).join(', ')}${missingMeta.length > 3 ? '…' : ''}`
            : `All ${slugs.length} project slugs registered (${routes.length} static routes).`,
        remedy: missingMeta.length > 0 ? 'Rebuild — _content_meta.json is generated from the snapshot.' : undefined,
      })
    } else {
      out.push({
        id: 'meta-routes',
        area: 'Routing',
        status: fetchError ? 'fail' : 'warn',
        title: '_content_meta.json',
        detail: fetchError || 'Could not load _content_meta.json.',
      })
    }

    /* content-level hygiene from the admin's own data */
    const draftOnly = (items ?? []).filter((i) => i.kind === 'project' && i.state === 'draft')
    out.push({
      id: 'drafts',
      area: 'Content',
      status: draftOnly.length > 0 ? 'info' as unknown as CheckStatus : 'pass',
      title: 'Draft-only projects',
      detail:
        draftOnly.length > 0
          ? `${draftOnly.length} project${draftOnly.length === 1 ? '' : 's'} exist only as drafts (invisible to search): ${draftOnly.slice(0, 3).map((d) => d.key).join(', ')}${draftOnly.length > 3 ? '…' : ''}`
          : 'No draft-only projects.',
    })

    return out.sort((a, b) => CHECK_ORDER[a.status] - CHECK_ORDER[b.status])
  }, [robotsText, sitemapText, contentMeta, fetchError, publishedProjects, counts.lastUpdated, items])

  const failures = checks.filter((c) => c.status === 'fail').length
  const warnings = checks.filter((c) => c.status === 'warn').length
  const overall: CheckStatus = failures > 0 ? 'fail' : warnings > 0 ? 'warn' : 'pass'

  const grouped = useMemo(() => {
    const map = new Map<string, Check[]>()
    for (const check of checks) {
      map.set(check.area, [...(map.get(check.area) ?? []), check])
    }
    return Array.from(map.entries())
  }, [checks])

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Optimization</p>
          <h1 className="mt-1 text-2xl font-semibold text-frost">SEO Center</h1>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            Deterministic checks against the live build artifacts — robots, sitemap coverage, and the
            middleware route list. No synthetic scoring.
          </p>
        </div>
        <StatusPill tone={overall === 'pass' ? 'ok' : overall === 'warn' ? 'warning' : 'danger'}>
          {failures > 0 ? `${failures} failing` : warnings > 0 ? `${warnings} warning${warnings === 1 ? '' : 's'}` : 'All checks pass'}
        </StatusPill>
      </header>

      {/* Canonical + noindex posture */}
      <AdminCard>
        <CardHeader title="Indexing posture" />
        <dl className="grid gap-3 px-4 py-3.5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-mist/70">Canonical origin</dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-frost">{SITE.url}</dd>
          </div>
          <div>
            <dt className="text-xs text-mist/70">/admin visibility</dt>
            <dd className="mt-0.5 text-xs text-frost">noindex (edge middleware) + absent from sitemap</dd>
          </div>
          <div>
            <dt className="text-xs text-mist/70">Per-route metadata</dt>
            <dd className="mt-0.5 text-xs text-frost">Generated shells + runtime hydration (3-layer pipeline)</dd>
          </div>
        </dl>
      </AdminCard>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        grouped.map(([area, areaChecks]) => (
          <section key={area} aria-labelledby={`seo-${area}`}>
            <SectionTitle>
              <span id={`seo-${area}`}>{area}</span>
            </SectionTitle>
            <ul className="mt-2 space-y-2">
              {areaChecks.map((check) => (
                <li
                  key={check.id}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border px-4 py-3',
                    check.status === 'pass' && 'border-edge bg-panel/70',
                    check.status === 'warn' && 'border-amber/30 bg-amber/6',
                    check.status === 'fail' && 'border-danger/30 bg-danger/6'
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                      check.status === 'pass' && 'bg-accent/10 text-accent',
                      check.status === 'warn' && 'bg-amber/10 text-amber',
                      check.status === 'fail' && 'bg-danger/10 text-danger'
                    )}
                  >
                    {check.status === 'pass' ? <CheckIcon className="h-3.5 w-3.5" /> : <AlertIcon className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-frost">{check.title}</p>
                    <p className="text-xs leading-relaxed text-mist">{check.detail}</p>
                    {check.remedy && <p className="mt-1 text-xs text-mist/70">→ {check.remedy}</p>}
                  </div>
                  <StatusDot tone={check.status === 'pass' ? 'ok' : check.status === 'warn' ? 'warning' : 'danger'} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {fetchError && <AdminNotice kind="warning">{fetchError}</AdminNotice>}

      <p className="flex items-center gap-2 text-xs text-mist/60">
        <SearchIcon className="h-3.5 w-3.5" />
        Checks run against {SITE.url} artifacts each time this page loads.
      </p>
    </div>
  )
}
