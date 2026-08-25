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
  const nextFlicker = useRef(2)

  useFrame((state) => {
    const mat = material.current
    if (!mat) return
    const t = state.clock.elapsedTime
    if (t > nextFlicker.current) {
      nextFlicker.current = t + 2 + Math.random() * 5
      mat.opacity = 0.55
    }
    const target = signOn ? 1 : 0.05
    mat.opacity += (target - mat.opacity) * (1 - Math.exp(-(1 / 60) * 14))
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
    </group>
  )
}
