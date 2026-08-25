import { useMemo } from 'react'
import * as THREE from 'three'
import { createWoodTexture } from '@/three/textures'

const WALL_COLOR = '#171c28'
const TRIM_COLOR = '#0e121c'

export function Room() {
  const woodTexture = useMemo(() => {
    const tex = createWoodTexture()
    tex.repeat.set(2.4, 2.4)
    return tex
  }, [])

  const floorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: woodTexture,
        color: '#8a7360',
        roughness: 0.75,
        metalness: 0.05,
      }),
    [woodTexture]
  )

  const wallMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: WALL_COLOR, roughness: 0.95, metalness: 0 }),
    []
  )

  const trimMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: TRIM_COLOR, roughness: 0.6, metalness: 0.2 }),
    []
  )

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow material={floorMaterial}>
        <planeGeometry args={[9.2, 9.2]} />
      </mesh>

      <mesh position={[-2.15, 2.25, -4.625]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[4.7, 4.5, 0.25]} />
      </mesh>
      <mesh position={[3.55, 2.25, -4.625]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[1.9, 4.5, 0.25]} />
      </mesh>
      <mesh position={[1.4, 3.725, -4.625]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[2.4, 1.55, 0.25]} />
      </mesh>
      <mesh position={[1.4, 0.725, -4.625]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[2.4, 1.45, 0.25]} />
      </mesh>

      <mesh position={[-4.625, 2.25, 0]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[0.25, 4.5, 9.2]} />
      </mesh>

      <mesh position={[4.625, 2.25, 0]} castShadow receiveShadow material={wallMaterial}>
        <boxGeometry args={[0.25, 4.5, 9.2]} />
      </mesh>

      <mesh position={[-2.15, 0.06, -4.47]} material={trimMaterial}>
        <boxGeometry args={[4.7, 0.12, 0.04]} />
      </mesh>
      <mesh position={[3.55, 0.06, -4.47]} material={trimMaterial}>
        <boxGeometry args={[1.9, 0.12, 0.04]} />
      </mesh>
      <mesh position={[-4.47, 0.06, 0]} rotation={[0, Math.PI / 2, 0]} material={trimMaterial}>
        <boxGeometry args={[9.2, 0.12, 0.04]} />
      </mesh>
      <mesh position={[0, 4.44, -4.47]} material={trimMaterial}>
        <boxGeometry args={[9.2, 0.12, 0.04]} />
      </mesh>
      <mesh position={[-4.47, 4.44, 0]} rotation={[0, Math.PI / 2, 0]} material={trimMaterial}>
        <boxGeometry args={[9.2, 0.12, 0.04]} />
      </mesh>
    </group>
  )
}
