import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createPosterTexture } from '@/three/textures'
import { env } from '@/three/env'
import { Interactable } from './Interactable'
import { useUiStore } from '@/stores/uiStore'
import { SocialBoard } from './SocialBoard'
import { ShelfCharacters } from './ShelfCharacters'

function Shelf() {
  const wood = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#241c13', roughness: 0.55, metalness: 0.1 }),
    []
  )
  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0e1219', roughness: 0.4, metalness: 0.6 }),
    []
  )

  const bookColors = ['#3a4a6b', '#6b3a4a', '#3a6b55', '#6b5a3a', '#4a3a6b', '#2d5a6b', '#6b4a3a']
  const bookHeights = [0.26, 0.3, 0.24, 0.29, 0.26, 0.31, 0.25]

  return (
    <Interactable id="shelf" label="Display Shelf — click to inspect the collectibles" focusable>
      <group position={[-4.4, 0, 0.8]}>
        {/* Invisible click target covering both shelf boards and contents */}
        <mesh position={[0.05, 1.9, 0]} visible={false}>
          <boxGeometry args={[0.55, 1.0, 1.8]} />
        </mesh>
        {[1.62, 2.14].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh castShadow receiveShadow material={wood}>
            <boxGeometry args={[0.36, 0.04, 1.7]} />
          </mesh>
          {[-0.5, 0.5].map((z) => (
            <mesh key={z} position={[0.1, -0.035, z]} material={metal}>
              <boxGeometry args={[0.16, 0.03, 0.03]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Lower-shelf books — group shifted to keep all books on the board
          (board spans z -0.85..0.85; previously overhung the -z end) */}
      <group position={[0.02, 1.64 + 0.02, -0.28]}>
        {bookColors.map((color, i) => {
          const z = -0.55 + i * 0.075
          return (
            <mesh key={color} position={[0, bookHeights[i] / 2, z]} rotation={[0, 0, i === 6 ? 0.12 : 0]} castShadow>
              <boxGeometry args={[0.2, bookHeights[i], 0.055]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
          )
        })}
      </group>

      <group position={[0.02, 2.16, -0.5]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.04, 0.08, 14]} />
          <meshStandardMaterial color="#8a4a3a" roughness={0.8} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos(i * 2.1) * 0.03, 0.09, Math.sin(i * 2.1) * 0.03]} castShadow>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color="#2d5a3d" roughness={1} />
          </mesh>
        ))}
      </group>

      {/* Gold trophy removed by design decision — intentionally empty space */}

      <group position={[0.02, 2.16, 0.68]}>
        {['#2d4a5a', '#5a3a2d'].map((color, i) => (
          <mesh key={color} position={[0, 0.02 + i * 0.045, 0]} rotation={[0, i * 0.3, 0]} castShadow>
            <boxGeometry args={[0.24, 0.04, 0.17]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        ))}
      </group>
      </group>
    </Interactable>
  )
}

function Posters() {
  const posterB = useMemo(() => createPosterTexture(21, '#a06bff', '#ff5470'), [])

  const frame = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0b0e16', roughness: 0.4, metalness: 0.5 }),
    []
  )

  return (
    <group>
      <group position={[3.9, 1.72, -4.44]}>
        <mesh castShadow material={frame}>
          <boxGeometry args={[0.64, 0.82, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.56, 0.74]} />
          <meshStandardMaterial map={posterB} roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

function Plant() {
  const sway = useRef<THREE.Group>(null)

  useFrame(() => {
    if (sway.current) {
      sway.current.rotation.z = Math.sin(env.time * 0.8) * 0.015
    }
  })

  return (
    <group position={[-3.65, 0, -3.6]}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.36, 18]} />
        <meshStandardMaterial color="#1f2534" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.5, 8]} />
        <meshStandardMaterial color="#3a2d1f" roughness={0.9} />
      </mesh>
      <group ref={sway} position={[0, 0.8, 0]}>
        {[
          [0, 0.15, 0, 0.32],
          [0.18, 0.05, 0.08, 0.24],
          [-0.16, 0.02, -0.06, 0.26],
          [0.05, -0.08, -0.18, 0.22],
          [-0.06, -0.05, 0.17, 0.2],
        ].map(([x, y, z, s], i) => (
          <mesh key={i} position={[x, y, z]} scale={[s * 0.7, s, s * 0.7]} castShadow>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={i % 2 ? '#2d5a3d' : '#3a6b4d'} roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function MugInteraction() {
  const cycleKeyboard = useUiStore((s) => s.cycleKeyboard)
  return (
    <Interactable id="mug" label="Coffee — essential developer fuel" onActivate={cycleKeyboard}>
      <mesh position={[0.68, 1.06, -3.36]} visible={false}>
        <cylinderGeometry args={[0.09, 0.09, 0.16, 8]} />
      </mesh>
    </Interactable>
  )
}

export function ShelfDecor() {
  return (
    <group>
      <Shelf />
      <Posters />
      <SocialBoard />
      <Plant />
      <MugInteraction />
      <ShelfCharacters />
    </group>
  )
}
