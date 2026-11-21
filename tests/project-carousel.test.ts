import { describe, expect, it } from 'vitest'
import { computeFeaturedProjects } from '../src/stores/projectStore'
import type { Project } from '../src/data/types'

function mockProject(slug: string, featured = false, featuredOrder?: number): Project {
  return {
    slug,
    title: `Project ${slug}`,
    subtitle: `Subtitle ${slug}`,
    shortDescription: `Short description for ${slug}`,
    overview: `Overview for ${slug}`,
    category: 'AI',
    year: 2026,
    banner: `/images/${slug}.jpg`,
    screenshots: [{ src: `/images/${slug}-shot.jpg`, caption: 'Screenshot' }],
    technologies: ['TypeScript', 'Cloudflare'],
    techGroups: [{ label: 'Core', items: ['TypeScript'] }],
    features: ['Feature 1'],
    architecture: ['Arch 1'],
    repository: `https://github.com/Greenhawk5/${slug}`,
    featured,
    featuredOrder,
  }
}

describe('Intelligent Selected Work Ranking', () => {
  const sampleProjects: Project[] = [
    mockProject('p1'),
    mockProject('p2', true, 2),
    mockProject('p3'),
    mockProject('p4', true, 1),
    mockProject('p5'),
    mockProject('p6'),
    mockProject('p7'),
  ]

  it('prioritizes manual CMS featured projects ordered by featuredOrder', () => {
    const result = computeFeaturedProjects(sampleProjects, [])
    expect(result).toHaveLength(5)
    // p4 has featuredOrder: 1, p2 has featuredOrder: 2
    expect(result[0].slug).toBe('p4')
    expect(result[1].slug).toBe('p2')
  })

  it('fills remaining slots with 30-day analytics popular slugs', () => {
    const popularSlugs = ['p7', 'p6', 'p3']
    const result = computeFeaturedProjects(sampleProjects, popularSlugs)
    expect(result).toHaveLength(5)
    expect(result[0].slug).toBe('p4') // explicit #1
    expect(result[1].slug).toBe('p2') // explicit #2
    expect(result[2].slug).toBe('p7') // popular #1
    expect(result[3].slug).toBe('p6') // popular #2
    expect(result[4].slug).toBe('p3') // popular #3
  })

  it('caps the selected work at exactly 5 projects', () => {
    const manyProjects = Array.from({ length: 10 }, (_, i) => mockProject(`proj-${i}`, true, i + 1))
    const result = computeFeaturedProjects(manyProjects, [])
    expect(result).toHaveLength(5)
    expect(result.map((p) => p.slug)).toEqual(['proj-0', 'proj-1', 'proj-2', 'proj-3', 'proj-4'])
  })
})
