/**
 * Type-only re-exports of the canonical content types.
 *
 * Public React code imports types from here (or from the data facades) —
 * never from src/lib/content-schema.ts, whose runtime module contains the
 * Zod dependency and must stay out of the public bundle (Guardrail B).
 *
 * `export type` is erased at compile time, so this module contributes zero
 * runtime code.
 */
export type {
  ContentKind,
  ContentState,
  SkillLevel,
  SkillItem,
  BannerCrop,
  BannerConfig,
  TechGroup,
  Project,
  Screenshot,
  LinkItem,
  HeroSection,
  AboutSection,
  FocusSection,
  EducationSection,
  SkillsSection,
  TechnologiesSection,
  CertificatesSection,
  ExperienceSection,
  ContentSnapshot,
} from '@/lib/content-schema'
