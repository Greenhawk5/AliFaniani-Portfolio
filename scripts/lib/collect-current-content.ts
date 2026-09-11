/**
 * Collects the current content for migration/parity checking.
 *
 * AUTHORITY LIFECYCLE:
 *  - Migration window (Phase 2): reads the pre-CMS TypeScript data files —
 *    the then-authoritative source. Recovers full docs/ media paths.
 *  - Post-cutover: reads the committed snapshot instead. Re-seeding from a
 *    snapshot is a no-op when D1 already matches (idempotent upserts) and
 *    is rejected if the snapshot diverges from published D1 rows.
 *
 * Detection: if src/data/projects.ts no longer contains bundled image
 * imports (it is a facade consuming the snapshot), the collector refuses to
 * treat it as a source — re-migration must go snapshot → D1.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projects } from '../../src/data/projects'
import { profile } from '../../src/data/profile'
import { socialLinks } from '../../src/data/links'

const DOCS_DIR = join(import.meta.dirname, '..', '..', 'docs')

/** docs/project/ subdirectories (real names on disk, e.g. 'HawkBucks - Web'). */
const projectDirs = existsSync(join(DOCS_DIR, 'project'))
  ? readdirSync(join(DOCS_DIR, 'project'), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  : []

/** Index: filename → candidate docs-relative paths (project/<dir>/<file>). */
const projectFileIndex = new Map<string, string[]>()
for (const dir of projectDirs) {
  for (const entry of readdirSync(join(DOCS_DIR, 'project', dir))) {
    const key = entry.toLowerCase()
    projectFileIndex.set(key, [...(projectFileIndex.get(key) ?? []), `project/${dir}/${entry}`])
  }
}

const profileFileIndex = new Map<string, string[]>()
for (const area of ['profile', 'certificates'] as const) {
  const areaPath = join(DOCS_DIR, area)
  if (!existsSync(areaPath)) continue
  for (const entry of readdirSync(areaPath)) {
    const key = entry.toLowerCase()
    profileFileIndex.set(key, [...(profileFileIndex.get(key) ?? []), `${area}/${entry}`])
  }
}

/** docs/project/ dir names differ from project slugs — same override map as
 * scripts/generate-media-manifest.mjs. Keep both in sync. */
const slugToDir: Record<string, string> = {
  'greenhawk-ai': 'GreenHawk AI',
  hawkbucks: 'HawkBucks - Web',
  'hawkbucks-bot': 'HawkBucks - Bot',
}

/** Resolves a bundled import path to its docs-relative source path.
 * Unique basenames resolve directly; ambiguous ones are disambiguated by
 * the project's expected docs directory. */
function resolveSource(bundledPath: string, index: Map<string, string[]>, expectedPath?: string): string {
  const basename = decodeURIComponent(bundledPath.split('?')[0].split('#')[0].split('/').pop() ?? '')
  const candidates = index.get(basename.toLowerCase())
  if (!candidates || candidates.length === 0) throw new Error(`No docs file found for '${bundledPath}'`)
  if (candidates.length === 1) return candidates[0]
  if (expectedPath && candidates.includes(expectedPath)) return expectedPath
  throw new Error(
    `Ambiguous docs file '${basename}' (${candidates.join(', ')}) and no directory context to disambiguate`
  )
}

export function collectCurrentContent() {
  const resolveProjectMedia = (bundledPath: string, slug: string) => {
    const dir = slugToDir[slug]
    const basename = decodeURIComponent(bundledPath.split('?')[0].split('#')[0].split('/').pop() ?? '')
    return resolveSource(bundledPath, projectFileIndex, dir ? `project/${dir}/${basename}` : undefined)
  }

  return {
    projects: projects.map((project) => ({
      ...project,
      banner: resolveProjectMedia(project.banner, project.slug),
      screenshots: project.screenshots.map((s) => ({ ...s, src: resolveProjectMedia(s.src, project.slug) })),
    })),
    profile: {
      hero: {
        ...profile.hero,
        avatarSrc: resolveSource(profile.hero.avatarSrc, profileFileIndex),
      },
      about: { paragraphs: [...profile.about] },
      focus: { items: [...profile.focus] },
      education: { ...profile.education },
      skills: { groups: profile.skillGroups.map((g) => ({ label: g.label, skills: [...g.skills] })) },
      technologies: { items: [...profile.technologies] },
      certificates: {
        items: profile.certificates.map((c) => ({
          ...c,
          image: resolveSource(c.image, profileFileIndex),
        })),
      },
      experience: { items: [...profile.experience] },
    },
    links: socialLinks.map((l) => ({ ...l })),
    sourceMeta: {
      projectCount: projects.length,
      projectSlugs: projects.map((p) => p.slug),
      profileKeys: ['hero', 'about', 'focus', 'education', 'skills', 'technologies', 'certificates', 'experience'],
      linkCount: socialLinks.length,
    },
  }
}
