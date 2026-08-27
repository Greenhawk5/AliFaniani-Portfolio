import { useMemo } from 'react'
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

function HeadphoneStand() {
  // Native bounds of the cleaned runtime copy (~5.9 x 8.3 x 5.7 with the height
  // being the largest span) mean size 0.38 restores the former stand's footprint:
  // ~0.27 round base and cradle top just under the old headset silhouette.
  // The Y rotation turns its USB port side (+X in model space) toward the front
  // of the desk while the column leans back toward the wall.
  return <WorkstationAsset file="/models/workstation/stand.glb" position={[-0.1, 1.03, -3.2]} size={0.3} rotation={[0, -0.5, 0]} />
}

function Headset() {
  // Vertex-accurate bounds of the cleaned runtime copy (~0.99 x 1.2 x 1.02 with
  // the height being the largest span) mean size 0.42 gives a realistic ~0.34 x
  // 0.36 footprint with the headband arc topping out at ~1.42. The model is
  // authored vertically centered (native min y -0.79), so y = 1.276 offsets the
  // scaled min y the same way the stand's 1.03 does, landing the cup bases at
  // the 1.001 desk-contact height. It rests upright in the free front-left
  // strip between the stand and the mouse pad, angled toward the camera like it
  // was set down after a call.
  return <WorkstationAsset file="/models/workstation/headset.glb" position={[-0.15, 1.03, -3.2]} size={0.8} rotation={[0, 1.1, 0]} />
}

function DeskAccessories() {
  return (
    <group>
      {/* Speaker replaces the former lamp footprint. Its transformed bounds
          are measured by WorkstationAsset before the base is placed at y=1.0. */}
      <WorkstationAsset file="/models/workstation/speaker.glb" position={[-0.15, 1, -3.7]} size={0.42} rotation={[0, 2.3, 0]} />
      <WorkstationAsset file="/models/workstation/mic.glb" position={[2.2, 1, -3.2]} size={0.3} rotation={[0, -.9, 0]} />


      {/* Jet collectible replaces only the workstation desk plant. The asset
          loader measures its transformed bounds and rests the base at y=1.0. */}
      <WorkstationAsset file="/models/workstation/jet_the_hawk.glb" position={[2.2, 1, -3.95]} size={0.36} rotation={[0, -0.55, 0]} />
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
      <HeadphoneStand />
      <Headset />
      <DeskAccessories />
    </group>
  )
}
