import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { socialLinks } from '@/data/links'
import { env } from '@/three/env'
import { useUiStore } from '@/stores/uiStore'
import { Interactable } from './Interactable'

const W = 640
const H = 860
const SLIDE_DURATION = 5

/**
 * Same 24x24 vector icon paths as the footer social icons
 * (src/components/ui/icons.tsx), drawn on the board canvas via Path2D.
 */
const ICON_PATHS: Record<string, string[]> = {
  GitHub: [
    'M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.26 5.66.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z',
  ],
  LinkedIn: [
    'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45Z',
  ],
  Telegram: [
    'M11.94 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.96 6.03-1.79 8.49c-.13.6-.49.74-.99.46l-2.72-2.02-1.31 1.27c-.15.15-.27.27-.55.27l.19-2.77 5.05-4.57c.22-.19-.05-.3-.34-.11l-6.24 3.94-2.69-.84c-.58-.19-.6-.58.12-.86l10.5-4.05c.49-.18.91.11.77.79Z',
  ],
  'Hugging Face': [
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c2.4 0 4.6-.84 6.32-2.24-.1-.34-.15-.7-.15-1.06 0-1.65 1.35-3 3-3 .35 0 .69.06 1 .17C22.7 14.7 22 13.38 22 12c0-5.52-4.48-10-10-10Z',
  ],
  Email: ['M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'M1.5 7 12 14.5 22.5 7'],
}

function drawSocialIcon(
  ctx: CanvasRenderingContext2D,
  label: string,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  const paths = ICON_PATHS[label] ?? ICON_PATHS.Email
  const scale = size / 24
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(scale, scale)
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const d of paths) {
    const path = new Path2D(d)
    ctx.fill(path)
    ctx.stroke(path)
  }
  ctx.restore()
}

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

  drawSocialIcon(
    ctx,
    link.label,
    W / 2,
    350,
    150,
    `rgb(${Math.round(accentColor.r * 255)}, ${Math.round(accentColor.g * 255)}, ${Math.round(accentColor.b * 255)})`
  )

  for (let i = 0; i < socialLinks.length; i++) {
    ctx.beginPath()
    ctx.arc(W - 48 - (socialLinks.length - 1 - i) * 28, H - 48, 6, 0, Math.PI * 2)
    ctx.fillStyle = i === index ? '#39ff8b' : 'rgba(255,255,255,0.2)'
    ctx.fill()
  }
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
  const glowRef = useRef<THREE.PointLight>(null)
  const focus = useUiStore((s) => s.focus)
  const boardNav = useUiStore((s) => s.boardNav)
  const lastNavNonce = useRef(0)

  const goTo = (index: number) => {
    active.current = (index + socialLinks.length) % socialLinks.length
    timer.current = 0
    drawSocialSlide(canvas, active.current)
    texture.needsUpdate = true
  }

  // Overlay slide controls (focus bar arrows) drive the board slideshow.
  useEffect(() => {
    if (!boardNav || boardNav.target !== 'socialBoard' || boardNav.nonce === lastNavNonce.current)
      return
    lastNavNonce.current = boardNav.nonce
    goTo(active.current + boardNav.dir)
  }, [boardNav, canvas, texture])

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
    if (glowRef.current) {
      // Glow belongs to the board: always match the neon frame emissive color.
      glowRef.current.color.copy(frameMaterial.emissive)
      glowRef.current.intensity = 4 * env.rgb
    }
  })

  const open = (index: number) => {
    // In room view the click focuses the board; only when focused does a
    // slide click open the social link in a new tab.
    if (focus !== 'socialBoard') return
    window.open(socialLinks[index].href, '_blank', 'noopener,noreferrer')
  }

  return (
    <group position={[-4.44, 2.75, 2.6]} rotation={[0, Math.PI / 2, 0]}>
      <Interactable id="socialBoard" label="Social Board — click to focus" focusable>
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
        <pointLight ref={glowRef} position={[0, 0, 0.6]} distance={7} decay={2} intensity={0} />
        <mesh
          position={[0, 0, 0.07]}
          onClick={(event) => {
            // Room view: let the click bubble to Interactable so it focuses
            // the board. Focused: consume the click and open the link.
            if (focus !== 'socialBoard') return
            event.stopPropagation()
            open(active.current)
          }}
          visible={false}
        >
          <planeGeometry args={[0.64, 0.86]} />
        </mesh>
      </Interactable>
    </group>
  )
}
