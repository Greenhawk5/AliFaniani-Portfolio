import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/ui/PageTransition'
import { PageContainer } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Badge, TechTag } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowRightIcon, ExternalLinkIcon } from '@/components/ui/icons'
import { projects as staticProjects, type Project } from '@/data/projects'
import { SITE } from '@/app/config'
import { ROUTE_META } from '@/data/route-meta'
import { useJsonLd } from '@/hooks/useJsonLd'

export default function Projects() {
  const [projectList, setProjectList] = useState<Project[]>(staticProjects)

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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projectList.map((project) => (
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
                    <Link to={`/projects/${project.slug}`}>
                      {project.title}
                    </Link>
                  </h2>
                  <span className="rounded border border-edge-2 bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-mist/70">
                    {project.year}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-mist">{project.subtitle}</p>
                <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-frost/70">
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
      </PageContainer>
    </PageTransition>
  )
}
