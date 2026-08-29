import { projects } from './projects'
import { SITE } from '@/app/config'

export interface RouteHeadMeta {
  title: string
  description: string
}

/** Room experience metadata — shared by the Room page and its JSON-LD. */
export const ROOM_META: RouteHeadMeta = {
  title: 'Interactive 3D Portfolio — Ali Faniani',
  description:
    'Explore the interactive 3D developer room of Ali Faniani — walk through his workspace, browse his projects on the showcase board and try the live day/night cycle.',
}

/** Metadata for invalid project slugs (noindex). */
export const PROJECT_NOT_FOUND_META: RouteHeadMeta = {
  title: 'Page Not Found — Ali Faniani',
  description: 'This project does not exist.',
}

/**
 * Initial-HTML head metadata per indexable route. Consumed by the page
 * components (runtime) and by scripts/generate-route-html.mjs (build time),
 * so crawlers that never execute JavaScript still receive route-correct
 * canonical/title/OG metadata. Project entries derive from projects.ts —
 * the single source of truth for project data.
 */
export const ROUTE_META: Record<string, RouteHeadMeta> = {
  '/about': {
    title: 'About Ali Faniani — Software Developer',
    description:
      'About Ali Faniani — software developer focused on AI, backend engineering and modern web technologies. Skills, education, certificates and projects.',
  },
  '/projects': {
    title: 'Projects — Ali Faniani',
    description:
      'Selected projects by Ali Faniani — AI, backend, web development, and automation projects.',
  },
  '/contact': {
    title: 'Contact Ali Faniani — Software Developer',
    description: `Contact Ali Faniani — ${SITE.availability}.`,
  },
  '/room': ROOM_META,
  ...Object.fromEntries(
    projects.map((project) => [
      `/projects/${project.slug}`,
      {
        title: `${project.title} — Ali Faniani`,
        description: project.shortDescription,
      },
    ])
  ),
}
