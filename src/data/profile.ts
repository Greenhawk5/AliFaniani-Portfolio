import snapshot from './generated/content.json'
import type {
  HeroSection,
  AboutSection,
  FocusSection,
  EducationSection,
  SkillsSection,
  TechnologiesSection,
  CertificatesSection,
  ExperienceSection,
  SkillLevel,
  SkillItem,
} from './types'

/**
 * GENERATED FACADE for CMS-managed profile content — do not edit content
 * values here. CMS-managed content lives in D1 and reaches this module via
 * the build-time content snapshot (src/data/generated/content.json).
 *
 * CODE-DEFINED presentation config (not CMS content — intentionally excluded
 * from the snapshot): `skillLevels` (skill-bar percentages),
 * `profileImageConfig` (manual avatar crop), and the `assets` convenience
 * map. These are visual constants owned by the theme, not content.
 */
export type { SkillLevel, SkillItem }

// The snapshot stores each profile section as a section OBJECT
// (e.g. focus: { items: [...] }); the public facade unwraps them into the
// plain arrays/objects the page components have always consumed. Typed
// destructuring (not a cast) keeps the shapes honest at compile time.
const sections = snapshot.profile

export const profile: {
  hero: HeroSection
  about: AboutSection['paragraphs']
  focus: FocusSection['items']
  education: EducationSection
  skillGroups: SkillsSection['groups']
  technologies: TechnologiesSection['items']
  certificates: CertificatesSection['items']
  experience: ExperienceSection['items']
} = {
  hero: sections.hero,
  about: sections.about.paragraphs,
  focus: sections.focus.items,
  education: sections.education,
  // JSON imports widen literals ('level': string) — the snapshot was already
  // Zod-validated against the discriminated union by the exporter.
  skillGroups: sections.skills.groups as SkillsSection['groups'],
  technologies: sections.technologies.items,
  certificates: sections.certificates.items,
  experience: sections.experience.items,
}

export type SkillGroup = (typeof profile.skillGroups)[number]

export const skillLevels: Record<SkillLevel, number> = {
  Advanced: 90,
  Strong: 72,
  Familiar: 50,
}

/** Manual crop controls for the profile image (presentation config). */
export const profileImageConfig = {
  scale: 1,
  positionX: '50%',
  positionY: '70%',
}
