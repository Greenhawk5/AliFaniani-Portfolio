import { useMemo} from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { WorkstationAsset } from './WorkstationAsset'

function Keyboard() {
  // Native bounds are approximately 0.45 x 0.04 x 0.14, indicating a
  // conventional Y-up keyboard: x is width, y is thickness, z is depth.
  // Normalize its width to the former 1.0-unit keyboard footprint.
  return <WorkstationAsset file="/models/workstation/keyboard.glb" position={[5.25, -2.83, -0.3]} size={1} rotation={[0, 0.06, 0]} />
}

function MouseAndPad() {
  // mouse.glb contains both the mouse and its integrated pad. Its native
  // bounds are approximately 2.82 x 0.36 x 2.36, so size 0.52 keeps the
  // complete pad comparable to the keyboard rather than scaling only the mouse.
  return <WorkstationAsset file="/models/workstation/mouse.glb" position={[1.82, 1.0009, -3.26]} size={0.52} rotation={[0, 0.06, 0]} />
}

function Headphones() {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#161c2a', roughness: 0.4, metalness: 0.5 }),
    []
  )
  return (
    <group position={[2.62, 1.005, -3.72]}>
      <mesh position={[0, 0.015, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.11, 0.13, 0.03, 20]} />
      </mesh>
      <mesh position={[0, 0.16, 0]} castShadow material={material}>
        <cylinderGeometry args={[0.015, 0.015, 0.28, 10]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} rotation={[Math.PI / 2, 0, 0]} material={material}>
        <torusGeometry args={[0.1, 0.018, 10, 24, Math.PI]} />
      </mesh>
      <mesh position={[-0.1, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={material}>
        <cylinderGeometry args={[0.062, 0.062, 0.045, 18]} />
      </mesh>
      <mesh position={[0.1, 0.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow material={material}>
        <cylinderGeometry args={[0.062, 0.062, 0.045, 18]} />
      </mesh>
    </group>
  )
}

function DeskAccessories() {
  return (
    <group>
      {/* Speaker replaces the former lamp footprint. Its transformed bounds
          are measured by WorkstationAsset before the base is placed at y=1.0. */}
      <WorkstationAsset file="/models/workstation/speaker.glb" position={[-0.15, 1, -3.7]} size={0.42} rotation={[0, 2.3, 0]} />
      <WorkstationAsset file="/models/workstation/mic.glb" position={[2.3, 1, -3.2]} size={0.3} rotation={[0, -.9, 0]} />


      {/* Jet collectible replaces only the workstation desk plant. The asset
          loader measures its transformed bounds and rests the base at y=1.0. */}
      <WorkstationAsset file="/models/workstation/jet_the_hawk.glb" position={[2.6, 1, -3.95]} size={0.36} rotation={[0, -0.55, 0]} />
    </group>
  )
}

export function Desk() {
  const wood = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#241c13', roughness: 0.55, metalness: 0.1 }),
    []
  )
  const legMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0e1219', roughness: 0.35, metalness: 0.7 }),
    []
  )

  return (
    <group>
      <RoundedBox args={[3.4, 0.09, 1.15]} radius={0.02} smoothness={2} position={[1.2, 0.955, -3.6]} castShadow receiveShadow material={wood} />
      {[
        [1.2 - 1.55, -3.6 - 0.45],
        [1.2 + 1.55, -3.6 - 0.45],
        [1.2 - 1.55, -3.6 + 0.45],
        [1.2 + 1.55, -3.6 + 0.45],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.455, z]} castShadow material={legMaterial}>
          <boxGeometry args={[0.07, 0.91, 0.07]} />
        </mesh>
      ))}
      <mesh position={[1.2, 0.5, -3.6]} castShadow material={legMaterial}>
        <boxGeometry args={[3.0, 0.05, 0.05]} />
      </mesh>
      <mesh position={[1.2, 0.82, -3.6]} material={legMaterial}>
        <boxGeometry args={[2.4, 0.14, 0.3]} />
      </mesh>

      <Keyboard />
      <MouseAndPad />
      <Headphones />
      <DeskAccessories />
    </group>
  )
}
