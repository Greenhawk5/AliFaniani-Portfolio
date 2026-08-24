import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createSkyMaterial } from '@/three/skyMaterial'
import { env } from '@/three/env'
import { Interactable } from './Interactable'

export function WindowEnv() {
  const skyMaterial = useMemo(() => createSkyMaterial(), [])
  const glowRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    const u = skyMaterial.uniforms
    u.uTime.value = env.time
    ;(u.uTop.value as THREE.Color).copy(env.skyTop)
    ;(u.uBottom.value as THREE.Color).copy(env.skyBottom)
    ;(u.uHorizon.value as THREE.Color).copy(env.skyHorizon)
    ;(u.uSunUV.value as THREE.Vector2).copy(env.sunUV)
    ;(u.uSunColor.value as THREE.Color).copy(env.sun)
    const sunUp = env.sunPosition.y > 0.2 ? 1 : 0
    u.uSunGlow.value = sunUp * (0.45 + env.sunIntensity * 0.32)
    ;(u.uMoonUV.value as THREE.Vector2).copy(env.moonUV)
    u.uMoonAlpha.value = Math.min(1, env.moonIntensity * 3.6)
    u.uStarAlpha.value = env.stars
    u.uCityAlpha.value = env.city
    u.uCloudAlpha.value = env.clouds
    if (glowRef.current) {
      glowRef.current.emissive.copy(env.windowGlowColor)
      glowRef.current.emissiveIntensity = 0.06 + env.windowGlow * 0.1
    }
  })

  const frameMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ color: '#0c101a', roughness: 0.5, metalness: 0.35 }),
    []
  )

  return (
    <group position={[1.4, 2.2, -4.48]}>
      <mesh material={skyMaterial}>
        <planeGeometry args={[2.36, 1.46]} />
      </mesh>

      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[2.36, 1.46]} />
        <meshStandardMaterial
          ref={glowRef}
          color="#0a0d16"
          transparent
          opacity={0.14}
          emissive="#ffffff"
          emissiveIntensity={0.1}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.76, 0.05]} material={frameMaterial}>
        <boxGeometry args={[2.56, 0.1, 0.14]} />
      </mesh>
      <mesh position={[0, -0.76, 0.05]} material={frameMaterial}>
        <boxGeometry args={[2.56, 0.1, 0.14]} />
      </mesh>
      <mesh position={[-1.23, 0, 0.05]} material={frameMaterial}>
        <boxGeometry args={[0.1, 1.62, 0.14]} />
      </mesh>
      <mesh position={[1.23, 0, 0.05]} material={frameMaterial}>
        <boxGeometry args={[0.1, 1.62, 0.14]} />
      </mesh>
      <mesh position={[0, 0, 0.05]} material={frameMaterial}>
        <boxGeometry args={[0.05, 1.46, 0.1]} />
      </mesh>
      <mesh position={[0, 0, 0.05]} material={frameMaterial}>
        <boxGeometry args={[2.36, 0.05, 0.1]} />
      </mesh>

      <mesh position={[0, -0.86, 0.14]} castShadow material={frameMaterial}>
        <boxGeometry args={[2.8, 0.07, 0.3]} />
      </mesh>

      <Interactable id="window" label="The view outside — it follows real time">
        <mesh position={[0, 0, 0.06]} visible={false}>
          <planeGeometry args={[2.4, 1.5]} />
        </mesh>
      </Interactable>
    </group>
  )
}
