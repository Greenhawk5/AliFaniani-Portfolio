import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/app/config'

export type TimeMode = 'live' | 'simulation'

interface TimeState {
  mode: TimeMode
  simulationHours: number
  setMode: (mode: TimeMode) => void
  setSimulationHours: (hours: number) => void
}

export const useTimeStore = create<TimeState>()(
  persist(
    (set) => ({
      mode: 'live',
      simulationHours: 21.5,
      setMode: (mode) => set({ mode }),
      setSimulationHours: (simulationHours) =>
        set({ simulationHours: ((simulationHours % 24) + 24) % 24 }),
    }),
    {
      name: STORAGE_KEYS.time,
      partialize: (s) => ({ mode: s.mode, simulationHours: s.simulationHours }),
    }
  )
)
