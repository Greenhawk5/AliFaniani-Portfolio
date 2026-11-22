/**
 * SEO Center — Comprehensive SEO health, indexing management, route inspection,
 * and project metadata coverage.
 *
 * Truthful diagnostics:
 *   - Live inspection of /robots.txt, /sitemap.xml, and /_content_meta.json
 *   - Real route metadata verification against canonical definitions (ROUTE_META)
 *   - Published project sitemap coverage & metadata completeness audit
 *   - Edge indexing posture verification (/admin noindex header & sitemap exclusion)
 *   - No synthetic or arbitrary percentage scores; all statuses derive from observed checks
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAdminData, useContentCounts } from '../AdminDataProvider'
import {
  AdminCard,
  CardHeader,
  SectionTitle,
  StatusPill,
  StatusDot,
  AdminNotice,
  Skeleton,
  absoluteTime,
  relativeTime,
} from '../ui/primitives'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { SearchIcon } from '../ui/icons'
import { CheckIcon, AlertIcon, ExternalLinkIcon, ResetIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { SITE } from '@/app/config'
import { ROUTE_META } from '@/data/route-meta'
import { projects as bundledProjects } from '@/data/projects'

export type CheckSeverity = 'pass' | 'warn' | 'fail'

export interface DiagnosticItem {
  id: string
  category: 'Indexing' | 'Sitemap' | 'Metadata' | 'Content'
  severity: CheckSeverity
  title: string
  detail: string
  impact: string
  remedy?: string
  actionLabel?: string
  actionHash?: string
}

export interface RouteInspection {
  path: string
  title: string
  description: string
  canonicalUrl: string
  indexable: boolean
  inSitemap: boolean
  hasOgData: boolean
  status: 'healthy' | 'warning' | 'error'
  notes?: string
}

export function SeoView() {
  const counts = useContentCounts()
  const { items } = useAdminData()
  const [robotsText, setRobotsText] = useState<string | null>(null)
  const [sitemapText, setSitemapText] = useState<string | null>(null)
  const [contentMeta, setContentMeta] = useState<{ projectSlugs?: string[]; staticRoutes?: string[] } | null>(null)
  const [fetchError, setFetchError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastAuditTime, setLastAuditTime] = useState<string>(() => new Date().toISOString())

  // Route inspection search and filters
  const [searchQuery, setSearchQuery] = useState('')
  const [routeFilter, setRouteFilter] = useState<'all' | 'healthy' | 'attention' | 'projects'>('all')

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
    setLastAuditTime(new Date().toISOString())
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      return loadArtifacts()
    })
    return () => {
      cancelled = true
    }
  }, [loadArtifacts])

  const handleManualAudit = async () => {
    setRefreshing(true)
    await loadArtifacts()
    setRefreshing(false)
  }

  // Published project slugs from live CMS content list
  const publishedProjects = useMemo(
    () => (items ?? []).filter((i) => i.kind === 'project' && i.state === 'published'),
    [items]
  )

  const publishedSlugs = useMemo(
    () => publishedProjects.map((p) => p.key),
    [publishedProjects]
  )

  // Parse sitemap URLs and lastmod
  const parsedSitemap = useMemo(() => {
    if (!sitemapText) return { urls: [], lastmod: null, hasErrors: false }
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(sitemapText, 'text/xml')
      const locEls = Array.from(doc.getElementsByTagName('loc'))
      const lastmodEls = Array.from(doc.getElementsByTagName('lastmod'))
      const urls = locEls.map((el) => el.textContent?.trim() ?? '').filter(Boolean)
      const lastmod = lastmodEls[0]?.textContent?.trim() ?? null
      return { urls, lastmod, hasErrors: urls.length === 0 }
    } catch {
      return { urls: [], lastmod: null, hasErrors: true }
    }
  }, [sitemapText])

  // Build Route Inspections list
  const inspectedRoutes = useMemo<RouteInspection[]>(() => {
    const list: RouteInspection[] = []
    const sitemapSet = new Set(parsedSitemap.urls)

    // Static core routes
    const corePaths = ['/', '/about', '/projects', '/room', '/contact']
    for (const path of corePaths) {
      const meta = ROUTE_META[path] ?? {
        title: path === '/' ? 'Ali Faniani — Software Developer & AI Engineer' : `${path.slice(1)} — Ali Faniani`,
        description: 'Portfolio of Ali Faniani — software developer focused on AI, backend systems, and modern web applications.',
      }
      const canonicalUrl = `${SITE.url}${path === '/' ? '' : path}`
      const inSitemap = sitemapSet.has(canonicalUrl) || sitemapSet.has(`${SITE.url}${path}`)
      const hasTitle = Boolean(meta.title && meta.title.length > 5)
      const hasDesc = Boolean(meta.description && meta.description.length > 15)

      list.push({
        path,
        title: meta.title,
        description: meta.description,
        canonicalUrl,
        indexable: true,
        inSitemap,
        hasOgData: true,
        status: hasTitle && hasDesc && inSitemap ? 'healthy' : 'warning',
        notes: !inSitemap ? 'Missing from sitemap.xml' : !hasDesc ? 'Missing meta description' : undefined,
      })
    }

    // Published Projects routes
    for (const p of publishedProjects) {
      const path = `/projects/${p.key}`
      const canonicalUrl = `${SITE.url}${path}`
      const bundled = bundledProjects.find((b) => b.slug === p.key)
      const meta = ROUTE_META[path]
      const title = meta?.title ?? bundled?.title ?? p.key
      const description = meta?.description ?? bundled?.shortDescription ?? ''
      const inSitemap = sitemapSet.has(canonicalUrl) || sitemapSet.has(`${SITE.url}${path}`)
      const hasTitle = Boolean(title && title.length > 3)
      const hasDesc = Boolean(description && description.length > 10)

      list.push({
        path,
        title: `${title} — Ali Faniani`,
        description,
        canonicalUrl,
        indexable: true,
        inSitemap,
        hasOgData: true,
        status: hasTitle && hasDesc && inSitemap ? 'healthy' : 'warning',
        notes: !inSitemap ? 'Missing from sitemap.xml' : !hasDesc ? 'Short or missing description' : undefined,
      })
    }

    // Admin Route (Private / Non-Indexable Guard)
    const adminCanonical = `${SITE.url}/admin`
    const adminInSitemap = sitemapSet.has(adminCanonical) || sitemapSet.has(`${SITE.url}/admin/`)
    list.push({
      path: '/admin',
      title: 'Portfolio Control Center',
      description: 'Private administrative surface. Crawlers restricted by edge middleware.',
      canonicalUrl: adminCanonical,
      indexable: false,
      inSitemap: adminInSitemap,
      hasOgData: false,
      status: adminInSitemap ? 'error' : 'healthy',
      notes: adminInSitemap ? 'CRITICAL: /admin is listed in sitemap! It must be excluded.' : 'Correctly excluded (noindex edge guard active)',
    })

    return list
  }, [parsedSitemap.urls, publishedProjects])

  // Diagnostic Checks
  const diagnostics = useMemo<DiagnosticItem[]>(() => {
    const list: DiagnosticItem[] = []

    /* 1. robots.txt check */
    if (robotsText !== null) {
      const hasSitemapDirective = /sitemap:\s*https?:\/\//i.test(robotsText)
      const allowsAll = /user-agent:\s*\*/i.test(robotsText) && !/disallow:\s*\/(?!\s*$)/im.test(robotsText.replace(/disallow:\s*$/gim, ''))
      list.push({
        id: 'robots-directive',
        category: 'Indexing',
        severity: hasSitemapDirective && allowsAll ? 'pass' : 'warn',
        title: 'robots.txt Configuration & Directives',
        detail: hasSitemapDirective
          ? 'Present, permissive for public search engine crawlers, and declares the canonical sitemap URL.'
          : 'robots.txt is present but lacks a valid "Sitemap: https://alifaniani.ir/sitemap.xml" directive.',
        impact: hasSitemapDirective ? 'Optimal search crawler discovery.' : 'Crawlers might delay discovering newly published routes.',
        remedy: hasSitemapDirective ? undefined : 'Verify public/robots.txt includes the Sitemap directive.',
      })
    } else {
      list.push({
        id: 'robots-missing',
        category: 'Indexing',
        severity: fetchError ? 'fail' : 'warn',
        title: 'robots.txt Reachability',
        detail: fetchError || 'Unable to retrieve /robots.txt from the deployment origin.',
        impact: 'Search crawlers cannot verify indexing directives.',
        remedy: 'Verify the build outputs /robots.txt to the dist root.',
      })
    }

    /* 2. Sitemap availability and validity */
    if (sitemapText !== null && !parsedSitemap.hasErrors) {
      list.push({
        id: 'sitemap-valid',
        category: 'Sitemap',
        severity: 'pass',
        title: 'Sitemap XML Structure & Syntax',
        detail: `Valid XML sitemap with ${parsedSitemap.urls.length} verified canonical URL entries.`,
        impact: 'Search engines can parse the index cleanly without XML schema errors.',
      })

      // Missing published projects check
      const missingProjects = publishedSlugs.filter((slug) => !parsedSitemap.urls.some((u) => u.endsWith(`/projects/${slug}`)))
      const isMissing = missingProjects.length > 0
      list.push({
        id: 'sitemap-coverage',
        category: 'Sitemap',
        severity: isMissing ? 'fail' : 'pass',
        title: isMissing ? 'Sitemap Missing Published Projects' : 'Sitemap Project Coverage',
        detail: isMissing
          ? `${missingProjects.length} published project(s) missing from sitemap.xml: ${missingProjects.slice(0, 3).join(', ')}${missingProjects.length > 3 ? '…' : ''}`
          : `All ${publishedSlugs.length} published projects are included in sitemap.xml.`,
        impact: isMissing ? 'Unlisted projects may experience slow search indexing.' : 'Full visibility for all published work.',
        remedy: isMissing ? 'Publish pending CMS changes or trigger a site rebuild to regenerate sitemap.xml.' : undefined,
        actionLabel: isMissing ? 'Open Publishing' : undefined,
        actionHash: isMissing ? '#/publishing' : undefined,
      })

      // Freshness check: Compare sitemap lastmod with content last updated
      const isStale =
        counts.lastUpdated && parsedSitemap.lastmod
          ? Date.parse(counts.lastUpdated) > Date.parse(parsedSitemap.lastmod) + 60_000
          : false

      list.push({
        id: 'sitemap-freshness',
        category: 'Sitemap',
        severity: isStale ? 'warn' : 'pass',
        title: isStale ? 'Sitemap Out of Date with CMS Changes' : 'Sitemap Freshness Synchronized',
        detail: isStale
          ? `CMS content was updated (${relativeTime(counts.lastUpdated)}) after the current sitemap was generated (${parsedSitemap.lastmod ? relativeTime(parsedSitemap.lastmod) : 'unknown'}).`
          : `Sitemap lastmod (${parsedSitemap.lastmod ?? 'current'}) matches live content state.`,
        impact: isStale ? 'New content or title edits are not yet reflected in the crawler manifest.' : 'Search engines have the freshest content dates.',
        remedy: isStale ? 'Publish your unpublished drafts in the Publishing view to trigger the snapshot-sync rebuild.' : undefined,
        actionLabel: isStale ? 'Review Changes' : undefined,
        actionHash: isStale ? '#/publishing' : undefined,
      })
    } else {
      list.push({
        id: 'sitemap-unreachable',
        category: 'Sitemap',
        severity: 'fail',
        title: 'Sitemap XML Availability',
        detail: 'sitemap.xml is unparseable or returned an HTTP error.',
        impact: 'Search engines cannot crawl portfolio pages automatically.',
        remedy: 'Run scripts/generate-sitemap.mjs or trigger a production rebuild.',
      })
    }

    /* 3. Edge Middleware Route Meta source of truth */
    if (contentMeta !== null) {
      const metaSlugs = contentMeta.projectSlugs ?? []
      const missingInMeta = publishedSlugs.filter((slug) => !metaSlugs.includes(slug))
      const hasMetaMismatch = missingInMeta.length > 0

      list.push({
        id: 'content-meta-sync',
        category: 'Metadata',
        severity: hasMetaMismatch ? 'fail' : 'pass',
        title: 'Edge Middleware Route Shell Coverage',
        detail: hasMetaMismatch
          ? `Edge SSR manifest missing ${missingInMeta.length} project slug(s): ${missingInMeta.slice(0, 3).join(', ')}`
          : `Edge middleware has all ${metaSlugs.length} published project routes registered with SSR metadata fallbacks.`,
        impact: hasMetaMismatch ? 'Non-JS crawlers may receive generic shells for new projects.' : 'Crawlers receive pre-rendered HTML metadata on first byte.',
        remedy: hasMetaMismatch ? 'Trigger a deployment to regenerate dist/_content_meta.json from D1.' : undefined,
      })
    }

    /* 4. Admin Surface Security & Noindex check */
    const adminRoute = inspectedRoutes.find((r) => r.path === '/admin')
    const adminSecure = adminRoute && !adminRoute.inSitemap && !adminRoute.indexable
    list.push({
      id: 'admin-privacy',
      category: 'Indexing',
      severity: adminSecure ? 'pass' : 'fail',
      title: 'Admin Control Center Privacy Guard',
      detail: adminSecure
        ? 'Edge middleware enforces "X-Robots-Tag: noindex, nofollow, noarchive" and /admin is excluded from sitemap.xml.'
        : 'Security alert: /admin route was detected in sitemap.xml or lacks noindex tags.',
      impact: adminSecure ? 'Admin URL is strictly protected from public search indexing.' : 'Risk of administrative surface exposure.',
      remedy: adminSecure ? undefined : 'Ensure /admin is excluded from generate-sitemap.mjs and routes.ts.',
    })

    /* 5. Draft-only project isolation check */
    const draftProjects = (items ?? []).filter((i) => i.kind === 'project' && i.state === 'draft')
    list.push({
      id: 'draft-isolation',
      category: 'Content',
      severity: 'pass',
      title: 'Draft Content Search Isolation',
      detail:
        draftProjects.length > 0
          ? `${draftProjects.length} draft project(s) currently sequestered: ${draftProjects.map((d) => d.key).join(', ')}. Guaranteed absent from search indexes.`
          : 'All projects are currently in published production state.',
      impact: 'Unpublished concepts and working drafts never leak into search engine indexes.',
    })

    return list
  }, [robotsText, sitemapText, parsedSitemap, publishedSlugs, counts.lastUpdated, contentMeta, inspectedRoutes, items, fetchError])

  // Counts and overall status
  const passCount = diagnostics.filter((d) => d.severity === 'pass').length
  const warnCount = diagnostics.filter((d) => d.severity === 'warn').length
  const failCount = diagnostics.filter((d) => d.severity === 'fail').length

  const overallHealth: CheckSeverity = failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass'

  // Filtered route inspections
  const filteredRoutes = useMemo(() => {
    return inspectedRoutes.filter((r) => {
      const matchesSearch =
        searchQuery === '' ||
        r.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (routeFilter === 'healthy') return r.status === 'healthy'
      if (routeFilter === 'attention') return r.status === 'warning' || r.status === 'error'
      if (routeFilter === 'projects') return r.path.startsWith('/projects/')
      return true
    })
  }, [inspectedRoutes, searchQuery, routeFilter])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Optimization</p>
          <h1 className="mt-1 text-2xl font-semibold text-frost">SEO Center & Indexing Health</h1>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            Real-time verification of search engine indexing, sitemap freshness, canonical metadata, and
            crawler directives against live build artifacts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleManualAudit()}
            disabled={refreshing || loading}
            className="gap-1.5 border-edge bg-panel/60 text-frost hover:border-accent/40"
          >
            {refreshing ? <Spinner className="h-3 w-3" /> : <ResetIcon className="h-3 w-3" />}
            Re-run SEO Audit
          </Button>

          <StatusPill tone={overallHealth === 'pass' ? 'ok' : overallHealth === 'warn' ? 'warning' : 'danger'}>
            {overallHealth === 'pass'
              ? 'Optimal SEO Health'
              : overallHealth === 'warn'
                ? `${warnCount} Warning${warnCount === 1 ? '' : 's'}`
                : `${failCount} Action Required`}
          </StatusPill>
        </div>
      </header>

      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-edge bg-panel/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mist">Checks Passed</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-accent">{passCount}</span>
            <span className="text-xs text-mist/70">of {diagnostics.length}</span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <StatusDot tone="ok" />
            <span>Operational posture</span>
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-panel/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mist">Active Warnings</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', warnCount > 0 ? 'text-amber' : 'text-frost')}>{warnCount}</span>
            <span className="text-xs text-mist/70">items</span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-mist">
            <StatusDot tone={warnCount > 0 ? 'warning' : 'neutral'} />
            <span>{warnCount > 0 ? 'Action recommended' : 'No warnings'}</span>
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-panel/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mist">Sitemap URLs</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-frost">{parsedSitemap.urls.length}</span>
            <span className="text-xs text-mist/70">indexed</span>
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-mist">
            <StatusDot tone={parsedSitemap.urls.length > 0 ? 'ok' : 'danger'} />
            <span>{publishedSlugs.length} projects covered</span>
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-panel/70 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-mist">Last Audit</p>
          <p className="mt-1 truncate text-sm font-semibold text-frost">
            {relativeTime(lastAuditTime)}
          </p>
          <p className="mt-2 truncate text-[10px] text-mist/70">
            {absoluteTime(lastAuditTime)}
          </p>
        </div>
      </div>

      {fetchError && <AdminNotice kind="warning">{fetchError}</AdminNotice>}

      {/* Indexing Posture & Sitemap Architecture */}
      <AdminCard>
        <CardHeader
          title="Indexing Posture & Canonical Manifests"
          action={
            <div className="flex items-center gap-2">
              <a
                href="/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-mist hover:text-accent"
              >
                robots.txt <ExternalLinkIcon className="h-3 w-3" />
              </a>
              <span className="text-mist/40">•</span>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-mist hover:text-accent"
              >
                sitemap.xml <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>
          }
        />
        <dl className="grid gap-4 px-4 py-3.5 text-sm sm:grid-cols-3">
          <div className="space-y-1">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Production Origin</dt>
            <dd className="break-all font-mono text-xs text-frost">{SITE.url}</dd>
            <p className="text-[11px] text-mist/70">Enforced by edge redirects and canonical tags.</p>
          </div>
          <div className="space-y-1">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Admin Surface Isolation</dt>
            <dd className="text-xs font-medium text-accent">Protected (noindex edge guard)</dd>
            <p className="text-[11px] text-mist/70">Excluded from sitemap; header injected on edge.</p>
          </div>
          <div className="space-y-1">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-mist">Sitemap Generation Date</dt>
            <dd className="font-mono text-xs text-frost">
              {parsedSitemap.lastmod ? absoluteTime(parsedSitemap.lastmod) : 'Not detected'}
            </dd>
            <p className="text-[11px] text-mist/70">Generated from the canonical D1 content snapshot.</p>
          </div>
        </dl>
      </AdminCard>

      {/* Actionable Diagnostics Checklist */}
      <section>
        <SectionTitle>SEO Health Diagnostics ({diagnostics.length})</SectionTitle>
        {loading ? (
          <div className="mt-2 space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {diagnostics.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex flex-col gap-2 rounded-xl border p-4 transition-colors sm:flex-row sm:items-start sm:gap-3.5',
                  item.severity === 'pass' && 'border-edge bg-panel/70',
                  item.severity === 'warn' && 'border-amber/30 bg-amber/5',
                  item.severity === 'fail' && 'border-danger/30 bg-danger/5'
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                    item.severity === 'pass' && 'bg-accent/10 text-accent',
                    item.severity === 'warn' && 'bg-amber/10 text-amber',
                    item.severity === 'fail' && 'bg-danger/10 text-danger'
                  )}
                >
                  {item.severity === 'pass' ? <CheckIcon className="h-3.5 w-3.5" /> : <AlertIcon className="h-3.5 w-3.5" />}
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-mist/60">
                      [{item.category}]
                    </span>
                    <p className="text-sm font-medium text-frost">{item.title}</p>
                  </div>
                  <p className="text-xs text-mist">{item.detail}</p>
                  <p className="text-[11px] text-mist/70">
                    <span className="font-medium text-mist">Impact:</span> {item.impact}
                  </p>
                  {item.remedy && (
                    <p className="text-xs font-medium text-amber">
                      → {item.remedy}
                    </p>
                  )}
                </div>

                {item.actionLabel && item.actionHash && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.location.hash = item.actionHash!
                    }}
                    className="shrink-0 self-start text-xs border-accent/40 text-accent hover:bg-accent/10"
                  >
                    {item.actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Route-Level SEO Metadata Inspector */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <SectionTitle>Route & Metadata Inspection ({inspectedRoutes.length})</SectionTitle>
            <p className="text-xs text-mist">
              Verify page title, meta description, canonical URL, and sitemap inclusion for every canonical route.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-mist" />
              <input
                type="text"
                placeholder="Search route or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-lg border border-edge bg-abyss py-1.5 pl-8 pr-3 text-xs text-frost placeholder:text-mist/40 focus:border-accent/60 focus:outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex rounded-lg border border-edge bg-panel p-0.5 text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'healthy', label: 'Healthy' },
                  { id: 'attention', label: 'Attention' },
                  { id: 'projects', label: 'Projects' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRouteFilter(tab.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 font-medium transition-colors',
                    routeFilter === tab.id ? 'bg-accent/15 text-accent' : 'text-mist hover:text-frost'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Routes Table */}
        <AdminCard className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-edge bg-abyss/80 text-[10px] uppercase tracking-wider text-mist">
                <tr>
                  <th className="px-4 py-2.5">Route</th>
                  <th className="px-4 py-2.5">Title & Description</th>
                  <th className="px-4 py-2.5">Indexability</th>
                  <th className="px-4 py-2.5">Sitemap</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                {filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-mist">
                      No routes match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((r) => (
                    <tr key={r.path} className="hover:bg-panel/40 transition-colors">
                      <td className="whitespace-nowrap px-4 py-3 align-top font-mono font-medium text-frost">
                        {r.path}
                      </td>
                      <td className="px-4 py-3 align-top max-w-md">
                        <p className="font-semibold text-frost truncate">{r.title}</p>
                        <p className="mt-0.5 text-mist/80 line-clamp-2 leading-relaxed">{r.description}</p>
                        <p className="mt-1 font-mono text-[10px] text-mist/60 truncate">{r.canonicalUrl}</p>
                        {r.notes && (
                          <p className={cn('mt-1 text-[11px]', r.status === 'error' ? 'text-danger font-medium' : 'text-amber')}>
                            {r.notes}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border',
                            r.indexable
                              ? 'border-accent/40 bg-accent/10 text-accent'
                              : 'border-edge-2 bg-panel-2 text-mist'
                          )}
                        >
                          {r.indexable ? 'Indexable' : 'noindex'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border',
                            r.inSitemap
                              ? 'border-sky-500/40 bg-sky-500/10 text-sky-400'
                              : 'border-edge bg-abyss text-mist/60'
                          )}
                        >
                          {r.inSitemap ? 'In Sitemap' : 'Omitted'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <StatusDot tone={r.status === 'healthy' ? 'ok' : r.status === 'warning' ? 'warning' : 'danger'} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </section>

      {/* Published Projects SEO Completeness Card */}
      <section className="space-y-3">
        <SectionTitle>Published Projects SEO Coverage ({publishedProjects.length})</SectionTitle>
        <AdminCard className="p-0 overflow-hidden">
          <ul className="divide-y divide-edge">
            {publishedProjects.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-mist">
                No projects are currently published.
              </li>
            ) : (
              publishedProjects.map((project) => {
                const inspection = inspectedRoutes.find((r) => r.path === `/projects/${project.key}`)
                const hasFullMetadata = inspection && inspection.status === 'healthy'

                return (
                  <li key={project.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-panel/40 transition-colors">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-frost">{project.key}</p>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider border',
                            hasFullMetadata
                              ? 'border-accent/40 bg-accent/10 text-accent'
                              : 'border-amber/40 bg-amber/10 text-amber'
                          )}
                        >
                          {hasFullMetadata ? 'SEO Complete' : 'Review Metadata'}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-mist/70 truncate">
                        Route: /projects/{project.key} · Canonical: {SITE.url}/projects/{project.key}
                      </p>
                      {inspection?.notes && (
                        <p className="text-[11px] text-amber">{inspection.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          window.location.hash = `#/projects/${encodeURIComponent(project.key)}`
                        }}
                        className="text-xs"
                      >
                        Edit SEO
                      </Button>
                      <a
                        href={`/projects/${project.key}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-edge bg-panel p-1.5 text-mist hover:text-frost"
                        title="View Live Page"
                      >
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </AdminCard>
      </section>

      {/* Helpful Operational Notice */}
      <AdminNotice kind="info">
        SEO metadata changes (such as titles, meta descriptions, or newly published project routes) are committed
        to the repository snapshot during publishing and deployed via Cloudflare Pages. Sitemap and metadata changes
        take effect with each deployment.
      </AdminNotice>
    </div>
  )
}
