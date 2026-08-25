import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { createNeonTexture } from '@/three/textures'
import { useUiStore } from '@/stores/uiStore'
import { Interactable } from './Interactable'

export function NeonSign() {
  const signOn = useUiStore((s) => s.signOn)
  const toggleSign = useUiStore((s) => s.toggleSign)
  const texture = useMemo(() => createNeonTexture('BUILD · SHIP · ITERATE', '#39ff8b'), [])
  const material = useRef<THREE.MeshBasicMaterial>(null)
  const spillRef = useRef<THREE.PointLight>(null)
  const nextFlicker = useRef(2)
  const flickerUntil = useRef(0)
  const intensity = useRef(1)

  useFrame((state) => {
    const mat = material.current
    if (!mat) return
    const t = state.clock.elapsedTime

    // Occasional brief flicker bursts, like a real neon tube.
    if (t > nextFlicker.current) {
      nextFlicker.current = t + 3 + Math.random() * 6
      flickerUntil.current = t + 0.12 + Math.random() * 0.25
    }
    let target = signOn ? 1 : 0.05
    if (signOn && t < flickerUntil.current) {
      // Rapid dips during a flicker burst.
      target *= 0.55 + Math.random() * 0.4
    } else if (signOn) {
      // Subtle continuous intensity variation (tube hum).
      target *= 0.96 + Math.sin(t * 8.3) * 0.02 + Math.sin(t * 23.7) * 0.02
    }
    intensity.current += (target - intensity.current) * (1 - Math.exp(-(1 / 60) * 14))
    mat.opacity = intensity.current

    // Soft green light spill onto the nearby wall, following the sign.
    if (spillRef.current) {
      spillRef.current.intensity = intensity.current * (signOn ? 0.35 : 0.02)
    }
  })

  return (
    <group position={[-4.42, 3.35, -1.5]} rotation={[0, Math.PI / 2, 0]}>
      <Interactable id="neon" label="Neon Sign — click to toggle" onActivate={toggleSign}>
        <mesh>
          <planeGeometry args={[2.4, 0.6]} />
          <meshBasicMaterial
            ref={material}
            map={texture}
            transparent
            opacity={1}
            toneMapped={false}
            depthWrite={false}
            alphaTest={0.01}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Interactable>
      {/* Light bounce: soft green spill on the wall around the tubes */}
      <pointLight
        ref={spillRef}
        position={[0.15, 0, 0.25]}
        color="#39ff8b"
        distance={2.2}
        decay={2}
        intensity={0.35}
      />
    </group>
  )
}
