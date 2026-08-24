import { useParams, Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/ui/PageTransition'
import { PageContainer, Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Badge, TechTag } from '@/components/ui/Badge'
import { ProjectArt } from '@/components/ui/ProjectArt'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Spinner'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  GitHubIcon,
} from '@/components/ui/icons'
import { getAdjacentProjects, getProjectBySlug } from '@/data/projects'

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const project = getProjectBySlug(slug ?? '')
  const { prev, next } = getAdjacentProjects(slug ?? '')

  useDocumentMeta({
    title: project ? project.title : 'Project not found',
    description: project?.description ?? 'Project details',
  })

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

        <header>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{project.title}</h1>
            <Badge tone="accent">{project.year}</Badge>
          </div>
          <p className="mt-3 text-lg text-mist">{project.tagline}</p>
          <p className="mt-4 max-w-2xl leading-relaxed text-frost/80">{project.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {project.links.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                <Button variant={link.label === 'GitHub' ? 'primary' : 'outline'} size="sm">
                  {link.label === 'GitHub' ? (
                    <GitHubIcon className="h-4 w-4" />
                  ) : (
                    <ExternalLinkIcon className="h-4 w-4" />
                  )}
                  {link.label}
                </Button>
              </a>
            ))}
          </div>
        </header>

        <ProjectArt
          initial={project.initial}
          accent={project.accent}
          accent2={project.accent2}
          className="mt-10 h-64 w-full rounded-2xl border border-edge md:h-80"
        />

        <Section title="Overview" subtitle="What & why">
          <p className="max-w-3xl leading-relaxed text-frost/80">{project.overview}</p>
        </Section>

        <Section title="Technologies" subtitle="Built with">
          <div className="flex flex-wrap gap-2">
            {project.technologies.map((t) => (
              <TechTag key={t}>{t}</TechTag>
            ))}
          </div>
        </Section>

        <Section title="Goals" subtitle="Objectives">
          <ul className="grid max-w-3xl gap-3">
            {project.goals.map((goal, i) => (
              <li key={i} className="flex gap-3 text-frost/80">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_8px_rgba(57,255,139,0.8)]" />
                {goal}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Architecture" subtitle="How it works">
          <Card className="p-6">
            <ul className="space-y-3">
              {project.architecture.map((item, i) => (
                <li key={i} className="flex gap-3 font-mono text-sm text-frost/75">
                  <span className="text-accent/70">{String(i + 1).padStart(2, '0')}</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </Section>

        <Section title="Development process" subtitle="Decisions">
          <div className="grid max-w-4xl gap-4 md:grid-cols-2">
            {project.process.map((entry, i) => (
              <Card key={i} className="p-5">
                <p className="font-mono text-[11px] tracking-widest text-danger uppercase">
                  Challenge
                </p>
                <p className="mt-2 text-sm leading-relaxed text-frost/80">{entry.challenge}</p>
                <p className="mt-4 font-mono text-[11px] tracking-widest text-accent uppercase">
                  Solution
                </p>
                <p className="mt-2 text-sm leading-relaxed text-frost/80">{entry.solution}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Challenges & results" subtitle="Outcome">
          <div className="grid max-w-4xl gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-mono text-xs tracking-[0.2em] text-amber uppercase">
                Challenges
              </h3>
              <ul className="space-y-2.5">
                {project.challenges.map((c, i) => (
                  <li key={i} className="text-sm leading-relaxed text-frost/75">
                    — {c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-3 font-mono text-xs tracking-[0.2em] text-accent uppercase">
                Results
              </h3>
              <ul className="space-y-2.5">
                {project.results.map((r, i) => (
                  <li key={i} className="text-sm leading-relaxed text-frost/75">
                    — {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        <nav className="mt-8 grid gap-4 border-t border-edge pt-8 sm:grid-cols-2" aria-label="Project navigation">
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

