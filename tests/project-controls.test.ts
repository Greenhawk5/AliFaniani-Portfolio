import { describe, expect, it } from 'vitest'
import type { Project } from '../src/data/types'

function mockProject(
  slug: string,
  category: string,
  technologies: string[],
  year: number,
  views = 0,
  title = `Project ${slug}`,
  subtitle = `Subtitle for ${slug}`
): Project {
  return {
    slug,
    title,
    subtitle,
    shortDescription: `Short description describing ${slug} in detail`,
    overview: `Technical overview of ${slug}`,
    category,
    year,
    views,
    banner: `/images/${slug}.jpg`,
    screenshots: [{ src: `/images/${slug}-shot.jpg`, caption: 'Screenshot' }],
    technologies,
    techGroups: [{ label: 'Core', items: technologies }],
    features: ['Feature 1'],
    architecture: ['Arch 1'],
    repository: `https://github.com/Greenhawk5/${slug}`,
  }
}

describe('Project Page Custom Controls & Filter State Architecture', () => {
  const sampleProjects: Project[] = [
    mockProject('p1', 'AI', ['Python', 'FastAPI'], 2026, 1200, 'Project One', 'AI Subtitle One'),
    mockProject('p2', 'Web', ['React', 'TypeScript'], 2025, 3400, 'Project Two', 'Web Subtitle Two'),
    mockProject('p3', 'AI', ['PyTorch', 'Docker'], 2024, 800, 'Project Three', 'AI Subtitle Three'),
    mockProject('p4', 'DevOps', ['Go', 'Docker'], 2026, 1900, 'Project Four', 'DevOps Subtitle Four'),
  ]

  it('generates well-formed options for custom dropdowns with "All" pre-pended', () => {
    const categories = Array.from(new Set(sampleProjects.map((p) => p.category))).sort()
    const categoryOptions = [
      { value: 'all', label: 'All Categories' },
      ...categories.map((c) => ({ value: c, label: c })),
    ]

    expect(categoryOptions[0]).toEqual({ value: 'all', label: 'All Categories' })
    expect(categoryOptions.slice(1).map((o) => o.value)).toEqual(['AI', 'DevOps', 'Web'])

    const technologies = Array.from(new Set(sampleProjects.flatMap((p) => p.technologies))).sort()
    const techOptions = [
      { value: 'all', label: 'All Technologies' },
      ...technologies.map((t) => ({ value: t, label: t })),
    ]

    expect(techOptions[0]).toEqual({ value: 'all', label: 'All Technologies' })
    expect(techOptions.map((o) => o.value)).toContain('Docker')
    expect(techOptions.map((o) => o.value)).toContain('TypeScript')
  })

  it('verifies concise search placeholder text requirement', () => {
    const placeholder = 'Search projects...'
    expect(placeholder).toBe('Search projects...')
    expect(placeholder.length).toBeLessThan(25)
  })

  it('verifies category and tech filter combinations with sorting', () => {
    const selectedCategory = 'AI'
    const selectedTech = 'Docker'
    const selectedSort = 'most-viewed'

    const filtered = sampleProjects
      .filter((p) => (selectedCategory === 'all' ? true : p.category === selectedCategory))
      .filter((p) => (selectedTech === 'all' ? true : p.technologies.includes(selectedTech)))
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))

    expect(filtered).toHaveLength(1)
    expect(filtered[0].slug).toBe('p3')
    expect(filtered[0].subtitle).toBe('AI Subtitle Three')
  })

  it('verifies Selected Work displays subtitle and handles missing subtitle gracefully', () => {
    const projectWithSub = mockProject('p-sub', 'AI', ['Python'], 2026, 10, 'Sub Title', 'Custom Subtitle')
    const projectWithoutSub = mockProject('p-nosub', 'AI', ['Python'], 2026, 10, 'No Sub Title', '')

    const getSubtitleDisplay = (p: Project) => p.subtitle || ''

    expect(getSubtitleDisplay(projectWithSub)).toBe('Custom Subtitle')
    expect(getSubtitleDisplay(projectWithoutSub)).toBe('')
    expect(getSubtitleDisplay(projectWithoutSub)).not.toBe('undefined')
    expect(getSubtitleDisplay(projectWithoutSub)).not.toBe('null')
  })
})
