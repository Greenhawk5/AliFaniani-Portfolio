import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { socialLinks } from '@/data/links'
import { env } from '@/three/env'

const W = 640
const H = 860
const SLIDE_DURATION = 5

function drawSocialSlide(canvas: HTMLCanvasElement, index: number) {
  const ctx = canvas.getContext('2d')!
  const link = socialLinks[index]
  const hue = (index * 0.16 + 0.34) % 1
  const accentColor = new THREE.Color().setHSL(hue, 0.85, 0.6)
  const accent = `rgb(${Math.round(accentColor.r * 255)}, ${Math.round(accentColor.g * 255)}, ${Math.round(accentColor.b * 255)})`

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0b0f19'
  ctx.fillRect(0, 0, W, H)

  const glow = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 430)
  glow.addColorStop(0, `rgba(${Math.round(accentColor.r * 255)}, ${Math.round(accentColor.g * 255)}, ${Math.round(accentColor.b * 255)}, 0.2)`)
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  ctx.beginPath()
  ctx.arc(W / 2, 350, 116, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${Math.round(accentColor.r * 255)}, ${Math.round(accentColor.g * 255)}, ${Math.round(accentColor.b * 255)}, 0.13)`
  ctx.fill()
  ctx.strokeStyle = `rgba(${Math.round(accentColor.r * 255)}, ${Math.round(accentColor.g * 255)}, ${Math.round(accentColor.b * 255)}, 0.6)`
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.fillStyle = '#e8ecf4'
  ctx.font = 'bold 72px Inter, sans-serif'
  ctx.textAlign = 'center'
  const icon = link.label === 'GitHub'
    ? 'GH'
    : link.label === 'LinkedIn'
      ? 'in'
      : link.label === 'Telegram'
        ? '➤'
        : link.label === 'Hugging Face'
          ? 'HF'
          : '@'
  ctx.fillText(icon, W / 2, 375)

  for (let i = 0; i < socialLinks.length; i++) {
    ctx.beginPath()
    ctx.arc(W - 48 - (socialLinks.length - 1 - i) * 28, H - 48, 6, 0, Math.PI * 2)
    ctx.fillStyle = i === index ? '#39ff8b' : 'rgba(255,255,255,0.2)'
    ctx.fill()
  }
  ctx.textAlign = 'start'
}

export function SocialBoard() {
  const canvas = useMemo(() => {
    const value = document.createElement('canvas')
    value.width = W
    value.height = H
    drawSocialSlide(value, 0)
    return value
  }, [])
  const texture = useMemo(() => {
    const value = new THREE.CanvasTexture(canvas)
    value.colorSpace = THREE.SRGBColorSpace
    value.anisotropy = 4
    return value
  }, [canvas])
  const frameMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0a0d14', emissive: '#39ff8b' }),
    []
  )
  const active = useRef(0)
  const timer = useRef(0)

  useFrame((_, delta) => {
    timer.current += delta
    if (timer.current >= SLIDE_DURATION) {
      timer.current = 0
      active.current = (active.current + 1) % socialLinks.length
      drawSocialSlide(canvas, active.current)
      texture.needsUpdate = true
    }
    frameMaterial.emissive.setHSL((env.time * 0.035) % 1, 0.85, 0.55)
    frameMaterial.emissiveIntensity = 0.7 + env.rgb * 1.4
  })

  const open = (index: number) => {
    window.open(socialLinks[index].href, '_blank', 'noopener,noreferrer')
  }

  return (
    <group position={[-4.44, 2.75, 2.6]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.72, 0.94, 0.04]} />
        <meshStandardMaterial color="#0b0e16" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[0.64, 0.86]} />
        <meshStandardMaterial map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.35} />
      </mesh>
      <group position={[0, 0, 0.055]}>
        <mesh position={[0, 0.445, 0]} material={frameMaterial}>
          <boxGeometry args={[0.72, 0.025, 0.025]} />
        </mesh>
        {([0.445, -0.445] as const).map((y) => (
          <mesh key={y} position={[0, y, 0]} material={frameMaterial}>
            <boxGeometry args={[0.72, 0.025, 0.025]} />
          </mesh>
        ))}
        {([-0.3475, 0.3475] as const).map((x) => (
          <mesh key={x} position={[x, 0, 0]} material={frameMaterial}>
            <boxGeometry args={[0.025, 0.89, 0.025]} />
          </mesh>
        ))}
      </group>
      <mesh
        position={[0, 0, 0.07]}
        onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer' }}
        onPointerOut={(event) => { event.stopPropagation(); document.body.style.cursor = 'auto' }}
        onClick={(event) => { event.stopPropagation(); open(active.current) }}
        visible={false}
      >
        <planeGeometry args={[0.64, 0.86]} />
      </mesh>
    </group>
  )
}
