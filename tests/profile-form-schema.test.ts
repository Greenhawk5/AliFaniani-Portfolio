import { describe, expect, it } from 'vitest'
import {
  heroSectionSchema,
  aboutSectionSchema,
  focusSectionSchema,
  educationSectionSchema,
  skillsSectionSchema,
  technologiesSectionSchema,
  certificatesSectionSchema,
  experienceSectionSchema,
  profileSectionSchemas,
} from '../src/lib/content-schema'

describe('Profile Sections CMS Schema Validation', () => {
  it('validates hero section payload', () => {
    const payload = {
      name: 'Ali Faniani',
      role: 'Software Developer',
      intro: 'Building software systems across AI, backend engineering, and web.',
      avatarInitials: 'AF',
      avatarSrc: '/media/profile/avatar.webp',
    }
    const res = heroSectionSchema.safeParse(payload)
    expect(res.success).toBe(true)
  })

  it('validates about section paragraphs', () => {
    const payload = {
      paragraphs: ['First paragraph of biography.', 'Second paragraph describing experience.'],
    }
    const res = aboutSectionSchema.safeParse(payload)
    expect(res.success).toBe(true)
  })

  it('validates focus section items', () => {
    const payload = {
      items: ['AI & Machine Learning', 'Distributed Backend Systems', 'Real-time 3D Graphics'],
    }
    const res = focusSectionSchema.safeParse(payload)
    expect(res.success).toBe(true)
  })

  it('validates education section', () => {
    const payload = {
      degree: 'B.Sc. in Computer Software Engineering',
      school: 'Islamic Azad University, Jahrom Branch',
      period: '2020 – 2024',
      notes: 'Focus on distributed algorithms and computer networks.',
    }
    const res = educationSectionSchema.safeParse(payload)
    expect(res.success).toBe(true)
  })

  it('validates skills section with strict SkillLevel', () => {
    const payload = {
      groups: [
        {
          label: 'Languages',
          skills: [
            { name: 'TypeScript', level: 'Advanced' },
            { name: 'Python', level: 'Strong' },
            { name: 'Rust', level: 'Familiar' },
          ],
        },
      ],
    }
    const res = skillsSectionSchema.safeParse(payload)
    expect(res.success).toBe(true)

    const invalid = {
      groups: [
        {
          label: 'Languages',
          skills: [{ name: 'C++', level: 'Expert' }], // 'Expert' is not valid in SkillLevel enum
        },
      ],
    }
    expect(skillsSectionSchema.safeParse(invalid).success).toBe(false)
  })

  it('validates technologies section', () => {
    const payload = {
      items: ['React', 'TypeScript', 'Node.js', 'Cloudflare Workers', 'Three.js'],
    }
    const res = technologiesSectionSchema.safeParse(payload)
    expect(res.success).toBe(true)
  })

  it('validates certificates section with mediaRef and URL', () => {
    const payload = {
      items: [
        {
          title: 'Cloudflare Certified Developer',
          provider: 'Cloudflare',
          date: '2025',
          href: 'https://credentials.cloudflare.com/verify/12345',
          image: '/media/profile/cert-cloudflare.webp',
        },
      ],
    }
    const res = certificatesSectionSchema.safeParse(payload)
    expect(res.success).toBe(true)
  })

  it('validates experience section', () => {
    const payload = {
      items: [
        {
          role: 'Full Stack Engineer',
          org: 'Independent / Remote',
          period: '2023 – Present',
          summary: 'Designing and engineering client web applications and cloud architectures.',
        },
      ],
    }
    const res = experienceSectionSchema.safeParse(payload)
    expect(res.success).toBe(true)
  })

  it('ensures all 8 sections are present in profileSectionSchemas dictionary', () => {
    const keys = Object.keys(profileSectionSchemas)
    expect(keys).toEqual([
      'hero',
      'about',
      'focus',
      'education',
      'skills',
      'technologies',
      'certificates',
      'experience',
    ])
  })
})
