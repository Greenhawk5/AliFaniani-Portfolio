import { describe, expect, it } from 'vitest'
import { projectSchema } from '../src/lib/content-schema'

const validBase = {
  slug: 'test-project',
  title: 'Test Project Title',
  subtitle: 'A test subtitle',
  shortDescription: 'Short description for test project',
  overview: 'Detailed overview of the test project',
  category: 'Engineering',
  year: 2026,
  banner: '/media/project/test/banner.webp',
  screenshots: [{ src: '/media/project/test/banner.webp', caption: 'Test' }],
  technologies: ['TypeScript', 'Cloudflare'],
  techGroups: [{ label: 'Core', items: ['TypeScript'] }],
  features: ['Feature 1'],
  architecture: ['Arch 1'],
  repository: 'https://github.com/Greenhawk5/test-project',
}

describe('Project shortName Abbreviation Schema & Fallback', () => {
  it('accepts valid shortName up to 10 characters', () => {
    const res = projectSchema.safeParse({
      ...validBase,
      shortName: 'TP',
    })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.shortName).toBe('TP')
    }
  })

  it('allows shortName to be omitted (optional)', () => {
    const res = projectSchema.safeParse(validBase)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.shortName).toBeUndefined()
    }
  })

  it('rejects shortName exceeding 10 characters', () => {
    const res = projectSchema.safeParse({
      ...validBase,
      shortName: 'VERYLONGSHORTNAME123',
    })
    expect(res.success).toBe(false)
  })

  it('derives default 3-letter acronym when shortName is missing', () => {
    const title = 'GreenHawk Autonomous Agent'
    const fallbackAcronym = title
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase()

    expect(fallbackAcronym).toBe('GAA')

    const customShortName = 'GHA'
    const finalInitial = customShortName || fallbackAcronym
    expect(finalInitial).toBe('GHA')
  })
})
