import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useSettingsStore } from '@/stores/settingsStore'

const COUNT = 130

export function DustParticles() {
  const quality = useSettingsStore((s) => s.quality)
  const pointsRef = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = -4 + Math.random() * 8.4
      positions[i * 3 + 1] = 0.3 + Math.random() * 3.4
      positions[i * 3 + 2] = -4 + Math.random() * 8.4
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame((state) => {
    if (quality === 'performance') return
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute
    const t = state.clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      attr.setY(i, 0.3 + ((i * 0.618) % 3.4) + Math.sin(t * 0.25 + i * 1.7) * 0.18)
      attr.setX(i, -4 + ((i * 0.913) % 8.4) + Math.sin(t * 0.12 + i * 2.3) * 0.12)
    }
    attr.needsUpdate = true
    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(t * 0.02) * 0.01
    }
  })

  if (quality === 'performance') return null

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.022}
        color="#9fb2d8"
        transparent
        opacity={0.42}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
