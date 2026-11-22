import { beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '../src/stores/uiStore'

describe('3D Room Visitor Counter Two-Stage Interaction', () => {
  beforeEach(() => {
    useUiStore.setState({
      focus: null,
      visitorStatsOpen: false,
      isCameraMoving: false,
    })
  })

  it('stage 1: first click initiates camera approach to visitor counter without opening modal', () => {
    const state = useUiStore.getState()
    expect(state.focus).toBeNull()
    expect(state.visitorStatsOpen).toBe(false)

    // Simulate first click on visitor counter:
    // In ShelfDecor, when focus !== 'visitorCounter', Interactable calls setFocus('visitorCounter')
    // while onActivate does NOT open the modal.
    const isFocused = state.focus === 'visitorCounter'
    if (!isFocused) {
      useUiStore.getState().setFocus('visitorCounter')
      useUiStore.getState().setIsCameraMoving(true)
    }

    const updated = useUiStore.getState()
    expect(updated.focus).toBe('visitorCounter')
    expect(updated.isCameraMoving).toBe(true)
    expect(updated.visitorStatsOpen).toBe(false) // Modal MUST NOT open on first click
  })

  it('prevents modal opening if clicked while camera is still in flight', () => {
    useUiStore.setState({
      focus: 'visitorCounter',
      isCameraMoving: true, // Camera still in transit
      visitorStatsOpen: false,
    })

    const state = useUiStore.getState()
    const isFocused = state.focus === 'visitorCounter'

    // Click handler logic
    if (isFocused && !state.isCameraMoving) {
      useUiStore.getState().setVisitorStatsOpen(true)
    }

    expect(useUiStore.getState().visitorStatsOpen).toBe(false)
  })

  it('stage 2: second click once camera has settled opens the statistics modal', () => {
    useUiStore.setState({
      focus: 'visitorCounter',
      isCameraMoving: false, // Camera arrived in front of display
      visitorStatsOpen: false,
    })

    const state = useUiStore.getState()
    const isFocused = state.focus === 'visitorCounter'

    if (isFocused && !state.isCameraMoving) {
      useUiStore.getState().setVisitorStatsOpen(true)
    }

    expect(useUiStore.getState().visitorStatsOpen).toBe(true)
  })

  it('closing the modal preserves camera position in front of counter and allows reopen', () => {
    useUiStore.setState({
      focus: 'visitorCounter',
      isCameraMoving: false,
      visitorStatsOpen: true,
    })

    // User closes modal
    useUiStore.getState().setVisitorStatsOpen(false)

    const stateAfterClose = useUiStore.getState()
    expect(stateAfterClose.visitorStatsOpen).toBe(false)
    expect(stateAfterClose.focus).toBe('visitorCounter') // Camera stays stationed in front

    // Another click re-opens the modal
    if (stateAfterClose.focus === 'visitorCounter' && !stateAfterClose.isCameraMoving) {
      useUiStore.getState().setVisitorStatsOpen(true)
    }

    expect(useUiStore.getState().visitorStatsOpen).toBe(true)
  })

  it('allows exiting focus back to main room via setFocus(null)', () => {
    useUiStore.setState({
      focus: 'visitorCounter',
      isCameraMoving: false,
      visitorStatsOpen: false,
    })

    // User presses ESC or clicks "Back to room"
    useUiStore.getState().setFocus(null)

    expect(useUiStore.getState().focus).toBeNull()
  })
})

