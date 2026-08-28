import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/ui/PageTransition'
import { PageContainer, Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Badge, TechTag } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProjectGallery } from '@/components/ui/ProjectGallery'
import { EmptyState } from '@/components/ui/Spinner'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  GitHubIcon,
} from '@/components/ui/icons'
import { getAdjacentProjects, getProjectBySlug, type BannerConfig } from '@/data/projects'
import { SITE } from '@/app/config'
import { useJsonLd } from '@/hooks/useJsonLd'

/**
 * Full-bleed banner presentation using controlled cropping (object-cover).
 * Per-project bannerConfig supports desktop/mobile overrides for
 * object-position and scale so key artwork never gets cropped away.
 */
function ProjectBanner({ banner, bannerConfig }: { banner: string; bannerConfig?: BannerConfig }) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const crop = isMobile
    ? { objectPosition: 'center', scale: 1, ...bannerConfig, ...bannerConfig?.mobile }
    : { objectPosition: 'center', scale: 1, ...bannerConfig, ...bannerConfig?.desktop }

  return (
    <div className="mt-10 aspect-[21/9] overflow-hidden rounded-2xl border border-edge max-md:aspect-[16/10]">
      <img
        src={banner}
        alt="Project banner"
        className="h-full w-full object-cover"
        style={{
          objectPosition: crop.objectPosition,
          transform: `scale(${crop.scale})`,
        }}
      />
    </div>
  )
}

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const project = getProjectBySlug(slug ?? '')
  const { prev, next } = getAdjacentProjects(slug ?? '')

  useDocumentMeta({
    title: project ? `${project.title} — Ali Faniani` : 'Page Not Found — Ali Faniani',
    description: project?.shortDescription ?? 'This project does not exist.',
    noindex: !project,
  })

  useJsonLd(
    'project-detail',
    project
      ? {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          '@id': `${SITE.url}/projects/${project.slug}#project`,
          url: `${SITE.url}/projects/${project.slug}`,
          name: project.title,
          headline: project.subtitle,
          description: project.overview,
          genre: project.category,
          keywords: project.technologies.join(', '),
          dateCreated: String(project.year),
          author: { '@id': `${SITE.url}/#person` },
        }
      : null
  )

  if (!project) {
    return (
      <PageTransition>
        <PageContainer className="pt-32 pb-20">
          <EmptyState
            title="Project not found"
            description="The project you are looking for does not exist or has been moved."
          />
          <div className="mt-8 text-center">
            <Link to="/projects">
              <Button variant="outline">
                <ChevronLeftIcon className="h-4 w-4" /> Back to projects
              </Button>
            </Link>
          </div>
        </PageContainer>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <PageContainer className="pt-28 pb-20">
        <Link
          to="/projects"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-mist transition-colors hover:text-accent"
        >
          <ChevronLeftIcon className="h-4 w-4" /> All projects
        </Link>

        {/* Hero */}
        <header>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{project.title}</h1>
            <Badge tone="accent">{project.category}</Badge>
            <Badge>{project.year}</Badge>
          </div>
          <p className="mt-3 text-lg text-mist">{project.subtitle}</p>
          <p className="mt-4 max-w-2xl leading-relaxed text-frost/80">{project.shortDescription}</p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {project.technologies.map((t) => (
              <TechTag key={t}>{t}</TechTag>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={project.repository} target="_blank" rel="noreferrer">
              <Button>
                <GitHubIcon className="h-4 w-4" /> Repository
              </Button>
            </a>
            {project.demo && (
              <>
                <a href={project.demo} target="_blank" rel="noreferrer">
                  <Button variant="outline">
                    <ExternalLinkIcon className="h-4 w-4" /> Live demo
                  </Button>
                </a>
                {project.demoStatus && <span className="inline-flex items-center gap-1.5 text-xs text-danger"><span className="h-2 w-2 rounded-full bg-danger" />{project.demoStatus}</span>}
              </>
            )}
            {project.documentation && (
              <a href={project.documentation} target="_blank" rel="noreferrer">
                <Button variant="outline">
                  <ExternalLinkIcon className="h-4 w-4" /> Documentation
                </Button>
              </a>
            )}
          </div>
        </header>

        {/* Banner */}
        <ProjectBanner banner={project.banner} bannerConfig={project.bannerConfig} />

        {/* Overview */}
        <Section title="Overview" subtitle="What & why">
          <p className="max-w-3xl leading-relaxed text-frost/80">{project.overview}</p>
        </Section>

        {/* Key features */}
        <Section title="Key features" subtitle="What it does">
          <ul className="grid max-w-3xl gap-3">
            {project.features.map((feature) => (
              <li key={feature} className="flex gap-3 text-frost/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_8px_rgba(57,255,139,0.8)]" />
                {feature}
              </li>
            ))}
          </ul>
        </Section>

        {/* Architecture */}
        <Section title="Architecture" subtitle="How it works">
          <Card className="p-6">
            <ol className="space-y-3">
              {project.architecture.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed text-frost/75">
                  <span className="shrink-0 font-mono text-accent/70">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          </Card>
        </Section>

        {/* Tech stack */}
        <Section title="Technology stack" subtitle="Built with">
          <div className="grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.techGroups.map((group) => (
              <Card key={group.label} className="p-5">
                <h3 className="mb-3 font-mono text-xs tracking-[0.2em] text-accent uppercase">
                  {group.label}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <TechTag key={item}>{item}</TechTag>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* Links */}
        <Section title="Links" subtitle="Explore">
          <div className="flex flex-wrap gap-3">
            <a href={project.repository} target="_blank" rel="noreferrer">
              <Button variant="outline">
                <GitHubIcon className="h-4 w-4" /> Repository
              </Button>
            </a>
            {project.demo && (
              <>
                <a href={project.demo} target="_blank" rel="noreferrer">
                  <Button variant="outline">
                    <ExternalLinkIcon className="h-4 w-4" /> Live demo
                  </Button>
                </a>
                {project.demoStatus && <span className="inline-flex items-center gap-1.5 text-xs text-danger"><span className="h-2 w-2 rounded-full bg-danger" />{project.demoStatus}</span>}
              </>
            )}
            {project.documentation && (
              <a href={project.documentation} target="_blank" rel="noreferrer">
                <Button variant="outline">
                  <ExternalLinkIcon className="h-4 w-4" /> Documentation
                </Button>
              </a>
            )}
          </div>
        </Section>

        {/* Gallery — final content section */}
        <Section title="Gallery" subtitle="Screenshots">
          <ProjectGallery images={project.screenshots} />
        </Section>

        <nav
          className="mt-8 grid gap-4 border-t border-edge pt-8 sm:grid-cols-2"
          aria-label="Project navigation"
        >
          {prev && (
            <Link
              to={`/projects/${prev.slug}`}
              className="card-hover group rounded-2xl border border-edge bg-panel p-5"
            >
              <span className="flex items-center gap-1.5 text-xs text-mist">
                <ChevronLeftIcon className="h-3.5 w-3.5" /> Previous
              </span>
              <span className="mt-2 block font-semibold text-frost transition-colors group-hover:text-accent">
                {prev.title}
              </span>
            </Link>
          )}
          {next && (
            <Link
              to={`/projects/${next.slug}`}
              className="card-hover group rounded-2xl border border-edge bg-panel p-5 sm:text-right"
            >
              <span className="flex items-center gap-1.5 text-xs text-mist sm:justify-end">
                Next <ChevronRightIcon className="h-3.5 w-3.5" />
              </span>
              <span className="mt-2 block font-semibold text-frost transition-colors group-hover:text-accent">
                {next.title}
              </span>
            </Link>
          )}
        </nav>
      </PageContainer>
    </PageTransition>
  )
}
