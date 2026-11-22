import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  computeResponsiveFov,
  calculateFitDistance,
  calculateResponsiveFraming,
  FRAMING_PROFILES,
  ROOM_BOUNDS_MIN,
  ROOM_BOUNDS_MAX,
  BASE_POS,
  BASE_TARGET,
} from '../src/components/three/cameraFraming'
import { resolveFreeCamPosition } from '../src/components/three/FreeCamRig'
import { useFreecamStore } from '../src/stores/freecamStore'
import { AdminSwitch } from '../src/admin/ui/form-controls'

describe('3D Room Responsive Camera Architecture & Framing System', () => {
  describe('Part D — Adaptive Geometry-Based FOV & Framing', () => {
    it('computes responsive FOV correctly across viewport aspect ratios', () => {
      // Desktop 16:9
      const desktopFov = computeResponsiveFov(16 / 9)
      expect(desktopFov).toBe(42)

      // Ultrawide desktop 21:9
      const ultrawideFov = computeResponsiveFov(21 / 9)
      expect(ultrawideFov).toBe(42)

      // Tablet portrait (3:4 = 0.75)
      const tabletFov = computeResponsiveFov(3 / 4)
      expect(tabletFov).toBeGreaterThan(42)
      expect(tabletFov).toBeLessThan(54)

      // Phone portrait (Samsung S21 FE: 414 / 939 = ~0.44)
      const phonePortraitFov = computeResponsiveFov(414 / 939)
      expect(phonePortraitFov).toBeCloseTo(54, 0)

      // Phone landscape (Samsung S21 FE: 939 / 414 = ~2.27)
      const phoneLandscapeFov = computeResponsiveFov(939 / 414)
      expect(phoneLandscapeFov).toBe(42)
    })

    it('calculates fit distance with appropriate margins for given dimensions', () => {
      const vFov = 42
      const aspect = 16 / 9
      const width = 1.0
      const height = 1.0
      const dist = calculateFitDistance(width, height, vFov, aspect, 1.2)

      expect(dist).toBeGreaterThan(1.0)
      expect(dist).toBeLessThan(4.0)
    })

    it('returns default room framing when focus is null', () => {
      const framing = calculateResponsiveFraming(null, 16 / 9)
      expect(framing.targetPos.x).toBeCloseTo(BASE_TARGET.x, 2)
      expect(framing.targetPos.y).toBeCloseTo(BASE_TARGET.y, 2)
      expect(framing.targetPos.z).toBeCloseTo(BASE_TARGET.z, 2)
      expect(framing.cameraPos.x).toBeCloseTo(BASE_POS.x, 2)
      expect(framing.cameraPos.y).toBeCloseTo(BASE_POS.y, 2)
      expect(framing.cameraPos.z).toBeCloseTo(BASE_POS.z, 2)
    })

    it('preserves desktop framing presets on desktop viewports (aspect >= 1.6)', () => {
      const targets = [
        'shelf',
        'visitorCounter',
        'projectBoard',
        'socialBoard',
        'monitor',
        'clock',
      ] as const

      for (const target of targets) {
        const profile = FRAMING_PROFILES[target]
        const framing = calculateResponsiveFraming(target, 16 / 9)

        expect(framing.targetPos.x).toBeCloseTo(profile.target.x, 2)
        expect(framing.targetPos.y).toBeCloseTo(profile.target.y, 2)
        expect(framing.targetPos.z).toBeCloseTo(profile.target.z, 2)

        expect(framing.cameraPos.x).toBeCloseTo(profile.desktopPos.x, 1)
        expect(framing.cameraPos.y).toBeCloseTo(profile.desktopPos.y, 1)
        expect(framing.cameraPos.z).toBeCloseTo(profile.desktopPos.z, 1)
      }
    })

    it('solves the Black Shelf bug: camera is placed inside the room facing +X on mobile portrait', () => {
      const phoneAspect = 414 / 939 // 0.44
      const framing = calculateResponsiveFraming('shelf', phoneAspect)

      // The left wall is at X = -4.5.
      // Previously, off-axis dolly placed the camera at X = -6.05 (1.55m behind the wall, showing pure black).
      // Responsive framing must place camera in front of shelf: X in [-3.5, 0.0], facing towards -X (shelf).
      expect(framing.cameraPos.x).toBeGreaterThanOrEqual(-3.5)
      expect(framing.cameraPos.x).toBeLessThanOrEqual(0.0)
      expect(framing.cameraPos.x).toBeGreaterThan(ROOM_BOUNDS_MIN.x) // Strictly inside room

      // Looking at the shelf target
      expect(framing.targetPos.x).toBeCloseTo(FRAMING_PROFILES.shelf.target.x, 2)
      expect(framing.targetPos.y).toBeCloseTo(FRAMING_PROFILES.shelf.target.y, 2)
      expect(framing.targetPos.z).toBeCloseTo(FRAMING_PROFILES.shelf.target.z, 2)
    })

    it('solves the Oblique Visitor Counter bug: camera is directly in front of the board on mobile portrait', () => {
      const phoneAspect = 414 / 939 // 0.44
      const framing = calculateResponsiveFraming('visitorCounter', phoneAspect)

      // Visitor counter is at X = 3.9, Z = -4.44 (back wall).
      // Previously, off-axis dolly shifted X to 6.96 (outside room at extreme 65° side angle).
      // Responsive framing must align X with the board: X ~ 3.9, Z in [-3.5, -1.5].
      expect(framing.cameraPos.x).toBeGreaterThanOrEqual(3.7)
      expect(framing.cameraPos.x).toBeLessThanOrEqual(ROOM_BOUNDS_MAX.x)
      expect(framing.cameraPos.z).toBeGreaterThan(-4.0) // In front of back wall
      expect(framing.cameraPos.z).toBeLessThan(0.0)

      // Looking perpendicularly at the counter
      expect(framing.targetPos.x).toBeCloseTo(FRAMING_PROFILES.visitorCounter.target.x, 2)
      expect(framing.targetPos.z).toBeCloseTo(FRAMING_PROFILES.visitorCounter.target.z, 2)
    })

    it('guarantees camera position stays strictly within room boundaries across all targets and viewports', () => {
      const viewports = [
        0.44, // Samsung S21 FE portrait
        0.56, // iPhone 14 portrait
        0.75, // iPad portrait
        1.0,  // Square
        1.33, // iPad landscape
        1.78, // 16:9 desktop
        2.27, // Samsung S21 FE landscape
      ]

      const targets = [
        'shelf',
        'visitorCounter',
        'projectBoard',
        'socialBoard',
        'monitor',
        'clock',
      ] as const

      for (const aspect of viewports) {
        for (const target of targets) {
          const framing = calculateResponsiveFraming(target, aspect)

          expect(framing.cameraPos.x).toBeGreaterThanOrEqual(ROOM_BOUNDS_MIN.x)
          expect(framing.cameraPos.x).toBeLessThanOrEqual(ROOM_BOUNDS_MAX.x)
          expect(framing.cameraPos.y).toBeGreaterThanOrEqual(ROOM_BOUNDS_MIN.y)
          expect(framing.cameraPos.y).toBeLessThanOrEqual(ROOM_BOUNDS_MAX.y)
          expect(framing.cameraPos.z).toBeGreaterThanOrEqual(ROOM_BOUNDS_MIN.z)
          expect(framing.cameraPos.z).toBeLessThanOrEqual(ROOM_BOUNDS_MAX.z)
        }
      }
    })
  })

  describe('Part E — Camera Collision & FreeCam Boundaries', () => {
    it('clamps freecam position inside room boundaries', () => {
      // Out of bounds right wall (away from furniture)
      const clamped1 = resolveFreeCamPosition(new THREE.Vector3(6.0, 1.5, -1.0))
      expect(clamped1.x).toBeCloseTo(4.15, 2)

      // Out of bounds ceiling
      const clamped2 = resolveFreeCamPosition(new THREE.Vector3(0, 6.0, 0))
      expect(clamped2.y).toBeCloseTo(4.15, 2)

      // Out of bounds floor
      const clamped3 = resolveFreeCamPosition(new THREE.Vector3(0, -2.0, 0))
      expect(clamped3.y).toBeCloseTo(0.45, 2)

      // Out of bounds front wall
      const clamped4 = resolveFreeCamPosition(new THREE.Vector3(0, 1.5, 6.0))
      expect(clamped4.z).toBeCloseTo(4.15, 2)
    })

    it('prevents camera from clipping inside the shelf bounding volume', () => {
      // Shelf is roughly X in [-4.6, -4.05], Y in [1.3, 2.8], Z in [-1.5, 1.8]
      const nearShelf = new THREE.Vector3(-4.2, 2.0, 1.0)
      const resolved = resolveFreeCamPosition(nearShelf)

      // Must be pushed out in +X away from the shelf
      expect(resolved.x).toBeGreaterThanOrEqual(-3.85)
    })
  })

  describe('Part C — Freecam Virtual Joystick Store', () => {
    it('updates joystick vector and elevation in freecam store', () => {
      const store = useFreecamStore.getState()
      expect(store.moveX).toBe(0)
      expect(store.moveY).toBe(0)
      expect(store.elevate).toBe(0)

      // Push joystick forward-right
      store.setMove(0.75, 0.8)
      expect(useFreecamStore.getState().moveX).toBe(0.75)
      expect(useFreecamStore.getState().moveY).toBe(0.8)

      // Elevate up
      store.setElevate(1)
      expect(useFreecamStore.getState().elevate).toBe(1)

      // Reset
      store.reset()
      expect(useFreecamStore.getState().moveX).toBe(0)
      expect(useFreecamStore.getState().moveY).toBe(0)
      expect(useFreecamStore.getState().elevate).toBe(0)
    })
  })

  describe('Part F — Admin Switch Contrast Verification', () => {
    it('provides high contrast styling in inactive (OFF) state and accent styling in active (ON) state', () => {
      // Inactive (checked=false):
      // Must have visible neutral border and background, and a bright thumb
      const inactiveLabel = AdminSwitch({
        checked: false,
        onChange: () => {},
        label: 'Pin notification immediately',
      })

      // Active (checked=true):
      // Must have green accent background and dark void thumb
      const activeLabel = AdminSwitch({
        checked: true,
        onChange: () => {},
        label: 'Pin notification immediately',
      })

      const inactiveButton = inactiveLabel.props.children[1]
      const inactiveThumb = inactiveButton.props.children
      expect(inactiveButton.props.className).toContain('border-edge-2')
      expect(inactiveButton.props.className).toContain('bg-void')
      expect(inactiveThumb.props.className).toContain('bg-frost/90')

      const activeButton = activeLabel.props.children[1]
      const activeThumb = activeButton.props.children
      expect(activeButton.props.className).toContain('border-accent/80')
      expect(activeButton.props.className).toContain('bg-accent')
      expect(activeThumb.props.className).toContain('bg-void')
    })
  })
})
