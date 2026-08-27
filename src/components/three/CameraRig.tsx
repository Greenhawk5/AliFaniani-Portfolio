import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore, type FocusTarget } from '@/stores/uiStore'
import { useIsTouch } from '@/hooks/useMediaQuery'

const BASE_POS = new THREE.Vector3(6.9, 4.5, 7.9)
const BASE_TARGET = new THREE.Vector3(0.5, 1.55, -0.7)
const INTRO_POS = new THREE.Vector3(14.5, 9, 15)
const _dir = new THREE.Vector3()

export const FOCUS_PRESETS: Record<FocusTarget, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
  monitor: {
    pos: new THREE.Vector3(1.2, 2.05, -1.35),
    target: new THREE.Vector3(1.2, 1.6, -3.55),
  },
  clock: {
    pos: new THREE.Vector3(3.6, 3.05, 0.7),
    target: new THREE.Vector3(3.6, 3.0, -4.5),
  },
  shelf: {
    // pos: new THREE.Vector3(-3.11, 2.16, 1.17),
    pos: new THREE.Vector3(-2.95, 2.19, 1.22),
    target: new THREE.Vector3(-4.4, 1.95, 0.8),
  },
  // Project Board: centered on the board at (-2.2, 2.38, -4.42), pulled back
  // ~2.6 units along +Z so the full 2.62x1.74 board fits comfortably in the
  // 42° FOV with a little wall context, without clipping the shelf ledge below.
  projectBoard: {
    pos: new THREE.Vector3(-2.2, 2.42, -1.75),
    target: new THREE.Vector3(-2.2, 2.38, -4.42),
  },
  // Social Board: centered on the board at (-4.44, 2.75, 2.6) facing +X.
  // Pulled back along +X so the portrait 0.72x0.94 board reads clearly while
  // keeping the neon frame and shelf edge in frame for room context.
  socialBoard: {
    pos: new THREE.Vector3(-1.55, 2.72, 2.6),
    target: new THREE.Vector3(-4.44, 2.75, 2.6),
  },
}

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const pointer = useThree((s) => s.pointer)
  const size = useThree((s) => s.size)
  const motionMode = useSettingsStore((s) => s.motion)
  const cameraMode = useSettingsStore((s) => s.cameraMode)
  const focus = useUiStore((s) => s.focus)
  const isTouch = useIsTouch()

  const anchor = useRef(new THREE.Vector3().copy(INTRO_POS))
  const look = useRef(new THREE.Vector3().copy(BASE_TARGET))
  const offset = useRef(new THREE.Vector2())
  const introTween = useRef<gsap.core.Tween | null>(null)
  const firstFocusRun = useRef(true)

  useEffect(() => {
    if (motionMode === 'reduced') {
      anchor.current.copy(BASE_POS)
      return
    }
    introTween.current = gsap.to(anchor.current, {
      x: BASE_POS.x,
      y: BASE_POS.y,
      z: BASE_POS.z,
      duration: 3,
      delay: 0.45,
      ease: 'power3.inOut',
    })
    return () => {
      introTween.current?.kill()
    }
  }, [motionMode])

  useEffect(() => {
    if (firstFocusRun.current) {
      firstFocusRun.current = false
      return
    }
    // Focus presets are a Default-camera feature; Free Cam owns the view.
    if (cameraMode === 'free') return
    const preset = focus ? FOCUS_PRESETS[focus] : null
    const destPos = preset?.pos ?? BASE_POS
    const destTarget = preset?.target ?? BASE_TARGET
    introTween.current?.kill()
    const duration = motionMode === 'reduced' ? 0.4 : 1.5
    gsap.to(anchor.current, {
      x: destPos.x,
      y: destPos.y,
      z: destPos.z,
      duration,
      ease: 'power3.inOut',
      overwrite: true,
    })
    gsap.to(look.current, {
      x: destTarget.x,
      y: destTarget.y,
      z: destTarget.z,
      duration,
      ease: 'power3.inOut',
      overwrite: true,
    })
  }, [focus, motionMode, cameraMode])

  // Hand control back smoothly when leaving Free Cam: seed the cinematic rig
  // from wherever the free camera is currently looking, then ease it to the
  // standard (or focused) framing. Skipped on mount so the intro animation
  // stays completely untouched.
  const prevMode = useRef(cameraMode)
  useEffect(() => {
    const wasFree = prevMode.current === 'free'
    prevMode.current = cameraMode
    if (!wasFree || cameraMode !== 'default') return
    camera.getWorldDirection(_dir)
    anchor.current.copy(camera.position)
    look.current.copy(camera.position).addScaledVector(_dir, 3.2)
    const preset = focus ? FOCUS_PRESETS[focus] : null
    const destPos = preset?.pos ?? BASE_POS
    const destTarget = preset?.target ?? BASE_TARGET
    introTween.current?.kill()
    const duration = motionMode === 'reduced' ? 0.4 : 1.5
    gsap.to(anchor.current, {
      x: destPos.x,
      y: destPos.y,
      z: destPos.z,
      duration,
      ease: 'power3.inOut',
      overwrite: true,
    })
    gsap.to(look.current, {
      x: destTarget.x,
      y: destTarget.y,
      z: destTarget.z,
      duration,
      ease: 'power3.inOut',
      overwrite: true,
    })
  }, [cameraMode, focus, motionMode, camera])

  useFrame((_, dt) => {
    // Free Cam drives the camera from FreeCamRig; the cinematic rig stands by.
    if (cameraMode === 'free') return
    const parallax = motionMode === 'full' && !isTouch
    // Side-on focus views (like the shelf) are dolly-sensitive: world-space
    // parallax reads as zooming into the subject. Dampen it per-focus while
    // keeping a subtle cinematic drift.
    const parallaxScale =
      focus === 'shelf' || focus === 'projectBoard' || focus === 'socialBoard' ? 0.25 : 1
    const targetX = parallax ? pointer.x * 0.42 * parallaxScale : 0
    const targetY = parallax ? -pointer.y * 0.2 * parallaxScale : 0
    const k = 1 - Math.exp(-dt * 3.2)
    offset.current.x += (targetX - offset.current.x) * k
    offset.current.y += (targetY - offset.current.y) * k

    const aspect = size.width / size.height
    const zoomOut = aspect < 1.3 ? 1 + (1.3 - aspect) * 0.6 : 1

    camera.position.set(
      BASE_TARGET.x + (anchor.current.x - BASE_TARGET.x) * zoomOut + offset.current.x,
      BASE_TARGET.y + (anchor.current.y - BASE_TARGET.y) * zoomOut + offset.current.y * 0.6,
      BASE_TARGET.z + (anchor.current.z - BASE_TARGET.z) * zoomOut
    )
    camera.lookAt(look.current)
  })

  return null
}
