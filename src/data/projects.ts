import snapshot from './generated/content.json'
import type { Project } from './types'

/**
 * GENERATED FACADE — do not edit content here.
 *
 * CMS-managed content lives in D1 and reaches this module via the build-time
 * content snapshot (src/data/generated/content.json, produced by
 * scripts/export-d1-snapshot.mjs). During the Phase 2 migration window the
 * committed snapshot is kept in git; after cutover it is regenerated from
 * production D1 on every production build (fallback rules documented in the
 * exporter).
 *
 * Media references are stable root-relative paths (/media/...) served from
 * dist/media/ (copied from docs/ by scripts/generate-media-manifest.mjs).
 *
 * Same named exports as the pre-CMS data module, so consumers are unchanged.
 */
export type { Project, BannerConfig, TechGroup } from './types'

export const projects: Project[] = snapshot.projects

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug)
}

export function getAdjacentProjects(slug: string) {
  const index = projects.findIndex((project) => project.slug === slug)
  if (index === -1) return { prev: undefined, next: undefined }
  return {
    prev: projects[(index - 1 + projects.length) % projects.length],
    next: projects[(index + 1) % projects.length],
  }
}
