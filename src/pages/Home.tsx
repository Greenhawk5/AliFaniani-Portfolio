import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { SITE } from '@/app/config'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { featuredProjects } from '@/stores/projectStore'
import { ArrowRightIcon } from '@/components/ui/icons'
import { GooExperienceIcon } from '@/components/home/GooExperienceIcon'
import { ProjectCarousel } from '@/components/ui/ProjectCarousel'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4'

const PRIMARY_LINKS = [
  { label: 'About', to: '/about' },
  { label: 'Projects', to: '/projects' },
  { label: 'Contact', to: '/contact' },
] as const

interface PublicStats {
  totalVisitors: number
  totalViews: number
  activeProjects: number
}

/**
 * Lightweight, SEO-first landing page for `/`.
 *
 * This page must never import the 3D room (Scene, three, drei, GLB assets) —
 * the interactive experience lives on /room and is code-split there. All
 * content is real, semantic HTML driven by the shared profile/project data.
 */
export default function Home() {
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/analytics/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PublicStats | null) => {
        if (!cancelled && data && typeof data.totalVisitors === 'number') {
          setStats(data)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useDocumentMeta({
    title: 'Ali Faniani — Software Developer',
    description:
      'Ali Faniani is a software developer building practical software systems across AI, backend engineering, web, and automation with modern technologies.',
  })

  const carouselItems = featuredProjects()

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

          <div className="flex items-center gap-4">
            {stats && (
              <span className="hidden items-center gap-1.5 rounded-full border border-edge-2 bg-panel-2/70 px-2.5 py-1 font-mono text-[10px] text-mist/80 sm:inline-flex">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                {stats.totalVisitors.toLocaleString()} visits
              </span>
            )}
            <p className="hidden items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-mist/70 uppercase sm:flex">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-accent"
              />
              Open to freelance &amp; full-time
            </p>
          </div>
        </header>

        {/* Main composition: identity left, CTA right */}
        <main className="grid flex-1 content-center gap-12 py-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
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
              className="animate-fade-up mt-8 flex flex-col items-start"
              style={{ animationDelay: '240ms' }}
            >
              {PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`group flex items-center gap-4 py-2 text-lg text-mist transition-colors hover:text-frost ${focusRing}`}
                >
                  <span
                    aria-hidden="true"
                    className="h-px w-7 bg-edge-2 transition-all duration-300 group-hover:w-12 group-hover:bg-accent"
                  />
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Selected work — Intelligent interactive carousel */}
            <div className="animate-fade-up mt-8 max-w-xl" style={{ animationDelay: '320ms' }}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[10px] tracking-[0.3em] text-mist/60 uppercase">
                  Selected work
                </p>
                <Link
                  to="/projects"
                  className="font-mono text-[10px] tracking-wider text-accent/80 hover:text-accent hover:underline"
                >
                  View all ({stats?.activeProjects ?? 6}) →
                </Link>
              </div>
              <ProjectCarousel projects={carouselItems} />
            </div>
          </section>

          {/* Interactive 3D room experience CTA */}
          <section
            aria-label="Interactive experience"
            className="animate-fade-up flex items-center lg:justify-end"
            style={{ animationDelay: '300ms' }}
          >
            <Link
              to="/room"
              aria-label="Enter the 3D developer room experience"
              className={`group relative flex w-full max-w-md flex-col items-start gap-5 overflow-hidden rounded-2xl border border-edge-2 bg-gradient-to-b from-panel/90 via-panel/75 to-panel-2/80 p-6 backdrop-blur-md transition-all duration-300 hover:border-accent/50 hover:shadow-[0_0_40px_-10px_rgba(57,255,139,0.25)] focus-visible:scale-[1.01] ${focusRing}`}
            >
              {/* Subtle ambient light pool in card */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/10 blur-2xl transition-opacity duration-300 group-hover:bg-accent/20"
              />

              {/* Status pill badge */}
              <div className="flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 font-mono text-[10px] tracking-wider text-accent uppercase">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                Interactive 3D Scene
              </div>

              <div className="flex w-full items-center justify-between gap-4">
                <GooExperienceIcon className="h-16 w-16 text-accent drop-shadow-[0_0_12px_rgba(57,255,139,0.35)] transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_24px_rgba(57,255,139,0.6)] sm:h-20 sm:w-20" />
                <ArrowRightIcon className="h-7 w-7 text-accent/80 transition-transform duration-300 group-hover:translate-x-2 group-hover:text-accent" />
              </div>

              <div>
                <span className="font-mono text-2xl font-semibold tracking-wide text-frost transition-colors duration-300 group-hover:text-accent sm:text-3xl">
                  Enter the 3D Room
                </span>
                <p className="mt-2 text-sm leading-relaxed text-mist">
                  Explore my interactive 3D developer workspace — project showcase,
                  retro-futuristic desk, and live synchronized day/night cycle.
                </p>
              </div>

              <div className="flex items-center gap-2 border-t border-edge/60 pt-3 font-mono text-[11px] text-accent/90">
                <span>Launch Experience</span>
                <span aria-hidden="true">→</span>
              </div>
            </Link>
          </section>
        </main>

        {/* Bottom meta strip */}
        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-edge py-5 font-mono text-[11px] text-mist/70">
          <p>
            © {new Date().getFullYear()} {SITE.name}
          </p>
          <p>Jahrom County, Fars Province, Iran · Remote / Worldwide</p>
          <div className="flex items-center gap-3">
            <span>React · TypeScript · Three.js</span>
            {stats && (
              <span className="text-mist/40">· {stats.totalVisitors.toLocaleString()} total visits</span>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
