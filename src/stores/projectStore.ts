import { create } from 'zustand'
import { projects } from '@/data/projects'
import type { Project } from '@/data/types'

interface ProjectState {
  activeIndex: number
  next: () => void
  prev: () => void
  setActive: (index: number) => void
  popularSlugs: string[]
  setPopularSlugs: (slugs: string[]) => void
}

export function computeFeaturedProjects(
  allProjects: Project[] = projects,
  popularSlugs: string[] = []
): Project[] {
  // 1. Explicitly featured projects, sorted by featuredOrder ascending
  const explicitFeatured = allProjects
    .filter((p) => p.featured)
    .sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99))

  const selectedSlugs = new Set(explicitFeatured.map((p) => p.slug))
  const result: Project[] = [...explicitFeatured]

  // 2. Fill remaining slots with analytics top-ranked projects
  for (const slug of popularSlugs) {
    if (result.length >= 5) break
    if (!selectedSlugs.has(slug)) {
      const match = allProjects.find((p) => p.slug === slug)
      if (match) {
        result.push(match)
        selectedSlugs.add(slug)
      }
    }
  }

  // 3. Fallback fill from allProjects if still under 5
  for (const p of allProjects) {
    if (result.length >= 5) break
    if (!selectedSlugs.has(p.slug)) {
      result.push(p)
      selectedSlugs.add(p.slug)
    }
  }

  return result.slice(0, 5)
}

export function featuredProjects(): Project[] {
  return computeFeaturedProjects(projects)
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeIndex: 0,
  popularSlugs: [],
  next: () =>
    set((s) => ({
      activeIndex: (s.activeIndex + 1) % Math.max(1, featuredProjects().length),
    })),
  prev: () =>
    set((s) => ({
      activeIndex:
        (s.activeIndex - 1 + Math.max(1, featuredProjects().length)) %
        Math.max(1, featuredProjects().length),
    })),
  setActive: (activeIndex) => set({ activeIndex }),
  setPopularSlugs: (popularSlugs) => set({ popularSlugs }),
}))
