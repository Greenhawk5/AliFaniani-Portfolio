import * as THREE from 'three'
import type { FocusTarget } from '@/stores/uiStore'
import { MONITOR } from './monitorConfig'

export const BASE_POS = new THREE.Vector3(6.9, 4.5, 7.9)
export const BASE_TARGET = new THREE.Vector3(0.5, 1.55, -0.7)
export const INTRO_POS = new THREE.Vector3(14.5, 9, 15)

export const BASE_FOV = 42
export const REF_ASPECT = 1.6
export const MAX_PORTRAIT_FOV = 54
export const MAX_LANDSCAPE_FOV = 46

// Room bounding shell limits for camera positioning (inside inner wall faces)
export const ROOM_BOUNDS_MIN = new THREE.Vector3(-4.0, 0.45, -4.0)
export const ROOM_BOUNDS_MAX = new THREE.Vector3(4.0, 4.2, 4.0)

export interface FramingTargetProfile {
  target: THREE.Vector3
  viewNormal: THREE.Vector3
  width: number
  height: number
  minDist: number
  maxDist: number
  desktopPos: THREE.Vector3
  marginRatio: number
}

const _ms = MONITOR.size

export const FRAMING_PROFILES: Record<FocusTarget, FramingTargetProfile> = {
  monitor: {
    target: new THREE.Vector3(
      MONITOR.position[0],
      MONITOR.position[1] + 0.595 * _ms,
      MONITOR.position[2] + 0.25 * _ms
    ),
    viewNormal: new THREE.Vector3(0, 0.2, 1).normalize(),
    width: 1.82 * _ms,
    height: 1.08 * _ms,
    minDist: 1.2,
    maxDist: 2.8,
    desktopPos: new THREE.Vector3(
      MONITOR.position[0],
      MONITOR.position[1] + 1.045 * _ms,
      MONITOR.position[2] + 2.45 * _ms
    ),
    marginRatio: 1.25,
  },
  clock: {
    target: new THREE.Vector3(3.6, 3.0, -4.42),
    viewNormal: new THREE.Vector3(0, 0, 1),
    width: 1.04,
    height: 0.64,
    minDist: 1.8,
    maxDist: 5.2,
    desktopPos: new THREE.Vector3(3.6, 3.05, 0.7),
    marginRatio: 1.3,
  },
  shelf: {
    // Shelf is mounted on left wall at X = -4.4 spanning Z [-0.1, 1.7], Y [1.45, 2.45]
    target: new THREE.Vector3(-4.35, 1.95, 0.8),
    viewNormal: new THREE.Vector3(1, 0, 0), // faces +X into the room
    width: 1.8,
    height: 1.0,
    minDist: 1.4,
    maxDist: 3.6,
    desktopPos: new THREE.Vector3(-2.95, 2.19, 1.22),
    marginRatio: 1.25,
  },
  projectBoard: {
    // Back wall mounted board at X = -2.2, Y = 2.38, Z = -4.42
    target: new THREE.Vector3(-2.2, 2.38, -4.42),
    viewNormal: new THREE.Vector3(0, 0, 1), // faces +Z into room
    width: 2.62,
    height: 1.74,
    minDist: 2.2,
    maxDist: 3.9,
    desktopPos: new THREE.Vector3(-2.2, 2.42, -1.75),
    marginRatio: 1.2,
  },
  socialBoard: {
    // Left wall mounted board at X = -4.44, Z = 2.6, Y = 2.75
    target: new THREE.Vector3(-4.44, 2.75, 2.6),
    viewNormal: new THREE.Vector3(1, 0, 0), // faces +X into room
    width: 0.72,
    height: 0.94,
    minDist: 1.6,
    maxDist: 3.4,
    desktopPos: new THREE.Vector3(-1.55, 2.72, 2.6),
    marginRatio: 1.25,
  },
  visitorCounter: {
    // Back wall mounted board at X = 3.9, Y = 1.72, Z = -4.44
    target: new THREE.Vector3(3.9, 1.72, -4.44),
    viewNormal: new THREE.Vector3(0, 0, 1), // faces +Z into room
    width: 0.64,
    height: 0.82,
    minDist: 1.6,
    maxDist: 3.2,
    desktopPos: new THREE.Vector3(3.9, 1.75, -2.1),
    marginRatio: 1.3,
  },
}

/**
 * Computes responsive vertical FOV based on viewport aspect ratio.
 * Smoothly widens for narrow portrait screens while avoiding fisheye distortion.
 */
export function computeResponsiveFov(aspect: number): number {
  if (aspect >= REF_ASPECT) {
    return BASE_FOV
  }
  if (aspect <= 1.0) {
    // Portrait: progressively widen up to MAX_PORTRAIT_FOV
    const t = THREE.MathUtils.clamp((1.0 - aspect) / 0.55, 0, 1)
    return THREE.MathUtils.lerp(BASE_FOV, MAX_PORTRAIT_FOV, t)
  }
  // Aspect between 1.0 and 1.6 (e.g. tablet landscape, square)
  const t = (REF_ASPECT - aspect) / (REF_ASPECT - 1.0)
  return THREE.MathUtils.lerp(BASE_FOV, BASE_FOV + 2, t)
}

/**
 * Calculates optimal camera distance to fit an object of width W and height H
 * within the viewport at a given vertical FOV and aspect ratio, with margin.
 */
export function calculateFitDistance(
  width: number,
  height: number,
  vFovDeg: number,
  aspect: number,
  marginRatio = 1.25
): number {
  const vFovRad = THREE.MathUtils.degToRad(vFovDeg)
  const tanHalfVFov = Math.tan(vFovRad / 2)
  const tanHalfHFov = tanHalfVFov * aspect

  const distV = (height * marginRatio) / (2 * tanHalfVFov)
  const distH = (width * marginRatio) / (2 * tanHalfHFov)

  return Math.max(distV, distH)
}

/**
 * Calculates responsive camera position and look target for any focus target.
 * Guarantees that the camera stays inside the room boundaries and frames the
 * subject comfortably across desktop, tablet, and mobile orientations.
 */
export function calculateResponsiveFraming(
  focus: FocusTarget | null,
  aspect: number
): {
  fov: number
  cameraPos: THREE.Vector3
  targetPos: THREE.Vector3
} {
  const fov = computeResponsiveFov(aspect)

  if (!focus) {
    // Default room overview
    const pos = new THREE.Vector3().copy(BASE_POS)
    const target = new THREE.Vector3().copy(BASE_TARGET)

    if (aspect < REF_ASPECT) {
      // Dolly room camera along line of sight to keep the full diorama framed
      const dollyScale = Math.min(1.45, Math.pow(REF_ASPECT / aspect, 0.45))
      pos.set(
        target.x + (BASE_POS.x - target.x) * dollyScale,
        target.y + (BASE_POS.y - target.y) * dollyScale,
        target.z + (BASE_POS.z - target.z) * dollyScale
      )
    }

    return { fov, cameraPos: pos, targetPos: target }
  }

  const profile = FRAMING_PROFILES[focus]
  if (!profile) {
    return {
      fov,
      cameraPos: new THREE.Vector3().copy(BASE_POS),
      targetPos: new THREE.Vector3().copy(BASE_TARGET),
    }
  }

  // On standard desktop landscape (aspect >= REF_ASPECT), preserve exact approved desktop positions
  if (aspect >= REF_ASPECT) {
    return {
      fov: BASE_FOV,
      cameraPos: new THREE.Vector3().copy(profile.desktopPos),
      targetPos: new THREE.Vector3().copy(profile.target),
    }
  }

  // On mobile / tablet, compute distance along object view normal
  const rawDist = calculateFitDistance(
    profile.width,
    profile.height,
    fov,
    aspect,
    profile.marginRatio
  )
  const dist = THREE.MathUtils.clamp(rawDist, profile.minDist, profile.maxDist)

  const cameraPos = new THREE.Vector3()
    .copy(profile.target)
    .addScaledVector(profile.viewNormal, dist)

  // Blend in desktop elevation offset smoothly for intermediate aspects
  const desktopOffset = new THREE.Vector3().subVectors(profile.desktopPos, profile.target)
  const lateralBlend = THREE.MathUtils.clamp((aspect - 0.7) / (REF_ASPECT - 0.7), 0, 1)

  if (lateralBlend > 0) {
    const desktopDir = desktopOffset.clone().normalize()
    const blendedDir = new THREE.Vector3()
      .copy(profile.viewNormal)
      .lerp(desktopDir, lateralBlend * 0.7)
      .normalize()
    cameraPos.copy(profile.target).addScaledVector(blendedDir, dist)
  }

  // Apply vertical offset if needed for top/bottom UI clearance
  if (aspect < 1.0) {
    // In portrait, keep camera slightly elevated or centered with the object
    cameraPos.y = Math.max(cameraPos.y, profile.target.y - 0.05)
  } else if (aspect > 2.0) {
    // In ultra-wide landscape (e.g. phones in landscape 939x414), shift target slightly down
    // to give headroom below the top navbar
    cameraPos.y = THREE.MathUtils.clamp(cameraPos.y, 1.2, 3.2)
  }

  // Safety clamp inside room volume so camera NEVER clips outside walls or below floor
  cameraPos.clamp(ROOM_BOUNDS_MIN, ROOM_BOUNDS_MAX)

  return {
    fov,
    cameraPos,
    targetPos: new THREE.Vector3().copy(profile.target),
  }
}
