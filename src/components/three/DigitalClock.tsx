import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createClockRenderer } from '@/three/screens/clockScreen'
import { useSettingsStore } from '@/stores/settingsStore'
import { formatClock, formatDateLabel, timezoneLabel } from '@/lib/timeController'
import { env } from '@/three/env'
import { Interactable } from './Interactable'

export function DigitalClock() {
  const timezoneMode = useSettingsStore((s) => s.timezoneMode)
  const renderer = useMemo(() => createClockRenderer(), [])
  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(renderer.canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [renderer])
  const material = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    const time = formatClock(env.hours)
    const dateLine = formatDateLabel(timezoneMode)
    const tzLine = timezoneLabel(timezoneMode)
    if (renderer.update(time, dateLine, tzLine)) {
      texture.needsUpdate = true
    }
    if (material.current) {
      material.current.emissiveIntensity = 0.85 + env.monitor * 0.5
    }
  })

  return (
    <group position={[3.6, 3.02, -4.42]}>
      <Interactable id="clock" label="Digital Clock — click to open time settings" focusable>
        <mesh castShadow>
          <boxGeometry args={[1.04, 0.64, 0.06]} />
          <meshStandardMaterial color="#0b0e16" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.035]}>
          <planeGeometry args={[0.96, 0.56]} />
          <meshStandardMaterial
            ref={material}
            color="#000000"
            emissive="#ffffff"
            emissiveMap={texture}
            emissiveIntensity={1.1}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      </Interactable>
    </group>
  )
}

