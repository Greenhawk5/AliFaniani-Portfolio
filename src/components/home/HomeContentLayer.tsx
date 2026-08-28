import { Link } from 'react-router-dom'
import { projects } from '@/data/projects'
import { profile } from '@/data/profile'
import { SITE } from '@/app/config'
import { ArrowRightIcon } from '@/components/ui/icons'

/**
 * Crawlable, screen-reader-accessible content layer for the 3D homepage.
 *
 * The 3D room renders identity and project information into canvas textures,
 * which carry no meaning for search engines or assistive technology. This
 * layer mirrors that content as real HTML:
 * - a visually hidden (sr-only) semantic block with the H1 and introduction,
 * - a compact, visible project strip so every project page is linked from
 *   the homepage with a real anchor.
 *
 * It also serves users who cannot run WebGL or experience a scene failure,
 * giving them immediate, meaningful navigation.
 */
export function HomeContentLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Semantic identity layer — visually hidden, fully accessible to
          assistive technology and present in the DOM for crawlers. */}
      <div className="sr-only">
        <h1>
          {profile.hero.name} — {SITE.shortRole}
        </h1>
        <p>{profile.hero.intro}</p>
        <p>{profile.about[1]}</p>
      </div>

      {/* Visible project strip (desktop) — real HTML links, outside the canvas. */}
      <nav
        aria-label="Featured projects"
        className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6 hidden flex-col items-start gap-2 lg:flex"
      >
        <p className="font-mono text-[10px] tracking-[0.25em] text-mist/60 uppercase">
          Featured projects
        </p>
        {projects.map((project) => (
          <Link
            key={project.slug}
            to={`/projects/${project.slug}`}
            className="flex w-fit items-center gap-2 rounded-full border border-edge-2 bg-panel/80 px-3.5 py-1.5 text-xs text-frost backdrop-blur-md transition-colors hover:border-accent/50 hover:text-accent"
          >
            {project.title}
            <ArrowRightIcon className="h-3 w-3 text-accent/70" />
          </Link>
        ))}
      </nav>
    </div>
  )
}
