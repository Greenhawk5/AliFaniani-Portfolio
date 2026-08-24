import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/app/config'

export type Quality = 'high' | 'medium' | 'performance'
export type MotionMode = 'full' | 'reduced'
export type TimezoneMode = 'local' | 'utc'

interface SettingsState {
  quality: Quality
  motion: MotionMode
  timezoneMode: TimezoneMode
  setQuality: (quality: Quality) => void
  setMotion: (motion: MotionMode) => void
  setTimezoneMode: (timezoneMode: TimezoneMode) => void
  reset: () => void
}

export function detectDefaultQuality(): Quality {
  if (typeof navigator === 'undefined') return 'high'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = window.innerWidth < 768
  const lowMemory = (nav.deviceMemory ?? 8) <= 4
  const lowCores = (navigator.hardwareConcurrency ?? 8) <= 4
  if (coarse || small || lowMemory) return 'performance'
  if (lowCores) return 'medium'
  return 'high'
}

export function detectDefaultMotion(): MotionMode {
  if (typeof window === 'undefined') return 'full'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduced' : 'full'
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      quality: detectDefaultQuality(),
      motion: detectDefaultMotion(),
      timezoneMode: 'local',
      setQuality: (quality) => set({ quality }),
      setMotion: (motion) => set({ motion }),
      setTimezoneMode: (timezoneMode) => set({ timezoneMode }),
      reset: () =>
        set({
          quality: detectDefaultQuality(),
          motion: detectDefaultMotion(),
          timezoneMode: 'local',
        }),
    }),
    {
      name: STORAGE_KEYS.settings,
      partialize: (s) => ({
        quality: s.quality,
        motion: s.motion,
        timezoneMode: s.timezoneMode,
      }),
    }
  )
)
