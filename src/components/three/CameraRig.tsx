import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { useIsTouch } from '@/hooks/useMediaQuery'
import {
  BASE_TARGET,
  INTRO_POS,
  calculateResponsiveFraming,
} from './cameraFraming'

const _dir = new THREE.Vector3()
const DRAG_SUPPRESS_PX = 8
const ORBIT_SENSITIVITY = 0.0035

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const motionMode = useSettingsStore((s) => s.motion)
  const cameraMode = useSettingsStore((s) => s.cameraMode)
  const focus = useUiStore((s) => s.focus)
  const isTouch = useIsTouch()

  const anchor = useRef(new THREE.Vector3().copy(INTRO_POS))
  const look = useRef(new THREE.Vector3().copy(BASE_TARGET))
  const offset = useRef(new THREE.Vector2())
  const introTween = useRef<gsap.core.Tween | null>(null)
  const focusTween = useRef<gsap.core.Tween | null>(null)
  const lookTween = useRef<gsap.core.Tween | null>(null)
  const firstFocusRun = useRef(true)

  // Touch orbit state for default camera exploration
  const orbitState = useRef({
    orbitYaw: 0,
    orbitPitch: 0,
    orbitDistMult: 1.0,
    dragging: false,
    dragDistance: 0,
    lastX: 0,
    lastY: 0,
    suppressClick: false,
    capturedPointerId: null as number | null,
    pinchActive: false,
    pinchStartDist: 0,
    pinchStartMult: 1.0,
    activePointers: new Map<number, { x: number; y: number }>(),
  })

  // Intro animation on initial load
  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const { cameraPos } = calculateResponsiveFraming(null, aspect)

    if (motionMode === 'reduced') {
      anchor.current.copy(cameraPos)
      return
    }
    introTween.current = gsap.to(anchor.current, {
      x: cameraPos.x,
      y: cameraPos.y,
      z: cameraPos.z,
      duration: 3,
      delay: 0.45,
      ease: 'power3.inOut',
    })
    return () => {
      introTween.current?.kill()
    }
  }, [motionMode, size.width, size.height])

  // Deterministic camera focus transitions
  const animateToFocus = useCallback(
    (instant = false) => {
      if (cameraMode === 'free') return
      const aspect = size.width / Math.max(size.height, 1)
      const { cameraPos, targetPos } = calculateResponsiveFraming(focus, aspect)

      introTween.current?.kill()
      focusTween.current?.kill()
      lookTween.current?.kill()

      if (instant || motionMode === 'reduced') {
        anchor.current.copy(cameraPos)
        look.current.copy(targetPos)
        useUiStore.getState().setIsCameraMoving(false)
        return
      }

      const duration = 1.35
      const setIsCameraMoving = useUiStore.getState().setIsCameraMoving

      focusTween.current = gsap.to(anchor.current, {
        x: cameraPos.x,
        y: cameraPos.y,
        z: cameraPos.z,
        duration,
        ease: 'power3.inOut',
        overwrite: 'auto',
        onStart: () => setIsCameraMoving(true),
        onComplete: () => setIsCameraMoving(false),
      })

      lookTween.current = gsap.to(look.current, {
        x: targetPos.x,
        y: targetPos.y,
        z: targetPos.z,
        duration,
        ease: 'power3.inOut',
        overwrite: 'auto',
      })
    },
    [focus, cameraMode, size.width, size.height, motionMode]
  )

  useEffect(() => {
    if (firstFocusRun.current) {
      firstFocusRun.current = false
      return
    }
    animateToFocus()
  }, [focus, animateToFocus])

  // Handle smooth transition when switching back from Free Cam to Default
  const prevMode = useRef(cameraMode)
  useEffect(() => {
    const wasFree = prevMode.current === 'free'
    prevMode.current = cameraMode
    if (!wasFree || cameraMode !== 'default') return

    camera.getWorldDirection(_dir)
    anchor.current.copy(camera.position)
    look.current.copy(camera.position).addScaledVector(_dir, 3.2)
    animateToFocus()
  }, [cameraMode, camera, animateToFocus])

  // Touch Orbit Controls for Default Room View
  useEffect(() => {
    const el = gl.domElement
    const s = orbitState.current

    const onPointerDown = (e: PointerEvent) => {
      // Only enable touch orbit on Default camera mode when not actively focused on an object
      if (cameraMode !== 'default') return
      s.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (s.activePointers.size === 1 && !focus) {
        s.dragging = true
        s.lastX = e.clientX
        s.lastY = e.clientY
        s.dragDistance = 0
        s.suppressClick = false
        s.capturedPointerId = e.pointerId
        try {
          el.setPointerCapture(e.pointerId)
        } catch {
          /* non-fatal */
        }
      } else if (s.activePointers.size === 2 && !focus) {
        // Two-finger pinch zoom
        s.pinchActive = true
        const pts = Array.from(s.activePointers.values())
        s.pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        s.pinchStartMult = s.orbitDistMult
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!s.activePointers.has(e.pointerId)) return
      s.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (s.pinchActive && s.activePointers.size >= 2) {
        const pts = Array.from(s.activePointers.values())
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        if (s.pinchStartDist > 0) {
          const ratio = s.pinchStartDist / Math.max(dist, 1)
          s.orbitDistMult = THREE.MathUtils.clamp(s.pinchStartMult * ratio, 0.75, 1.4)
        }
        s.dragDistance += 10
        return
      }

      if (s.dragging && s.capturedPointerId === e.pointerId && !focus) {
        const dx = e.clientX - s.lastX
        const dy = e.clientY - s.lastY
        s.lastX = e.clientX
        s.lastY = e.clientY
        s.dragDistance += Math.hypot(dx, dy)

        // Orbit around room center: yaw + pitch
        s.orbitYaw = THREE.MathUtils.clamp(
          s.orbitYaw - dx * ORBIT_SENSITIVITY,
          -0.45,
          0.85
        )
        s.orbitPitch = THREE.MathUtils.clamp(
          s.orbitPitch - dy * ORBIT_SENSITIVITY * 0.7,
          -0.25,
          0.35
        )
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      s.activePointers.delete(e.pointerId)
      if (s.pinchActive && s.activePointers.size < 2) {
        s.pinchActive = false
      }
      if (s.capturedPointerId === e.pointerId) {
        s.dragging = false
        s.suppressClick = s.dragDistance > DRAG_SUPPRESS_PX
        if (el.hasPointerCapture(e.pointerId)) {
          try {
            el.releasePointerCapture(e.pointerId)
          } catch {
            /* non-fatal */
          }
        }
        s.capturedPointerId = null
      }
    }

    const onClickCapture = (e: MouseEvent) => {
      if (e.target !== el) {
        s.suppressClick = false
        return
      }
      if (!s.suppressClick) return
      s.suppressClick = false
      e.stopPropagation()
      e.preventDefault()
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('click', onClickCapture, true)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('click', onClickCapture, true)
      s.activePointers.clear()
      s.dragging = false
      s.pinchActive = false
    }
  }, [gl, cameraMode, focus])

  // Camera render loop integration
  useFrame((_, dt) => {
    if (cameraMode === 'free') return

    const aspect = size.width / Math.max(size.height, 1)
    const { fov } = calculateResponsiveFraming(focus, aspect)
    const persp = camera as THREE.PerspectiveCamera

    if (Math.abs(persp.fov - fov) > 0.01) {
      persp.fov = fov
      persp.updateProjectionMatrix()
    }

    // Parallax logic: subtle mouse tilt on desktop
    const parallax = motionMode === 'full' && !isTouch && !focus
    const targetX = parallax ? pointer.x * 0.42 : 0
    const targetY = parallax ? -pointer.y * 0.2 : 0
    const k = 1 - Math.exp(-dt * 3.5)
    offset.current.x += (targetX - offset.current.x) * k
    offset.current.y += (targetY - offset.current.y) * k

    if (!focus) {
      // Room Overview: Combine base anchor with user touch orbit rotation & distance
      const s = orbitState.current
      const lookTarget = look.current

      // Convert base position delta into spherical offset
      const baseDelta = new THREE.Vector3().subVectors(anchor.current, lookTarget)
      const baseDist = baseDelta.length() * s.orbitDistMult

      const curYaw = Math.atan2(baseDelta.x, baseDelta.z) + s.orbitYaw
      const curPitch = Math.asin(THREE.MathUtils.clamp(baseDelta.y / Math.max(baseDist, 0.001), -1, 1)) + s.orbitPitch

      const cosP = Math.cos(curPitch)
      const camX = lookTarget.x + baseDist * Math.sin(curYaw) * cosP + offset.current.x
      const camY = Math.max(lookTarget.y + baseDist * Math.sin(curPitch) + offset.current.y * 0.6, 0.6)
      const camZ = lookTarget.z + baseDist * Math.cos(curYaw) * cosP

      camera.position.set(camX, camY, camZ)
      camera.lookAt(lookTarget)
    } else {
      // Focused on specific object: position is driven by responsive geometry framing + subtle drift
      camera.position.set(
        anchor.current.x + offset.current.x * 0.15,
        anchor.current.y + offset.current.y * 0.1,
        anchor.current.z
      )
      camera.lookAt(look.current)
    }
  })

  return null
}
