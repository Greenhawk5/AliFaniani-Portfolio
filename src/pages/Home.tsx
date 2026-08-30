import { Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { SITE } from '@/app/config'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { projects } from '@/data/projects'
import { ArrowRightIcon } from '@/components/ui/icons'
import { GooExperienceIcon } from '@/components/home/GooExperienceIcon'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4'

const PRIMARY_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Projects', to: '/projects' },
  { label: 'Contact', to: '/contact' },
] as const

/**
 * Lightweight, SEO-first landing page for `/`.
 *
 * This page must never import the 3D room (Scene, three, drei, GLB assets) —
 * the interactive experience lives on /room and is code-split there. All
 * content is real, semantic HTML driven by the shared profile/project data.
 */
export default function Home() {
  useDocumentMeta({
    title: 'Ali Faniani — Software Developer',
    description:
      'Portfolio of Ali Faniani, software developer and computer science graduate focused on Artificial Intelligence, backend development, web applications, and automation.',
  })

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Decorative background — subtle technical grid + restrained glow */}
      <div aria-hidden="true" className="landing-grid pointer-events-none absolute inset-0" />
      <div aria-hidden="true" className="landing-glow pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 md:px-8">
        {/* Top meta row */}
        <header className="flex items-center justify-between pt-6 animate-fade-up">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center">
              <BrandLogo />
            </span>
            <span className="font-mono text-[10px] tracking-[0.3em] text-mist uppercase">
              Portfolio
            </span>
          </div>
          <p className="hidden items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-mist/70 uppercase sm:flex">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent"
            />
            Open to freelance &amp; full-time
          </p>
        </header>

        {/* Main composition: identity left, CTA right */}
        <main className="grid flex-1 content-center gap-14 py-14 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <section aria-label="Introduction">
            <p className="animate-fade-up font-mono text-[11px] tracking-[0.3em] text-accent uppercase">
              AI · Backend · Web · Automation
            </p>
            <h1
              className="animate-fade-up mt-5 text-5xl leading-[1.05] font-semibold tracking-tight text-frost sm:text-6xl xl:text-7xl"
              style={{ animationDelay: '80ms' }}
            >
              <span className="block">{SITE.name}</span>
              <span className="text-glow mt-2 block text-3xl text-accent sm:text-4xl xl:text-5xl">
                Software Developer
              </span>
            </h1>
            <p
              className="animate-fade-up mt-6 max-w-xl text-base leading-relaxed text-mist md:text-lg"
              style={{ animationDelay: '160ms' }}
            >
              Computer science graduate building practical software systems across
              Artificial Intelligence, backend engineering, web applications, and
              automation.
            </p>

            <nav
              aria-label="Primary"
              className="animate-fade-up mt-10 flex flex-col items-start"
              style={{ animationDelay: '240ms' }}
            >
              {PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`group flex items-center gap-4 py-2.5 text-lg text-mist transition-colors hover:text-frost ${focusRing}`}
                >
                  <span
                    aria-hidden="true"
                    className="h-px w-7 bg-edge-2 transition-all duration-300 group-hover:w-12 group-hover:bg-accent"
                  />
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="animate-fade-up mt-10" style={{ animationDelay: '320ms' }}>
              <p className="font-mono text-[10px] tracking-[0.3em] text-mist/60 uppercase">
                Selected work
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {projects.map((project) => (
                  <Link
                    key={project.slug}
                    to={`/projects/${project.slug}`}
                    className={`flex items-center gap-2 rounded-full border border-edge-2 bg-panel/60 px-4 py-2.5 text-sm text-frost transition-colors hover:border-accent/50 hover:text-accent ${focusRing}`}
                  >
                    {project.title}
                    <ArrowRightIcon className="h-3 w-3 text-accent/70" />
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section
            aria-label="Interactive experience"
            className="animate-fade-up flex items-center lg:justify-end"
            style={{ animationDelay: '300ms' }}
          >
            <Link
              to="/room"
              aria-label="Enter the 3D experience"
              className={`group flex flex-col items-center gap-6 rounded-2xl p-4 text-center transition-transform duration-300 hover:scale-[1.03] focus-visible:scale-[1.03] lg:items-end ${focusRing}`}
            >
              <GooExperienceIcon className="h-24 w-24 text-accent drop-shadow-[0_0_14px_rgba(57,255,139,0.3)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_26px_rgba(57,255,139,0.55)] md:h-28 md:w-28" />
              <span className="font-mono text-2xl leading-snug font-semibold tracking-wide text-frost transition-colors duration-300 group-hover:text-accent md:text-3xl lg:self-start lg:text-left">
                Enter the
                <br />
                3D experience
                <ArrowRightIcon className="ml-2 inline-block h-6 w-6 align-baseline text-accent transition-transform duration-300 group-hover:translate-x-2 md:h-7 md:w-7" />
              </span>
              <span className="max-w-xs text-sm leading-relaxed text-mist lg:self-start lg:text-left">
                Explore my interactive 3D developer room — workspace, project
                showcase and a live day/night cycle.
              </span>
            </Link>
          </section>
        </main>

        {/* Bottom meta strip */}
        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-edge py-5 font-mono text-[11px] text-mist/70">
          <p>
            © {new Date().getFullYear()} {SITE.name}
          </p>
          <p>Jahrom County, Fars Province, Iran · Remote / Worldwide</p>
          <p>React · TypeScript · Three.js</p>
        </footer>
      </div>
    </div>
  )
}
