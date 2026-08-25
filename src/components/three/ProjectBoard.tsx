import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import { createBoardRenderer, type BoardSlide } from '@/three/screens/boardScreen'
import { featuredProjects, useProjectStore } from '@/stores/projectStore'
import { env } from '@/three/env'
import { Interactable } from './Interactable'

const SLIDE_DURATION = 7

export function ProjectBoard() {
  const navigate = useNavigate()
  const nextProject = useProjectStore((s) => s.next)
  const renderer = useMemo(() => {
    const slides: BoardSlide[] = featuredProjects().map((p) => ({
      title: p.title,
      tagline: p.subtitle,
      banner: p.banner,
      tags: p.technologies.slice(0, 5),
      accent: '#39ff8b',
      accent2: '#37d5ff',
      initial: p.title
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 3)
        .toUpperCase(),
    }))
    return createBoardRenderer(slides)
  }, [])
  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(renderer.canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }, [renderer])
  const slideTimer = useRef(0)
  const material = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((_, dt) => {
    slideTimer.current += dt
    if (slideTimer.current > SLIDE_DURATION) {
      slideTimer.current = 0
      renderer.advance()
      nextProject()
    }
    if (renderer.update(env.time)) {
      texture.needsUpdate = true
    }
    if (material.current) {
      material.current.emissiveIntensity = 0.75 + env.monitor * 0.55
    }
  })

  const openProject = () => {
    const project = featuredProjects()[renderer.getActiveIndex()]
    if (project) navigate(`/projects/${project.slug}`)
  }

  return (
    <group position={[-2.2, 2.38, -4.42]}>
      <Interactable id="board" label="Project Board — click to view project" focusable>
        <mesh castShadow>
          <boxGeometry args={[2.62, 1.74, 0.07]} />
          <meshStandardMaterial color="#0b0e16" roughness={0.35} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[2.44, 1.54]} />
          <meshStandardMaterial
            ref={material}
            color="#000000"
            emissive="#ffffff"
            emissiveMap={texture}
            emissiveIntensity={1}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
        <mesh position={[0, -0.93, 0.06]}>
          <boxGeometry args={[2.8, 0.06, 0.18]} />
          <meshStandardMaterial color="#0e1220" roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh
          position={[0, 0, 0.05]}
          onClick={(e) => {
            e.stopPropagation()
            openProject()
          }}
          visible={false}
        >
          <planeGeometry args={[2.44, 1.54]} />
        </mesh>
      </Interactable>
    </group>
  )
}
