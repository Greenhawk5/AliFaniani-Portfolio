import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useUiStore } from '@/stores/uiStore'
import { useFreecamStore } from '@/stores/freecamStore'

// Manual exploration camera. Mounted only while cameraMode === 'free'; the
// cinematic rig (CameraRig) stands by and resumes exactly where it left off.
const MOVE_SPEED = 2.4 // units/s at room scale
const SPRINT_MULTIPLIER = 2.4
const LOOK_SENSITIVITY = 0.0032 // radians per pixel
const DRAG_SUPPRESS_PX = 6 // drags past this are not clicks
const ROTATE_DAMP = 18 // snappier look smoothing
const MOVE_DAMP = 12 // quick, natural momentum accel/decel
const PITCH_LIMIT = Math.PI / 2 - 0.06
const CAMERA_RADIUS = 0.22 // keeps the near plane out of walls/props

// Room shell: inner wall faces of the 9x9 floor plus usable headroom. Keeps
// the camera inside the room at all times.
const BOUNDS_MIN = new THREE.Vector3(-4.15, 0.45, -4.15)
const BOUNDS_MAX = new THREE.Vector3(4.15, 4.15, 4.15)

// Solid furniture volumes (matching the placed scene geometry), expanded at
// query time by CAMERA_RADIUS so the camera cannot clip into them.
const BLOCKERS: THREE.Box3[] = [
  new THREE.Box3(new THREE.Vector3(-0.5, 0.85, -4.175), new THREE.Vector3(2.9, 1.0, -3.025)), // desk top
  new THREE.Box3(new THREE.Vector3(0.29, 1.0, -3.92), new THREE.Vector3(2.11, 2.15, -3.45)), // monitor assembly
  new THREE.Box3(new THREE.Vector3(2.4, 1.0, -4.01), new THREE.Vector3(2.85, 2.01, -3.07)), // pc tower
  new THREE.Box3(new THREE.Vector3(0.85, 0.0, -2.79), new THREE.Vector3(1.55, 1.56, -2.05)), // chair
  new THREE.Box3(new THREE.Vector3(2.7, 0.0, 0.6), new THREE.Vector3(3.65, 1.05, 2.9)), // sofa
  new THREE.Box3(new THREE.Vector3(0.56, 0.0, 1.31), new THREE.Vector3(1.44, 0.47, 2.19)), // coffee table
  new THREE.Box3(new THREE.Vector3(3.7, 0.0, 0.6), new THREE.Vector3(4.2, 1.8, 1.1)), // floor lamp
  new THREE.Box3(new THREE.Vector3(-4.6, 1.3, -1.5), new THREE.Vector3(-4.05, 2.8, 1.8)), // wall shelf
]

const KEY_ALIASES: Record<string, 'w' | 'a' | 's' | 'd' | 'q' | 'e' | 'shift'> = {
  KeyW: 'w',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
  KeyQ: 'q',
  KeyE: 'e',
  ShiftLeft: 'shift',
  ShiftRight: 'shift',
  w: 'w',
  a: 'a',
  s: 's',
  d: 'd',
  q: 'q',
  e: 'e',
  shift: 'shift',
}

const _dir = new THREE.Vector3()
const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _wish = new THREE.Vector3()

// Clamp into the room shell, then push out of any furniture box along the axis
// of least penetration. Continuous damped motion keeps pushes small and stable.
export function resolveFreeCamPosition(pos: THREE.Vector3) {
  pos.min(BOUNDS_MAX).max(BOUNDS_MIN)
  for (const box of BLOCKERS) {
    if (
      pos.x < box.min.x - CAMERA_RADIUS ||
      pos.x > box.max.x + CAMERA_RADIUS ||
      pos.y < box.min.y - CAMERA_RADIUS ||
      pos.y > box.max.y + CAMERA_RADIUS ||
      pos.z < box.min.z - CAMERA_RADIUS ||
      pos.z > box.max.z + CAMERA_RADIUS
    ) {
      continue
    }
    const pxMin = pos.x - (box.min.x - CAMERA_RADIUS)
    const pxMax = box.max.x + CAMERA_RADIUS - pos.x
    const pyMin = pos.y - (box.min.y - CAMERA_RADIUS)
    const pyMax = box.max.y + CAMERA_RADIUS - pos.y
    const pzMin = pos.z - (box.min.z - CAMERA_RADIUS)
    const pzMax = box.max.z + CAMERA_RADIUS - pos.z
    const min = Math.min(pxMin, pxMax, pyMin, pyMax, pzMin, pzMax)
    if (min === pxMin) pos.x = box.min.x - CAMERA_RADIUS
    else if (min === pxMax) pos.x = box.max.x + CAMERA_RADIUS
    else if (min === pyMin) pos.y = box.min.y - CAMERA_RADIUS
    else if (min === pyMax) pos.y = box.max.y + CAMERA_RADIUS
    else if (min === pzMin) pos.z = box.min.z - CAMERA_RADIUS
    else pos.z = box.max.z + CAMERA_RADIUS
  }
  return pos
}

export function FreeCamRig() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const setFocus = useUiStore((s) => s.setFocus)
  const setHoveredLabel = useUiStore((s) => s.setHoveredLabel)

  const state = useRef({
    yaw: 0,
    pitch: 0,
    yawTarget: 0,
    pitchTarget: 0,
    pos: new THREE.Vector3(),
    entryFrom: new THREE.Vector3(),
    blend: 1,
    velocity: new THREE.Vector3(),
    keys: new Set<string>(),
    dragging: false,
    lastX: 0,
    lastY: 0,
    dragDistance: 0,
    suppressClick: false,
    capturedPointerId: null as number | null,
  })

  useEffect(() => {
    const s = state.current
    const el = gl.domElement

    // Take over from the cinematic camera smoothly
    camera.getWorldDirection(_dir)
    s.yaw = s.yawTarget = Math.atan2(-_dir.x, -_dir.z)
    s.pitch = s.pitchTarget = Math.asin(THREE.MathUtils.clamp(_dir.y, -1, 1))
    camera.rotation.reorder('YXZ')
    s.entryFrom.copy(camera.position)
    s.pos.copy(camera.position)
    resolveFreeCamPosition(s.pos)
    s.blend = 0
    s.velocity.set(0, 0, 0)
    s.keys.clear()
    s.dragging = false
    s.suppressClick = false

    setFocus(null)
    setHoveredLabel(null)

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || s.dragging) return
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
      el.style.cursor = 'grabbing'
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!s.dragging || e.pointerId !== s.capturedPointerId) return
      const dx = e.clientX - s.lastX
      const dy = e.clientY - s.lastY
      s.lastX = e.clientX
      s.lastY = e.clientY
      s.dragDistance += Math.hypot(dx, dy)
      s.yawTarget -= dx * LOOK_SENSITIVITY
      s.pitchTarget = THREE.MathUtils.clamp(
        s.pitchTarget - dy * LOOK_SENSITIVITY,
        -PITCH_LIMIT,
        PITCH_LIMIT
      )
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== s.capturedPointerId && !s.dragging) return
      s.dragging = false
      s.suppressClick = s.dragDistance > DRAG_SUPPRESS_PX
      el.style.cursor = ''
      if (s.capturedPointerId !== null) {
        try {
          if (el.hasPointerCapture(s.capturedPointerId)) {
            el.releasePointerCapture(s.capturedPointerId)
          }
        } catch {
          /* non-fatal */
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

    const onKeyDown = (e: KeyboardEvent) => {
      const key = KEY_ALIASES[e.code] ?? KEY_ALIASES[e.key.toLowerCase()]
      if (!key) return
      s.keys.add(key)
      e.preventDefault()
    }

    const onKeyUp = (e: KeyboardEvent) => {
      const key = KEY_ALIASES[e.code] ?? KEY_ALIASES[e.key.toLowerCase()]
      if (key) s.keys.delete(key)
    }

    const onBlur = () => {
      s.keys.clear()
      s.dragging = false
      useFreecamStore.getState().reset()
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('click', onClickCapture, true)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      el.style.cursor = ''
      if (s.capturedPointerId !== null) {
        try {
          if (el.hasPointerCapture(s.capturedPointerId)) {
            el.releasePointerCapture(s.capturedPointerId)
          }
        } catch {
          /* non-fatal */
        }
        s.capturedPointerId = null
      }
      s.keys.clear()
      s.velocity.set(0, 0, 0)
      s.dragging = false
      s.suppressClick = false
      useFreecamStore.getState().reset()
    }
  }, [camera, gl, setFocus, setHoveredLabel])

  useFrame((_, rawDt) => {
    const s = state.current
    const dt = Math.min(rawDt, 0.05)

    // Smoothed look
    s.yaw = THREE.MathUtils.damp(s.yaw, s.yawTarget, ROTATE_DAMP, dt)
    s.pitch = THREE.MathUtils.damp(s.pitch, s.pitchTarget, ROTATE_DAMP, dt)

    // Merge keyboard + virtual joystick
    const joy = useFreecamStore.getState()
    const joyX = joy.moveX
    const joyY = joy.moveY
    const joyElevate = joy.elevate

    const f = (s.keys.has('w') ? 1 : 0) - (s.keys.has('s') ? 1 : 0) + joyY
    const r = (s.keys.has('d') ? 1 : 0) - (s.keys.has('a') ? 1 : 0) + joyX
    const u = (s.keys.has('e') ? 1 : 0) - (s.keys.has('q') ? 1 : 0) + joyElevate

    const isSprinting = s.keys.has('shift') || Math.hypot(joyX, joyY) > 0.85
    const speed = MOVE_SPEED * (isSprinting ? SPRINT_MULTIPLIER : 1)

    const cosPitch = Math.cos(s.pitch)
    _forward.set(-Math.sin(s.yaw) * cosPitch, Math.sin(s.pitch), -Math.cos(s.yaw) * cosPitch)
    _right.set(Math.cos(s.yaw), 0, -Math.sin(s.yaw))
    _wish.set(0, 0, 0).addScaledVector(_forward, f).addScaledVector(_right, r)
    _wish.y += u
    if (_wish.lengthSq() > 1) _wish.normalize()
    _wish.multiplyScalar(speed)

    s.velocity.lerp(_wish, 1 - Math.exp(-MOVE_DAMP * dt))
    s.pos.addScaledVector(s.velocity, dt)
    resolveFreeCamPosition(s.pos)

    if (s.blend < 1) {
      s.blend = Math.min(1, s.blend + dt / 0.7)
      const t = s.blend * s.blend * (3 - 2 * s.blend)
      camera.position.lerpVectors(s.entryFrom, s.pos, t)
    } else {
      camera.position.copy(s.pos)
    }
    camera.rotation.set(s.pitch, s.yaw, 0)
  })

  return null
}
