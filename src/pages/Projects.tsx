import { Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/ui/PageTransition'
import { PageContainer } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { TechTag } from '@/components/ui/Badge'
import { ProjectArt } from '@/components/ui/ProjectArt'
import { ArrowRightIcon } from '@/components/ui/icons'
import { projects } from '@/data/projects'

export default function Projects() {
  useDocumentMeta({
    title: 'Projects',
    description:
      'Selected projects by Ali Faniani — WebGL experiences, AI platforms, realtime systems and developer tools.',
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

        <div className="grid gap-6 sm:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.slug} hover className="group flex flex-col overflow-hidden">
              <Link to={`/projects/${project.slug}`} className="flex h-full flex-col">
                <ProjectArt
                  initial={project.initial}
                  accent={project.accent}
                  accent2={project.accent2}
                  className="h-44 w-full transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-frost transition-colors group-hover:text-accent">
                      {project.title}
                    </h2>
                    <span className="font-mono text-[11px] text-mist">{project.year}</span>
                  </div>
                  <p className="mt-1 text-sm text-mist">{project.tagline}</p>
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-frost/70">
                    {project.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {project.technologies.slice(0, 4).map((t) => (
                      <TechTag key={t}>{t}</TechTag>
                    ))}
                    {project.technologies.length > 4 && (
                      <TechTag>+{project.technologies.length - 4}</TechTag>
                    )}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                    View project
                    <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </PageContainer>
    </PageTransition>
  )
}
