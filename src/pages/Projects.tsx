import { Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/ui/PageTransition'
import { PageContainer } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Badge, TechTag } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowRightIcon, ExternalLinkIcon } from '@/components/ui/icons'
import { projects } from '@/data/projects'

export default function Projects() {
  useDocumentMeta({
    title: 'Projects',
    description:
      'Selected projects by Ali Faniani — AI, backend, web development, and automation projects.',
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

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.slug}
              hover
              className="group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_-12px_rgba(57,255,139,0.35)]"
            >
              {/* Banner */}
              <Link
                to={`/projects/${project.slug}`}
                className="relative block aspect-[16/9] overflow-hidden border-b border-edge"
              >
                <img
                  src={project.banner}
                  alt={`${project.title} banner`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  style={{
                    objectPosition: project.bannerConfig?.mobile?.objectPosition ??
                      project.bannerConfig?.objectPosition ?? 'center',
                  }}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent to-transparent" />
                <span className="absolute top-3 left-3">
                  <Badge tone="glass">{project.category}</Badge>
                </span>
              </Link>

              {/* Content */}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-frost transition-colors group-hover:text-accent">
                    {project.title}
                  </h2>
                  <span className="font-mono text-[11px] text-mist">{project.year}</span>
                </div>
                <p className="mt-1 text-sm text-mist">{project.subtitle}</p>
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-frost/70">
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

                {/* Actions */}
                <div className="mt-auto flex items-center gap-2 pt-5">
                  <Link to={`/projects/${project.slug}`} className="flex-1">
                    <Button size="sm" className="w-full">
                      View details <ArrowRightIcon className="h-4 w-4" />
                    </Button>
                  </Link>
                  <a href={project.repository} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm" aria-label={`${project.title} repository`}>
                      <ExternalLinkIcon className="h-4 w-4" />
                      Repository
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
