import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useUiStore } from '@/stores/uiStore'
import { env } from '@/three/env'

const STRIP_GEO = new THREE.BoxGeometry(1, 1, 1)

function Strip({
  position,
  scale,
  rotation,
  offset,
}: {
  position: [number, number, number]
  scale: [number, number, number]
  rotation?: [number, number, number]
  offset: number
}) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#0a0d14',
        emissive: '#39ff8b',
        emissiveIntensity: 1.5,
        roughness: 0.4,
      }),
    []
  )
  const ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    const rgbOn = useUiStore.getState().rgbEnabled
    const hue = (env.time * 0.035 + offset) % 1
    material.emissive.setHSL(hue, 0.85, 0.55)
    material.emissiveIntensity = rgbOn ? 0.4 + env.rgb * 1.6 : 0.03
    if (ref.current) ref.current.visible = true
  })

  return (
    <mesh
      ref={ref}
      geometry={STRIP_GEO}
      position={position}
      scale={scale}
      rotation={rotation}
      material={material}
    />
  )
}

function GlowLight({
  position,
  offset,
  base,
  distance,
}: {
  position: [number, number, number]
  offset: number
  base: number
  distance: number
}) {
  const ref = useRef<THREE.PointLight>(null)

  useFrame(() => {
    const rgbOn = useUiStore.getState().rgbEnabled
    const light = ref.current
    if (!light) return
    const hue = (env.time * 0.035 + offset) % 1
    light.color.setHSL(hue, 0.8, 0.55)
    light.intensity = rgbOn ? base * env.rgb : 0
  })

  return <pointLight ref={ref} position={position} distance={distance} decay={2} />
}

export function RGBStrips() {
  return (
    <group>
      <Strip position={[0, 4.36, -4.42]} scale={[8.8, 0.045, 0.045]} offset={0} />
      <Strip position={[-4.42, 4.36, 0]} scale={[0.045, 0.045, 8.8]} offset={0.15} />
      <Strip position={[1.2, 0.9, -3.04]} scale={[3.2, 0.04, 0.04]} offset={0.3} />

      <GlowLight position={[-3.4, 3.7, -3.4]} offset={0} base={7} distance={9} />
      <GlowLight position={[1.3, 3.4, -3.6]} offset={0.33} base={5} distance={8} />
      <GlowLight position={[3.1, 1.4, -3.2]} offset={0.66} base={4.5} distance={7} />
      <GlowLight position={[-4.1, 2.4, 1.8]} offset={0.5} base={4} distance={7} />
    </group>
  )
}
