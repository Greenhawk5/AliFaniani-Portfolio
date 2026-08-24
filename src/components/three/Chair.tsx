import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

export function Chair() {
  const fabric = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#141a28', roughness: 0.85, metalness: 0.05 }),
    []
  )
  const plastic = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0e1219', roughness: 0.4, metalness: 0.5 }),
    []
  )
  const accent = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1d5c3c', roughness: 0.6 }),
    []
  )

  return (
    <group position={[1.2, 0, -2.42]} rotation={[0, Math.PI, 0]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2
        const x = Math.cos(angle) * 0.22
        const z = Math.sin(angle) * 0.22
        return (
          <group key={i} rotation={[0, -angle, 0]}>
            <mesh position={[x * 0.7, 0.06, z * 0.7]} castShadow material={plastic}>
              <boxGeometry args={[0.3, 0.03, 0.07]} />
            </mesh>
            <mesh position={[x, 0.035, z]} castShadow material={plastic}>
              <sphereGeometry args={[0.035, 10, 8]} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, 0.28, 0]} castShadow material={plastic}>
        <cylinderGeometry args={[0.03, 0.04, 0.3, 12]} />
      </mesh>
      <mesh position={[0, 0.44, 0]} castShadow material={plastic}>
        <boxGeometry args={[0.12, 0.04, 0.12]} />
      </mesh>

      <RoundedBox args={[0.62, 0.12, 0.6]} radius={0.04} smoothness={3} position={[0, 0.55, 0]} castShadow receiveShadow material={fabric} />
      <RoundedBox args={[0.58, 0.88, 0.1]} radius={0.05} smoothness={3} position={[0, 1.05, -0.3]} rotation={[-0.14, 0, 0]} castShadow material={fabric} />
      <RoundedBox args={[0.58, 0.05, 0.02]} radius={0.01} smoothness={2} position={[0, 1.44, -0.36]} rotation={[-0.14, 0, 0]} material={accent} />
      <mesh position={[0, 1.52, -0.38]} rotation={[-0.14, 0, 0]} castShadow material={fabric}>
        <boxGeometry args={[0.4, 0.14, 0.08]} />
      </mesh>

      {[-0.34, 0.34].map((x) => (
        <group key={x} position={[x, 0, 0.02]}>
          <mesh position={[0, 0.68, 0]} castShadow material={plastic}>
            <boxGeometry args={[0.05, 0.24, 0.05]} />
          </mesh>
          <RoundedBox args={[0.09, 0.03, 0.3]} radius={0.012} smoothness={2} position={[0, 0.81, 0.05]} castShadow material={plastic} />
        </group>
      ))}
    </group>
  )
}
