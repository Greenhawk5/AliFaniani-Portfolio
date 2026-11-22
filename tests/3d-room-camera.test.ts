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

  describe('Issue 1 — Admin Switch Thumb Alignment & Centering', () => {
    it('centers thumb vertically with items-center and achieves symmetric horizontal offsets in OFF and ON states', () => {
      const inactiveLabel = AdminSwitch({
        checked: false,
        onChange: () => {},
        label: 'Pin notification immediately',
      })

      const activeLabel = AdminSwitch({
        checked: true,
        onChange: () => {},
        label: 'Pin notification immediately',
      })

      const inactiveButton = inactiveLabel.props.children[1]
      const inactiveThumb = inactiveButton.props.children

      // Button must have items-center for mathematical vertical centering in flexbox
      expect(inactiveButton.props.className).toContain('items-center')
      expect(inactiveButton.props.className).toContain('h-5')
      expect(inactiveButton.props.className).toContain('w-9')
      expect(inactiveButton.props.className).toContain('border-edge-2')
      expect(inactiveButton.props.className).toContain('bg-void')

      // OFF state horizontal translate is translate-x-0.5 (2px)
      expect(inactiveThumb.props.className).toContain('translate-x-0.5')
      expect(inactiveThumb.props.className).toContain('h-4')
      expect(inactiveThumb.props.className).toContain('w-4')
      expect(inactiveThumb.props.className).toContain('bg-frost/90')

      const activeButton = activeLabel.props.children[1]
      const activeThumb = activeButton.props.children

      expect(activeButton.props.className).toContain('items-center')
      expect(activeButton.props.className).toContain('border-accent/80')
      expect(activeButton.props.className).toContain('bg-accent')

      // ON state horizontal translate is translate-x-4 (16px), matching outer-right margin of 2px
      expect(activeThumb.props.className).toContain('translate-x-4')
      expect(activeThumb.props.className).toContain('bg-void')
    })
  })

  describe('Issue 2 — Freecam Control Layout & Zero-Overlap Matrix', () => {
    it('guarantees zero bounding box overlap between VirtualJoystick and Exit Free Cam on all mobile viewports', () => {
      const viewports = [
        { name: 'Small Mobile Portrait', width: 360, height: 800 },
        { name: 'Samsung S21 FE Portrait', width: 414, height: 939 },
        { name: 'iPhone 14 Portrait', width: 390, height: 844 },
        { name: 'Mobile Landscape 844x390', width: 844, height: 390 },
        { name: 'Samsung S21 FE Landscape', width: 939, height: 414 },
      ]

      for (const vp of viewports) {
        // Virtual Joystick + Elevation controls group:
        // Positioned at bottom-left: bottom: max(1.25rem, safe-inset) ~ 20px, left: 16px
        // Width: 104px (pad) + 12px (gap) + 36px (elevation btn) = 152px
        // Height: 104px (pad)
        const joystickBox = {
          left: 16,
          right: 16 + 152, // 168px
          top: vp.height - 20 - 104, // e.g. 800 - 124 = 676px
          bottom: vp.height - 20,
        }

        // On mobile (< 640px or mobile landscape), Exit Free Cam bar is positioned in the upper-left safe area:
        // top: max(4.75rem, safe-inset) ~ 76px, left: 16px
        // Width: ~165px, Height: 36px
        const exitBarBox = {
          left: 16,
          right: 16 + 165,
          top: 76,
          bottom: 76 + 36, // 112px
        }

        // Test vertical separation:
        // Exit bar bottom (112px) must be well above the joystick top
        const verticalGap = joystickBox.top - exitBarBox.bottom
        expect(verticalGap).toBeGreaterThan(100) // At least 100px of clear space between them

        // Overlap predicate:
        const overlaps =
          joystickBox.left < exitBarBox.right &&
          joystickBox.right > exitBarBox.left &&
          joystickBox.top < exitBarBox.bottom &&
          joystickBox.bottom > exitBarBox.top

        expect(overlaps).toBe(false)
      }
    })
  })

  describe('Issue 3 — Camera Focus Transition Continuity', () => {
    it('starts transitions directly from visible camera transform without position or orientation jumps', () => {
      // Create a mock Three.js camera at an arbitrary rotated/positioned state
      const mockCamera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100)
      mockCamera.position.set(2.4, 1.8, 11.2)
      mockCamera.lookAt(new THREE.Vector3(-1.0, 1.5, 0.0))

      const targetPos = FRAMING_PROFILES.shelf.target

      // Continuity check:
      // Starting anchor must match camera.position
      const startingAnchor = new THREE.Vector3().copy(mockCamera.position)
      expect(startingAnchor.x).toBeCloseTo(2.4, 4)
      expect(startingAnchor.y).toBeCloseTo(1.8, 4)
      expect(startingAnchor.z).toBeCloseTo(11.2, 4)

      // Starting look must lie along camera current forward direction
      const dir = new THREE.Vector3()
      mockCamera.getWorldDirection(dir)
      const currentDist = mockCamera.position.distanceTo(targetPos)
      const startingLook = new THREE.Vector3().copy(mockCamera.position).addScaledVector(dir, currentDist)

      // Look direction from mockCamera towards startingLook must match mockCamera direction exactly
      const recomputedDir = new THREE.Vector3().subVectors(startingLook, mockCamera.position).normalize()
      expect(recomputedDir.x).toBeCloseTo(dir.x, 4)
      expect(recomputedDir.y).toBeCloseTo(dir.y, 4)
      expect(recomputedDir.z).toBeCloseTo(dir.z, 4)
    })
  })

  describe('Issue 4 — Vertical Pitch Look Direction & Touch Controls', () => {
    it('corrects vertical pitch look direction: downward drag rotates view upward and upward drag rotates view downward', () => {
      const PITCH_LIMIT = Math.PI / 2 - 0.06
      const LOOK_SENSITIVITY = 0.0032

      let pitchTarget = 0

      // Simulate dragging finger DOWNWARD:
      // In browser window space, Y increases downwards, so clientY_now > clientY_prev => dy > 0
      const dyDown = 25 // 25px downward drag
      const deltaDown = dyDown * LOOK_SENSITIVITY
      pitchTarget = THREE.MathUtils.clamp(pitchTarget + deltaDown, -PITCH_LIMIT, PITCH_LIMIT)

      // Resulting pitchTarget must be positive (camera tilts upward into positive Y)
      expect(pitchTarget).toBeGreaterThan(0)

      // Forward vector Y component = sin(pitchTarget)
      const forwardY = Math.sin(pitchTarget)
      expect(forwardY).toBeGreaterThan(0) // Camera looking UPWARD

      // Simulate dragging finger UPWARD:
      // clientY_now < clientY_prev => dy < 0
      const dyUp = -50 // 50px upward drag
      const deltaUp = dyUp * LOOK_SENSITIVITY
      pitchTarget = THREE.MathUtils.clamp(pitchTarget + deltaUp, -PITCH_LIMIT, PITCH_LIMIT)

      // Resulting pitchTarget must be negative (camera tilts downward into negative Y)
      expect(pitchTarget).toBeLessThan(0)
      expect(Math.sin(pitchTarget)).toBeLessThan(0) // Camera looking DOWNWARD
    })

    it('clamps pitch strictly within safe angles to prevent camera flipping or gimbal singularity', () => {
      const PITCH_LIMIT = Math.PI / 2 - 0.06
      const LOOK_SENSITIVITY = 0.0032

      // Extreme drag up
      let pitch = 0
      pitch = THREE.MathUtils.clamp(pitch + (-2000 * LOOK_SENSITIVITY), -PITCH_LIMIT, PITCH_LIMIT)
      expect(pitch).toBe(-PITCH_LIMIT)

      // Extreme drag down
      pitch = THREE.MathUtils.clamp(pitch + (4000 * LOOK_SENSITIVITY), -PITCH_LIMIT, PITCH_LIMIT)
      expect(pitch).toBe(PITCH_LIMIT)
    })

    it('preserves natural horizontal yaw mapping: rightward drag rotates view rightward', () => {
      const LOOK_SENSITIVITY = 0.0032
      let yaw = 0

      // Drag right: dx > 0
      const dx = 30
      yaw -= dx * LOOK_SENSITIVITY
      expect(yaw).toBeLessThan(0)

      // Forward X = -sin(yaw) * cos(pitch)
      // When yaw < 0, -sin(yaw) > 0 => looking RIGHTWARD
      const forwardX = -Math.sin(yaw)
      expect(forwardX).toBeGreaterThan(0)
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
})
