import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { createKeyboardTexture } from '@/three/screens/keyboardTexture'
import { env } from '@/three/env'
import { Interactable } from './Interactable'
import { useUiStore } from '@/stores/uiStore'

function Keyboard() {
  const { texture, update } = useMemo(() => createKeyboardTexture(), [])
  const material = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    const { keyboardHue, rgbEnabled } = useUiStore.getState()
    if (update(keyboardHue, rgbEnabled ? 1 : 0.12)) texture.needsUpdate = true
    if (material.current) {
      material.current.emissiveIntensity = rgbEnabled ? 1.1 + env.rgb * 0.4 : 0.25
    }
  })

  return (
    <group position={[1.02, 1.03, -3.3]} rotation={[0, 0.06, 0]}>
      <RoundedBox args={[1.0, 0.05, 0.38]} radius={0.015} smoothness={2} castShadow>
        <meshStandardMaterial color="#0d1119" roughness={0.5} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0, 0.027, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.96, 0.34]} />
        <meshStandardMaterial
          ref={material}
          color="#000000"
          emissive="#ffffff"
          emissiveMap={texture}
          emissiveIntensity={1.1}
          roughness={0.4}
        />
      </mesh>
    </group>
  )
}

function MouseAndPad() {
  return (
    <group>
      <RoundedBox args={[0.52, 0.012, 0.44]} radius={0.005} smoothness={2} position={[1.82, 1.0, -3.26]}>
        <meshStandardMaterial color="#0d1119" roughness={0.6} metalness={0.2} />
      </RoundedBox>
      <mesh position={[1.82, 1.02, -3.24]} scale={[0.075, 0.042, 0.115]} castShadow>
        <sphereGeometry args={[1, 20, 16]} />
        <meshStandardMaterial color="#1a2030" roughness={0.35} metalness={0.4} />
      </mesh>
    </group>
  )
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

function DeskLamp() {
  const lampOn = useUiStore((s) => s.lampOn)
  const toggleLamp = useUiStore((s) => s.toggleLamp)
  const bulb = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((_, dt) => {
    if (bulb.current) {
      const target = lampOn ? 1.8 : 0.05
      bulb.current.emissiveIntensity += (target - bulb.current.emissiveIntensity) * (1 - Math.exp(-dt * 8))
    }
  })

  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#12161f', roughness: 0.4, metalness: 0.6 }),
    []
  )

  return (
    <group position={[0.02, 1.005, -3.86]} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.02, 0]} castShadow material={metal}>
        <cylinderGeometry args={[0.09, 0.11, 0.04, 20]} />
      </mesh>
      <mesh position={[0.03, 0.2, 0]} rotation={[0, 0, -0.25]} castShadow material={metal}>
        <boxGeometry args={[0.03, 0.36, 0.03]} />
      </mesh>
      <mesh position={[0.12, 0.37, 0]} rotation={[0, 0, 0.9]} castShadow material={metal}>
        <boxGeometry args={[0.03, 0.3, 0.03]} />
      </mesh>
      <mesh position={[0.24, 0.4, 0]} rotation={[0, 0, 1.35]} castShadow material={metal}>
        <coneGeometry args={[0.08, 0.14, 20, 1, true]} />
      </mesh>
      <mesh position={[0.24, 0.38, 0]}>
        <sphereGeometry args={[0.035, 12, 10]} />
        <meshStandardMaterial ref={bulb} color="#fff4dd" emissive="#ffd9a0" emissiveIntensity={1.8} />
      </mesh>
      <Interactable id="lamp" label="Desk Lamp — click to toggle" onActivate={toggleLamp}>
        <mesh position={[0.15, 0.3, 0]} visible={false}>
          <boxGeometry args={[0.5, 0.5, 0.4]} />
        </mesh>
      </Interactable>
    </group>
  )
}

function DeskAccessories() {
  return (
    <group>
      <group position={[0.42, 1.02, -3.52]} rotation={[0, 0.4, 0]}>
        <RoundedBox args={[0.26, 0.02, 0.34]} radius={0.006} smoothness={2} castShadow>
          <meshStandardMaterial color="#2a3149" roughness={0.7} />
        </RoundedBox>
        <RoundedBox args={[0.24, 0.008, 0.32]} radius={0.004} smoothness={2} position={[0, 0.014, 0]}>
          <meshStandardMaterial color="#dfe4ee" roughness={0.9} />
        </RoundedBox>
        <mesh position={[0.06, 0.03, -0.1]} rotation={[0, 0.5, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.007, 0.007, 0.16, 8]} />
          <meshStandardMaterial color="#39ff8b" roughness={0.4} emissive="#39ff8b" emissiveIntensity={0.25} />
        </mesh>
      </group>

      <group position={[0.68, 1.06, -3.36]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.04, 0.11, 18]} />
          <meshStandardMaterial color="#a06bff" roughness={0.35} />
        </mesh>
        <mesh position={[0.055, 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.032, 0.011, 10, 18]} />
          <meshStandardMaterial color="#a06bff" roughness={0.35} />
        </mesh>
      </group>

      <group position={[3.05, 1.02, -3.78]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.045, 0.035, 0.07, 14]} />
          <meshStandardMaterial color="#8a4a3a" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.075, 0]} castShadow>
          <sphereGeometry args={[0.055, 10, 8]} />
          <meshStandardMaterial color="#2d5a3d" roughness={1} />
        </mesh>
        <mesh position={[0.03, 0.1, 0.01]} castShadow>
          <sphereGeometry args={[0.04, 10, 8]} />
          <meshStandardMaterial color="#3a6b4d" roughness={1} />
        </mesh>
      </group>
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
      <DeskLamp />
      <DeskAccessories />
    </group>
  )
}
