import { create } from 'zustand'

export type FocusTarget = 'monitor' | 'clock' | 'shelf' | 'projectBoard' | 'socialBoard'

export interface BoardNavSignal {
  target: FocusTarget
  dir: 1 | -1
  nonce: number
}

interface UiState {
  settingsOpen: boolean
  focus: FocusTarget | null
  boardNav: BoardNavSignal | null
  sendBoardNav: (target: FocusTarget, dir: 1 | -1) => void
  hoveredLabel: string | null
  hintVisible: boolean
  sceneReady: boolean
  rgbEnabled: boolean
  lampOn: boolean
  signOn: boolean
  keyboardHue: number
  setSettingsOpen: (open: boolean) => void
  toggleSettings: () => void
  setFocus: (focus: FocusTarget | null) => void
  setHoveredLabel: (label: string | null) => void
  dismissHint: () => void
  setSceneReady: (ready: boolean) => void
  toggleRgb: () => void
  toggleLamp: () => void
  toggleSign: () => void
  cycleKeyboard: () => void
}

export const useUiStore = create<UiState>((set) => ({
  settingsOpen: false,
  focus: null,
  boardNav: null,
  sendBoardNav: (target, dir) =>
    set((s) => ({ boardNav: { target, dir, nonce: (s.boardNav?.nonce ?? 0) + 1 } })),
  hoveredLabel: null,
  hintVisible: true,
  sceneReady: false,
  rgbEnabled: true,
  lampOn: true,
  signOn: true,
  keyboardHue: 0.36,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  setFocus: (focus) => set({ focus }),
  setHoveredLabel: (hoveredLabel) => set({ hoveredLabel }),
  dismissHint: () => set({ hintVisible: false }),
  setSceneReady: (sceneReady) => set({ sceneReady }),
  toggleRgb: () => set((s) => ({ rgbEnabled: !s.rgbEnabled })),
  toggleLamp: () => set((s) => ({ lampOn: !s.lampOn })),
  toggleSign: () => set((s) => ({ signOn: !s.signOn })),
  cycleKeyboard: () => set((s) => ({ keyboardHue: (s.keyboardHue + 0.61) % 1 })),
}))
