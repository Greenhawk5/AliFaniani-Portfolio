import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { useUiStore } from '@/stores/uiStore'
import { env } from '@/three/env'
import { Interactable } from './Interactable'

export function PC() {
  const toggleRgb = useUiStore((s) => s.toggleRgb)
  const fansRef = useRef<THREE.Group>(null)
  const fanMaterials = useRef<THREE.MeshStandardMaterial[]>([])
  const ledRef = useRef<THREE.MeshStandardMaterial>(null)

  const caseMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#10141f', roughness: 0.35, metalness: 0.65 }),
    []
  )

  useFrame((_, dt) => {
    const { rgbEnabled } = useUiStore.getState()
    if (fansRef.current) {
      const speed = rgbEnabled ? 4 : 0.6
      fansRef.current.children.forEach((child, i) => {
        child.rotation.z += dt * speed * (1 + i * 0.2)
      })
    }
    fanMaterials.current.forEach((m, i) => {
      if (!m) return
      const hue = (env.time * 0.06 + i * 0.33) % 1
      m.emissive.setHSL(hue, 0.85, 0.55)
      m.emissiveIntensity = rgbEnabled ? 1.2 + env.rgb * 0.9 : 0.05
    })
    if (ledRef.current) {
      ledRef.current.emissiveIntensity = rgbEnabled ? 1.6 : 0.15
    }
  })

  return (
    <group position={[3.35, 0, -3.62]}>
      <Interactable id="pc" label="PC — click to toggle RGB" onActivate={toggleRgb}>
        <RoundedBox args={[0.55, 1.18, 1.1]} radius={0.03} smoothness={3} position={[0, 0.59, 0]} castShadow receiveShadow material={caseMaterial} />

        <mesh position={[0, 0.62, 0.556]}>
          <planeGeometry args={[0.44, 1.02]} />
          <meshStandardMaterial
            color="#0a0d14"
            roughness={0.05}
            metalness={0.9}
            transparent
            opacity={0.32}
          />
        </mesh>

        <group position={[-0.05, 0.62, 0.5]}>
          <group ref={fansRef}>
            {[0.24, -0.08, -0.4].map((y, i) => (
              <group key={i} position={[0, y, 0]}>
                <mesh>
                  <torusGeometry args={[0.085, 0.014, 8, 20]} />
                  <meshStandardMaterial
                    ref={(m) => {
                      if (m) fanMaterials.current[i] = m
                    }}
                    color="#0a0d14"
                    emissive="#39ff8b"
                    emissiveIntensity={1.4}
                  />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <boxGeometry args={[0.028, 0.15, 0.012]} />
                  <meshStandardMaterial color="#1a2030" roughness={0.5} />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.028, 0.15, 0.012]} />
                  <meshStandardMaterial color="#1a2030" roughness={0.5} />
                </mesh>
              </group>
            ))}
          </group>
        </group>

        <mesh position={[0.02, 0.72, 0.42]} rotation={[0, 0.06, 0]} castShadow>
          <boxGeometry args={[0.34, 0.05, 0.6]} />
          <meshStandardMaterial color="#151a28" roughness={0.4} metalness={0.6} />
        </mesh>

        <mesh position={[0, 0.59, -0.5]} castShadow>
          <boxGeometry args={[0.36, 0.5, 0.02]} />
          <meshStandardMaterial color="#131826" roughness={0.5} metalness={0.5} />
        </mesh>

        <mesh position={[0.24, 0.59, 0.556]}>
          <planeGeometry args={[0.03, 1.0]} />
          <meshStandardMaterial ref={ledRef} color="#0a0d14" emissive="#39ff8b" emissiveIntensity={1.5} />
        </mesh>

        <mesh position={[0.2, 1.05, 0.558]}>
          <circleGeometry args={[0.012, 10]} />
          <meshStandardMaterial color="#0a0d14" emissive="#37d5ff" emissiveIntensity={2} />
        </mesh>
      </Interactable>
    </group>
  )
}
