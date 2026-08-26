import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { socialLinks } from '@/data/links'
import { SOCIAL_ICON_DEFS } from '@/components/ui/socialIconPaths'
import { env } from '@/three/env'
import { useUiStore } from '@/stores/uiStore'
import { Interactable } from './Interactable'

const W = 640
const H = 860
const SLIDE_DURATION = 5
const HF_SVG_URL = '/icons/hf-logo-monochrome.svg'

/**
 * Loads the official Hugging Face monochrome SVG and returns one tinted
 * image per slide accent color (the SVG's black fills are replaced via a
 * data-URL string swap, so the existing accent-color system applies without
 * deforming the geometry). Resolves with null if the asset can't load —
 * callers then fall back to the shared path geometry.
 */
async function loadHfSvgImages(colors: string[]): Promise<HTMLImageElement[] | null> {
  try {
    const response = await fetch(HF_SVG_URL)
    const svgText = await response.text()
    return await Promise.all(
      colors.map(
        (color) =>
          new Promise<HTMLImageElement | null>((resolve) => {
            const tinted = svgText.replace(/fill="black"/g, `fill="${color}"`)
            const image = new Image()
            image.onload = () => resolve(image)
            image.onerror = () => resolve(null)
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tinted)}`
          })
      )
    ).then((images) => (images.every(Boolean) ? (images as HTMLImageElement[]) : null))
  } catch {
    return null
  }
}

/**
 * Draws a social icon from the shared footer icon definitions
 * (src/components/ui/socialIconPaths.ts) onto a canvas via Path2D.
 * The icon is fitted proportionally inside a square bounding box of the
 * given size, centered on (cx, cy), preserving the original 24x24
 * viewBox aspect ratio (uniform scale — no independent X/Y stretch).
 */
function drawSocialIcon(
  ctx: CanvasRenderingContext2D,
  label: string,
  cx: number,
  cy: number,
  size: number,
  color: string
) {
  const def = SOCIAL_ICON_DEFS[label] ?? SOCIAL_ICON_DEFS.Email
  const scale = size / 24
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(scale, scale)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const d of def.fill) {
    ctx.fillStyle = color
    ctx.fill(new Path2D(d))
  }
  for (const d of def.stroke) {
    ctx.strokeStyle = color
    ctx.lineWidth = 1.8
    ctx.stroke(new Path2D(d))
  }
  ctx.restore()
}

/**
 * Draws the official Hugging Face SVG image fitted proportionally inside a
 * square bounding box of the given size, centered on (cx, cy).
 */
function drawHfSvgImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  cx: number,
  cy: number,
  size: number
) {
  const ratio = Math.min(size / image.width, size / image.height)
  const width = image.width * ratio
  const height = image.height * ratio
  ctx.drawImage(image, cx - width / 2, cy - height / 2, width, height)
}

function drawSocialSlide(
  canvas: HTMLCanvasElement,
  index: number,
  hfImage: HTMLImageElement | null
) {
  const ctx = canvas.getContext('2d')!
  const link = socialLinks[index]
  const hue = (index * 0.16 + 0.34) % 1
  const accentColor = new THREE.Color().setHSL(hue, 0.85, 0.6)
  const r = Math.round(accentColor.r * 255)
  const g = Math.round(accentColor.g * 255)
  const b = Math.round(accentColor.b * 255)
  const accentGlow = (a: number) => `rgba(${r}, ${g}, ${b}, ${a})`
  // Near-white core tinted with the accent hue — keeps the icon bright and
  // readable while staying inside the same color family as the frame.
  const iconCore = `rgb(${Math.round(r + (255 - r) * 0.78)}, ${Math.round(g + (255 - g) * 0.78)}, ${Math.round(b + (255 - b) * 0.78)})`

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#0b0f19'
  ctx.fillRect(0, 0, W, H)

  // Soft ambient glow concentrated around the icon/ring, fading naturally.
  const glow = ctx.createRadialGradient(W / 2, 350, 40, W / 2, 350, 300)
  glow.addColorStop(0, accentGlow(0.16))
  glow.addColorStop(0.55, accentGlow(0.06))
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Thin neon ring — same accent as the frame, medium brightness.
  ctx.beginPath()
  ctx.arc(W / 2, 350, 116, 0, Math.PI * 2)
  ctx.fillStyle = accentGlow(0.08)
  ctx.fill()
  ctx.strokeStyle = accentGlow(0.85)
  ctx.lineWidth = 3
  ctx.stroke()
  // Faint inner ring echo for depth.
  ctx.beginPath()
  ctx.arc(W / 2, 350, 104, 0, Math.PI * 2)
  ctx.strokeStyle = accentGlow(0.18)
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Icon glow pass (accent, subtle), then the bright core pass on top.
  // Hugging Face uses the official SVG asset rasterized onto the canvas;
  // other platforms keep the shared Path2D geometry.
  if (link.label === 'Hugging Face' && hfImage) {
    ctx.globalAlpha = 0.55
    drawHfSvgImage(ctx, hfImage, W / 2, 350, 132)
    ctx.globalAlpha = 1
    drawHfSvgImage(ctx, hfImage, W / 2, 350, 132)
  } else {
    drawSocialIcon(ctx, link.label, W / 2, 350, 132, accentGlow(0.55))
    drawSocialIcon(ctx, link.label, W / 2, 350, 132, iconCore)
  }

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
    drawSocialSlide(value, 0, null)
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
  // Official Hugging Face SVG, one tinted copy per slide accent color.
  // Until loaded (or on failure) the shared Path2D geometry is used.
  const hfImagesRef = useRef<HTMLImageElement[] | null>(null)
  useEffect(() => {
    let cancelled = false
    const colors = socialLinks.map((_, i) => {
      const hue = (i * 0.16 + 0.34) % 1
      const c = new THREE.Color().setHSL(hue, 0.85, 0.6)
      return `rgb(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)})`
    })
    loadHfSvgImages(colors).then((images) => {
      if (!cancelled && images) {
        hfImagesRef.current = images
        drawSocialSlide(canvas, active.current, images[active.current])
        texture.needsUpdate = true
      }
    })
    return () => {
      cancelled = true
    }
  }, [canvas, texture])
  const focus = useUiStore((s) => s.focus)
  const boardNav = useUiStore((s) => s.boardNav)
  const lastNavNonce = useRef(0)

  const goTo = (index: number) => {
    active.current = (index + socialLinks.length) % socialLinks.length
    timer.current = 0
    drawSocialSlide(canvas, active.current, hfImagesRef.current?.[active.current] ?? null)
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
      drawSocialSlide(canvas, active.current, hfImagesRef.current?.[active.current] ?? null)
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
