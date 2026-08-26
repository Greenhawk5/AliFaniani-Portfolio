import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { createMonitorRenderer } from '@/three/screens/monitorScreen'
import { env } from '@/three/env'
import { Interactable } from './Interactable'
import { useSettingsStore } from '@/stores/settingsStore'

export function MonitorSetup() {
  const quality = useSettingsStore((s) => s.quality)
  const renderer = useMemo(() => createMonitorRenderer(), [])
  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(renderer.canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [renderer])
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const lastUpdate = useRef(-1)

  useFrame(() => {
    const interval = quality === 'performance' ? 0.14 : 0.07
    if (lastUpdate.current < 0 || env.time - lastUpdate.current >= interval) {
      lastUpdate.current = env.time
      if (renderer.update(env.time)) texture.needsUpdate = true
    }
    if (material.current) {
      material.current.emissiveIntensity = 0.55 + env.monitor * 0.75
    }
  })

  const standMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ color: '#12161f', roughness: 0.35, metalness: 0.7 }),
    []
  )

  return (
    // Move the complete monitor assembly, including its hitbox and screen,
    // 0.12 units toward the window.
    <group position={[1.2, 1.005, -3.80]}>
      <Interactable id="monitor" label="Monitor — click to change the scene" focusable>
        <mesh position={[0, 0.02, 0.1]} castShadow material={standMaterial}>
          <cylinderGeometry args={[0.17, 0.2, 0.04, 24]} />
        </mesh>
        <mesh position={[0, 0.22, 0.02]} castShadow material={standMaterial}>
          <boxGeometry args={[0.07, 0.4, 0.05]} />
        </mesh>

        <group position={[0, 0.78, 0.02]} rotation={[-0.04, 0, 0]}>
          <RoundedBox args={[1.82, 1.08, 0.06]} radius={0.02} smoothness={2} castShadow material={standMaterial} />
          <mesh position={[0, 0, 0.033]}>
            <planeGeometry args={[1.72, 0.98]} />
            <meshStandardMaterial
              ref={material}
              color="#000000"
              emissive="#ffffff"
              emissiveMap={texture}
              emissiveIntensity={1}
              roughness={0.9}
              metalness={0}
            />
          </mesh>
        </group>
      </Interactable>
    </group>
  )
}
