import { create } from 'zustand'

interface FreecamState {
  moveX: number
  moveY: number
  elevate: number // -1 = down, 0 = neutral, 1 = up
  setMove: (moveX: number, moveY: number) => void
  setElevate: (elevate: number) => void
  reset: () => void
}

export const useFreecamStore = create<FreecamState>((set) => ({
  moveX: 0,
  moveY: 0,
  elevate: 0,
  setMove: (moveX, moveY) => set({ moveX, moveY }),
  setElevate: (elevate) => set({ elevate }),
  reset: () => set({ moveX: 0, moveY: 0, elevate: 0 }),
}))
