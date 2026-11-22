import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/ui/PageTransition'
import { PageContainer } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Badge, TechTag } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowRightIcon, ExternalLinkIcon, SearchIcon, CloseIcon } from '@/components/ui/icons'
import { Select } from '@/components/ui/Select'
import { projects as staticProjects, type Project } from '@/data/projects'
import { SITE } from '@/app/config'
import { ROUTE_META } from '@/data/route-meta'
import { useJsonLd } from '@/hooks/useJsonLd'

type SortOption = 'latest' | 'oldest' | 'most-viewed' | 'least-viewed' | 'alphabetical'

export default function Projects() {
  const [projectList, setProjectList] = useState<Project[]>(staticProjects)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [tech, setTech] = useState<string>('all')
  const [sort, setSort] = useState<SortOption>('latest')

  useEffect(() => {
    let cancelled = false
    fetch('/api/projects')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Project[] | null) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setProjectList(data)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useDocumentMeta(ROUTE_META['/projects'])

  useJsonLd('projects-index', {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${SITE.url}/projects#projects`,
    url: `${SITE.url}/projects`,
    name: 'Projects by Ali Faniani',
    itemListElement: projectList.map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE.url}/projects/${project.slug}`,
      name: project.title,
    })),
  })

  // Extract distinct categories and technologies for filters
  const categories = useMemo(() => {
    return Array.from(new Set(projectList.map((p) => p.category))).sort()
  }, [projectList])

  const technologies = useMemo(() => {
    return Array.from(new Set(projectList.flatMap((p) => p.technologies))).sort()
  }, [projectList])

  const categoryOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Categories' },
      ...categories.map((c) => ({ value: c, label: c })),
    ]
  }, [categories])

  const techOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Technologies' },
      ...technologies.map((t) => ({ value: t, label: t })),
    ]
  }, [technologies])

  const sortOptions = useMemo(() => {
    return [
      { value: 'latest', label: 'Sort: Latest' },
      { value: 'oldest', label: 'Sort: Oldest' },
      { value: 'most-viewed', label: 'Sort: Most Viewed' },
      { value: 'least-viewed', label: 'Sort: Least Viewed' },
      { value: 'alphabetical', label: 'Sort: Alphabetical' },
    ]
  }, [])

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase()

    return projectList
      .filter((project) => {
        // Category filter
        if (category !== 'all' && project.category !== category) {
          return false
        }

        // Technology filter
        if (tech !== 'all' && !project.technologies.includes(tech)) {
          return false
        }

        // Search filter (whitespace-normalized, case-insensitive across full metadata)
        if (query) {
          const matchTitle = project.title.toLowerCase().includes(query)
          const matchSubtitle = project.subtitle?.toLowerCase().includes(query) ?? false
          const matchDesc = project.shortDescription?.toLowerCase().includes(query) ?? false
          const matchOverview = project.overview?.toLowerCase().includes(query) ?? false
          const matchCat = project.category.toLowerCase().includes(query)
          const matchTech = project.technologies.some((t) => t.toLowerCase().includes(query))
          const matchYear = String(project.year).includes(query)

          if (
            !matchTitle &&
            !matchSubtitle &&
            !matchDesc &&
            !matchOverview &&
            !matchCat &&
            !matchTech &&
            !matchYear
          ) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        switch (sort) {
          case 'oldest':
            return a.year - b.year || a.title.localeCompare(b.title)
          case 'most-viewed':
            return (b.views ?? 0) - (a.views ?? 0) || b.year - a.year
          case 'least-viewed':
            return (a.views ?? 0) - (b.views ?? 0) || a.year - b.year
          case 'alphabetical':
            return a.title.localeCompare(b.title)
          case 'latest':
          default:
            return b.year - a.year || a.title.localeCompare(b.title)
        }
      })
  }, [projectList, search, category, tech, sort])

  const hasActiveFilters = search.trim() !== '' || category !== 'all' || tech !== 'all'

  const resetFilters = () => {
    setSearch('')
    setCategory('all')
    setTech('all')
    setSort('latest')
  }

  return (
    <PageTransition>
      <PageContainer className="pt-28 pb-20">
        <header className="mb-10">
          <p className="mb-3 font-mono text-xs tracking-[0.25em] text-accent uppercase">
            Portfolio
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Projects</h1>
          <p className="mt-4 max-w-xl leading-relaxed text-mist">
            A selection of things I have designed, engineered and shipped. Each project page
            is a technical case study.
          </p>
        </header>

        {/* Discovery & Search Controls */}
        <section aria-label="Project discovery controls" className="mb-8 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md w-full">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-mist" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                aria-label="Search projects"
                className="w-full rounded-xl border border-edge-2 bg-panel/80 py-2.5 pr-10 pl-10 text-sm text-frost placeholder:text-mist/50 backdrop-blur-sm transition-colors focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search input"
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-mist hover:text-frost focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter and Sort Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              {/* Category Filter */}
              <Select
                id="category-select"
                value={category}
                options={categoryOptions}
                onChange={setCategory}
                ariaLabel="Filter by category"
                className="w-full sm:w-auto min-w-[9.5rem]"
              />

              {/* Technology Filter */}
              <Select
                id="tech-select"
                value={tech}
                options={techOptions}
                onChange={setTech}
                ariaLabel="Filter by technology"
                className="w-full sm:w-auto min-w-[10rem]"
              />

              {/* Sort Selector */}
              <Select
                id="sort-select"
                value={sort}
                options={sortOptions}
                onChange={(val) => setSort(val as SortOption)}
                ariaLabel="Sort projects"
                className="w-full sm:w-auto min-w-[9.5rem]"
              />
            </div>
          </div>

          {/* Active Filter Pills and Stats Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge/60 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-mist">
                Showing{' '}
                <strong className="font-semibold text-accent">{filteredProjects.length}</strong> of{' '}
                {projectList.length} projects
              </span>

              {category !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 font-mono text-[11px] text-accent">
                  Category: {category}
                  <button
                    type="button"
                    onClick={() => setCategory('all')}
                    aria-label={`Remove ${category} filter`}
                    className="hover:text-frost"
                  >
                    ×
                  </button>
                </span>
              )}

              {tech !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-0.5 font-mono text-[11px] text-cyan">
                  Tech: {tech}
                  <button
                    type="button"
                    onClick={() => setTech('all')}
                    aria-label={`Remove ${tech} filter`}
                    className="hover:text-frost"
                  >
                    ×
                  </button>
                </span>
              )}

              {search.trim() && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 font-mono text-[11px] text-amber">
                  Query: &ldquo;{search.trim()}&rdquo;
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Remove search query"
                    className="hover:text-frost"
                  >
                    ×
                  </button>
                </span>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-mono text-xs text-mist underline underline-offset-2 transition-colors hover:text-accent"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Empty State */}
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-edge-2 bg-panel/60 p-12 text-center backdrop-blur-sm">
            <SearchIcon className="h-10 w-10 text-mist/40" />
            <h2 className="mt-4 text-lg font-semibold text-frost">No matching projects found</h2>
            <p className="mt-1.5 max-w-sm text-sm text-mist">
              We couldn&apos;t find any projects matching your current filters and search query.
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-6">
              Reset all filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card
                key={project.slug}
                hover
                className="group flex h-full flex-col overflow-hidden border border-edge-2 transition-all duration-300 hover:border-accent/40 hover:shadow-[0_0_40px_-12px_rgba(57,255,139,0.35)]"
              >
                {/* Banner */}
                <Link
                  to={`/projects/${project.slug}`}
                  className="relative block aspect-[16/9] w-full overflow-hidden border-b border-edge bg-panel-2"
                >
                  <img
                    src={project.banner}
                    alt={`${project.title} banner`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{
                      objectPosition:
                        project.bannerConfig?.mobile?.objectPosition ??
                        project.bannerConfig?.objectPosition ??
                        'center',
                    }}
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-void/90 via-void/20 to-transparent" />
                  <span className="absolute top-3 left-3">
                    <Badge tone="glass">{project.category}</Badge>
                  </span>
                  {project.featured && (
                    <span className="absolute top-3 right-3 rounded-full border border-accent/40 bg-void/80 px-2 py-0.5 font-mono text-[9px] font-semibold text-accent backdrop-blur-sm">
                      FEATURED
                    </span>
                  )}
                </Link>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-frost transition-colors group-hover:text-accent sm:text-xl">
                      <Link to={`/projects/${project.slug}`}>{project.title}</Link>
                    </h2>
                    <span className="rounded border border-edge-2 bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-mist/70">
                      {project.year}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-mist">{project.subtitle}</p>
                  {/* Natural wrapping without truncation, keeping flex-1 layout */}
                  <p className="mt-2.5 text-sm leading-relaxed text-frost/70 break-words [overflow-wrap:anywhere]">
                    {project.shortDescription}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {project.technologies.slice(0, 4).map((t) => (
                      <TechTag key={t}>{t}</TechTag>
                    ))}
                    {project.technologies.length > 4 && (
                      <TechTag>+{project.technologies.length - 4}</TechTag>
                    )}
                  </div>

                  {/* Actions with normalized bottom alignment */}
                  <div className="mt-auto flex items-center gap-2 border-t border-edge/50 pt-4">
                    <Link to={`/projects/${project.slug}`} className="flex-1 min-w-[120px]">
                      <Button size="sm" className="w-full justify-center">
                        View details <ArrowRightIcon className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <a
                      href={project.repository}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`${project.title} repository`}
                        className="px-3"
                      >
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Repo</span>
                        <span className="sm:hidden">Code</span>
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </PageTransition>
  )
}
