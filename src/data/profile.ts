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

export const profile: {
  hero: HeroSection
  about: AboutSection['paragraphs']
  focus: FocusSection['items']
  education: EducationSection
  skillGroups: SkillsSection['groups']
  technologies: TechnologiesSection['items']
  certificates: CertificatesSection['items']
  experience: ExperienceSection['items']
} = snapshot.profile as unknown as {
  hero: HeroSection
  about: AboutSection['paragraphs']
  focus: FocusSection['items']
  education: EducationSection
  skillGroups: SkillsSection['groups']
  technologies: TechnologiesSection['items']
  certificates: CertificatesSection['items']
  experience: ExperienceSection['items']
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
