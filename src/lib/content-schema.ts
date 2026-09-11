import { z } from 'zod'

/**
 * Canonical content schemas — the single source of truth for all
 * CMS-managed content (v2.0.0).
 *
 * Consumer split (GUARDRAIL B):
 *   - runtime Zod execution is allowed only in build scripts, admin/API
 *     code, and future admin UI — never imported by public React code;
 *   - public modules consume type-only exports (see src/data/types.ts)
 *     or the generated snapshot JSON.
 *
 * Schemas mirror the existing data shapes exactly (src/data/projects.ts,
 * profile.ts, links.ts). Media references are root-relative paths into the
 * media manifest (e.g. /media/project/greenhawk-ai/banner.webp) or
 * Vite-bundled asset URLs — validated against the manifest at build time.
 */

export const CONTENT_KINDS = ['project', 'profile-section', 'link'] as const
export const CONTENT_STATES = ['draft', 'published', 'archived'] as const

export const contentKindSchema = z.enum(CONTENT_KINDS)
export const contentStateSchema = z.enum(CONTENT_STATES)

/** Skill levels as used by the About page skill bars. */
export const skillLevelSchema = z.enum(['Advanced', 'Strong', 'Familiar'])

/* ---------------------------------- media ---------------------------------- */

/**
 * A media reference: a root-relative path that must resolve to an entry in
 * the media manifest (generated at build time) or a bundled Vite asset path
 * (starts with /assets/).
 */
export const mediaRefSchema = z.string().min(1).refine(
  (value) => value.startsWith('/') && !value.startsWith('//'),
  'Media reference must be a root-relative path (starting with a single /)'
)

/* --------------------------------- project --------------------------------- */

export const bannerCropSchema = z.object({
  /** CSS object-position, e.g. '50% 30%'. Defaults to center. */
  objectPosition: z.string().min(1).optional(),
  /** Zoom level, 1 = no zoom. Defaults to 1. */
  scale: z.number().min(0.1).max(5).optional(),
})

export const bannerConfigSchema = z
  .object({
    desktop: bannerCropSchema.optional(),
    mobile: bannerCropSchema.optional(),
    objectPosition: z.string().optional(),
    scale: z.number().min(0.1).max(5).optional(),
  })

export const screenshotSchema = z.object({
  src: mediaRefSchema,
  caption: z.string().min(1),
})

/** Root-relative, lowercase, URL-safe: /^[a-z0-9]+(-[a-z0-9]+)*$/ */
export const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase URL-safe (letters, digits, hyphens)')

/** Ordered technology group shown on project pages. */
export const techGroupSchema = z.object({
  label: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
})

export const projectSchema = z.object({
  slug: slugSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  shortDescription: z.string().min(1),
  overview: z.string().min(1),
  category: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  banner: mediaRefSchema,
  bannerConfig: bannerConfigSchema.optional(),
  screenshots: z.array(screenshotSchema).min(1),
  technologies: z.array(z.string().min(1)).min(1),
  techGroups: z.array(techGroupSchema).min(1),
  features: z.array(z.string().min(1)).min(1),
  architecture: z.array(z.string().min(1)).min(1),
  repository: z.string().url(),
  demo: z.string().url().optional(),
  demoStatus: z.string().optional(),
  documentation: z.string().url().optional(),
})

/* ------------------------------ profile sections --------------------------- */

/** hero — name/role/intro shown on About; avatar crop is presentation config. */
export const heroSectionSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  intro: z.string().min(1),
  avatarInitials: z.string().min(1).max(4),
  avatarSrc: mediaRefSchema,
})

export const aboutSectionSchema = z.object({
  paragraphs: z.array(z.string().min(1)).min(1),
})

export const focusSectionSchema = z.object({
  items: z.array(z.string().min(1)).min(1),
})

export const educationSectionSchema = z.object({
  degree: z.string().min(1),
  school: z.string().min(1),
  period: z.string().min(1),
  notes: z.string().min(1).optional(),
})

export const skillsSectionSchema = z.object({
  groups: z.array(
    z.object({
      label: z.string().min(1),
      skills: z.array(z.object({ name: z.string().min(1), level: skillLevelSchema })).min(1),
    })
  ).min(1),
})

export const technologiesSectionSchema = z.object({
  items: z.array(z.string().min(1)).min(1),
})

export const certificatesSectionSchema = z.object({
  items: z.array(
    z.object({
      title: z.string().min(1),
      provider: z.string().min(1),
      date: z.string().min(1),
      href: z.string().url(),
      image: mediaRefSchema,
    })
  ),
})

export const experienceSectionSchema = z.object({
  items: z.array(
    z.object({
      role: z.string().min(1),
      org: z.string().min(1),
      period: z.string().min(1),
      summary: z.string().min(1),
    })
  ),
})

/** Per-section schemas keyed by content.key (content kind 'profile-section'). */
export const profileSectionSchemas = {
  hero: heroSectionSchema,
  about: aboutSectionSchema,
  focus: focusSectionSchema,
  education: educationSectionSchema,
  skills: skillsSectionSchema,
  technologies: technologiesSectionSchema,
  certificates: certificatesSectionSchema,
  experience: experienceSectionSchema,
} as const

export const PROFILE_SECTION_KEYS = Object.keys(profileSectionSchemas)

/* ---------------------------------- links ---------------------------------- */

export const linkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1).refine(
    (value) => /^https?:\/\//.test(value) || value.startsWith('mailto:'),
    'Link href must be an absolute http(s) URL or a mailto: address'
  ),
})

/* --------------------------------- envelope -------------------------------- */

/**
 * The generated snapshot consumed by the public build. Contains only
 * published content; draft/archived rows never reach this file.
 */
export const contentSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  projects: z.array(projectSchema),
  profile: z.object({
    hero: heroSectionSchema,
    about: aboutSectionSchema,
    focus: focusSectionSchema,
    education: educationSectionSchema,
    skills: skillsSectionSchema,
    technologies: technologiesSectionSchema,
    certificates: certificatesSectionSchema,
    experience: experienceSectionSchema,
  }),
  links: z.array(linkSchema),
})

/* --------------------------- derived (type-only) --------------------------- */

export type ContentKind = z.infer<typeof contentKindSchema>
export type ContentState = z.infer<typeof contentStateSchema>
export type SkillLevel = z.infer<typeof skillLevelSchema>
export type SkillItem = { name: string; level: SkillLevel }
export type BannerCrop = z.infer<typeof bannerCropSchema>
export type BannerConfig = z.infer<typeof bannerConfigSchema>
export type TechGroup = z.infer<typeof techGroupSchema>
export type Project = z.infer<typeof projectSchema>
export type Screenshot = z.infer<typeof screenshotSchema>
export type LinkItem = z.infer<typeof linkSchema>
export type HeroSection = z.infer<typeof heroSectionSchema>
export type AboutSection = z.infer<typeof aboutSectionSchema>
export type FocusSection = z.infer<typeof focusSectionSchema>
export type EducationSection = z.infer<typeof educationSectionSchema>
export type SkillsSection = z.infer<typeof skillsSectionSchema>
export type TechnologiesSection = z.infer<typeof technologiesSectionSchema>
export type CertificatesSection = z.infer<typeof certificatesSectionSchema>
export type ExperienceSection = z.infer<typeof experienceSectionSchema>
export type ContentSnapshot = z.infer<typeof contentSnapshotSchema>

/* ----------------------------- d1 row mapping ------------------------------ */

/** A content row as stored in D1 (before/after JSON parsing of `data`). */
export const contentRowSchema = z.object({
  id: z.string().min(1),
  kind: contentKindSchema,
  key: z.string().min(1),
  data: z.string(), // JSON string; parsed+validated per kind during export
  sort_order: z.number().int().min(0),
  state: contentStateSchema,
  version: z.number().int().min(1),
  created_at: z.string(),
  updated_at: z.string(),
  published_at: z.string().nullable(),
})

export type ContentRow = z.infer<typeof contentRowSchema>
