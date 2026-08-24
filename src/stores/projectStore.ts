import { create } from 'zustand'
import { projects } from '@/data/projects'

interface ProjectState {
  activeIndex: number
  next: () => void
  setActive: (index: number) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeIndex: 0,
  next: () =>
    set((s) => ({ activeIndex: (s.activeIndex + 1) % featuredProjects().length })),
  setActive: (activeIndex) => set({ activeIndex }),
}))

export function featuredProjects() {
  return projects.filter((p) => p.featured)
}
