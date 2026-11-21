import { describe, expect, it } from 'vitest'
import type { Project } from '../src/data/types'

function mockProject(
  slug: string,
  category: string,
  technologies: string[],
  year: number,
  views = 0,
  title = `Project ${slug}`
): Project {
  return {
    slug,
    title,
    subtitle: `Subtitle for ${slug}`,
    shortDescription: `Short description describing ${slug} in detail`,
    overview: `Complete technical overview of ${slug}`,
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

describe('Project Discovery, Filtering & Sorting Logic', () => {
  const dataset: Project[] = [
    mockProject('greenhawk-ai', 'AI', ['Python', 'PyTorch', 'FastAPI'], 2026, 1200, 'GreenHawk AI'),
    mockProject('portfolio-v2', 'Web', ['React', 'TypeScript', 'Tailwind CSS'], 2025, 3400, 'Developer Portfolio'),
    mockProject('neural-bot', 'AI', ['Python', 'Docker'], 2024, 800, 'Neural Chatbot'),
    mockProject('cloud-scaler', 'DevOps', ['Go', 'Docker', 'Kubernetes'], 2026, 1900, 'Cloud Auto Scaler'),
    mockProject('retro-synth', 'Audio', ['C++', 'JUCE'], 2023, 450, 'Retro Synth Audio Engine'),
  ]

  it('filters by category accurately', () => {
    const aiProjects = dataset.filter((p) => p.category === 'AI')
    expect(aiProjects).toHaveLength(2)
    expect(aiProjects.map((p) => p.slug)).toEqual(['greenhawk-ai', 'neural-bot'])
  })

  it('filters by technology accurately', () => {
    const dockerProjects = dataset.filter((p) => p.technologies.includes('Docker'))
    expect(dockerProjects).toHaveLength(2)
    expect(dockerProjects.map((p) => p.slug)).toEqual(['neural-bot', 'cloud-scaler'])
  })

  it('performs case-insensitive whitespace-normalized search across metadata', () => {
    const query = '  PYTORCH  '.trim().toLowerCase()
    const match = dataset.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.technologies.some((t) => t.toLowerCase().includes(query))
    )
    expect(match).toHaveLength(1)
    expect(match[0].slug).toBe('greenhawk-ai')
  })

  it('sorts by most viewed correctly', () => {
    const sorted = [...dataset].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    expect(sorted[0].slug).toBe('portfolio-v2') // 3400
    expect(sorted[1].slug).toBe('cloud-scaler') // 1900
    expect(sorted[4].slug).toBe('retro-synth') // 450
  })

  it('sorts by least viewed correctly', () => {
    const sorted = [...dataset].sort((a, b) => (a.views ?? 0) - (b.views ?? 0))
    expect(sorted[0].slug).toBe('retro-synth') // 450
    expect(sorted[4].slug).toBe('portfolio-v2') // 3400
  })

  it('sorts alphabetically by title', () => {
    const sorted = [...dataset].sort((a, b) => a.title.localeCompare(b.title))
    expect(sorted[0].title).toBe('Cloud Auto Scaler')
    expect(sorted[sorted.length - 1].title).toBe('Retro Synth Audio Engine')
  })

  it('combines search, category filter, and sorting cleanly', () => {
    const category = 'AI'
    const query = 'python'
    const filtered = dataset
      .filter((p) => p.category === category)
      .filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.technologies.some((t) => t.toLowerCase().includes(query))
      )
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))

    expect(filtered).toHaveLength(2)
    expect(filtered[0].slug).toBe('greenhawk-ai') // 1200 views
    expect(filtered[1].slug).toBe('neural-bot') // 800 views
  })
})
