import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'

function Sofa() {
  const fabric = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1b2136', roughness: 0.9, metalness: 0 }),
    []
  )
  const cushion = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#222a44', roughness: 0.9, metalness: 0 }),
    []
  )
  const blanket = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#5b3fa8', roughness: 0.95 }),
    []
  )
  const leg = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0e1219', roughness: 0.4, metalness: 0.5 }),
    []
  )

  return (
    <group position={[3.15, 0, 1.75]} rotation={[0, -Math.PI / 2, 0]}>
      <RoundedBox args={[2.0, 0.4, 0.9]} radius={0.05} smoothness={3} position={[0, 0.3, 0]} castShadow receiveShadow material={fabric} />
      {[-0.48, 0.48].map((x) => (
        <RoundedBox key={x} args={[0.9, 0.18, 0.78]} radius={0.06} smoothness={3} position={[x, 0.56, 0.04]} castShadow material={cushion} />
      ))}
      <RoundedBox args={[2.0, 0.6, 0.22]} radius={0.07} smoothness={3} position={[0, 0.72, -0.36]} castShadow material={fabric} />
      {[-1.02, 1.02].map((x) => (
        <RoundedBox key={x} args={[0.24, 0.62, 0.9]} radius={0.07} smoothness={3} position={[x, 0.52, 0]} castShadow material={fabric} />
      ))}
      {[
        [-0.85, -0.35],
        [0.85, -0.35],
        [-0.85, 0.35],
        [0.85, 0.35],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.05, z]} castShadow material={leg}>
          <cylinderGeometry args={[0.025, 0.02, 0.1, 10]} />
        </mesh>
      ))}
      <RoundedBox args={[0.55, 0.08, 0.72]} radius={0.03} smoothness={2} position={[-0.45, 0.68, 0.02]} rotation={[0.05, 0.08, 0.12]} castShadow material={blanket} />
      <RoundedBox args={[0.4, 0.36, 0.14]} radius={0.06} smoothness={2} position={[0.55, 0.78, -0.22]} rotation={[0.1, 0.2, -0.08]} castShadow material={cushion} />
    </group>
  )
}

function CoffeeTable() {
  const wood = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#241c13', roughness: 0.5, metalness: 0.1 }),
    []
  )
  const leg = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0e1219', roughness: 0.4, metalness: 0.5 }),
    []
  )

  return (
    <group position={[1.0, 0, 1.75]}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow material={wood}>
        <cylinderGeometry args={[0.44, 0.44, 0.045, 28]} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const angle = (i / 3) * Math.PI * 2 + 0.5
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * 0.3, 0.2, Math.sin(angle) * 0.3]}
            rotation={[Math.sin(angle) * 0.18, 0, -Math.cos(angle) * 0.18]}
            castShadow
            material={leg}
          >
            <cylinderGeometry args={[0.018, 0.022, 0.42, 10]} />
          </mesh>
        )
      })}
      <RoundedBox args={[0.3, 0.035, 0.22]} radius={0.008} smoothness={2} position={[-0.08, 0.46, 0.05]} rotation={[0, 0.4, 0]} castShadow>
        <meshStandardMaterial color="#3a4a6b" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[0.26, 0.03, 0.19]} radius={0.008} smoothness={2} position={[-0.07, 0.49, 0.06]} rotation={[0, 0.25, 0]} castShadow>
        <meshStandardMaterial color="#6b3a4a" roughness={0.8} />
      </RoundedBox>
    </group>
  )
}

function Rug() {
  return (
    <group position={[1.0, 0.005, 1.75]}>
      <RoundedBox args={[3.1, 0.016, 2.2]} radius={0.006} smoothness={2} receiveShadow>
        <meshStandardMaterial color="#10141f" roughness={1} />
      </RoundedBox>
      <RoundedBox args={[2.9, 0.02, 2.0]} radius={0.006} smoothness={2} position={[0, 0.004, 0]} receiveShadow>
        <meshStandardMaterial color="#161c2c" roughness={1} />
      </RoundedBox>
    </group>
  )
}

function FloorLamp() {
  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#12161f', roughness: 0.4, metalness: 0.6 }),
    []
  )
  return (
    <group position={[3.95, 0, 0.85]}>
      <mesh position={[0, 0.02, 0]} castShadow material={metal}>
        <cylinderGeometry args={[0.14, 0.16, 0.04, 20]} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow material={metal}>
        <cylinderGeometry args={[0.018, 0.018, 1.55, 10]} />
      </mesh>
      <mesh position={[0, 1.66, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 0.26, 20, 1, true]} />
        <meshStandardMaterial color="#1a2030" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.05, 12, 10]} />
        <meshStandardMaterial color="#fff4dd" emissive="#ffc98a" emissiveIntensity={2.2} />
      </mesh>
    </group>
  )
}

export function Lounge() {
  return (
    <group>
      <Rug />
      <Sofa />
      <CoffeeTable />
      <FloorLamp />
    </group>
  )
}
