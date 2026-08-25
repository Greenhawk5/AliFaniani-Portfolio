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

export function RGBStrips() {
  return (
    <group>
      <Strip position={[0, 4.36, -4.42]} scale={[8.8, 0.045, 0.045]} offset={0} />
      <Strip position={[-4.42, 4.36, 0]} scale={[0.045, 0.045, 8.8]} offset={0.15} />
      <Strip position={[1.2, 0.9, -3.04]} scale={[3.2, 0.04, 0.04]} offset={0.3} />
    </group>
  )
}
