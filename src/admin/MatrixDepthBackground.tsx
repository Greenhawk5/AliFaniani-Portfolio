/**
 * Admin-login-only decorative background: Matrix glyphs flying toward the
 * viewer (starfield-style z-projection, not vertical rain). Center of the
 * viewport is suppressed so the sign-in card stays readable.
 *
 * Rendering lives entirely on the canvas — no React state per frame.
 * Reduced motion renders one static frame of dim glyphs.
 */

import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

const CHARSET = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789'.split('')

// Precomputed per-depth-tier colors (site accent #39ff8b, brightest tier is
// a softened near-white green for the closest glyphs) — no string building
// inside the frame loop.
const GLYPH_COLORS = [
  'rgba(57, 255, 139, 0.14)',
  'rgba(57, 255, 139, 0.22)',
  'rgba(57, 255, 139, 0.34)',
  'rgba(89, 255, 158, 0.50)',
  'rgba(140, 255, 190, 0.68)',
] as const

const MAX_DEPTH = 1600
const MIN_DEPTH = 90
const COUNT_DESKTOP = 110
const COUNT_SMALL = 55

interface Glyph {
  x: number
  y: number
  z: number
  speed: number
  char: string
  twinkleOffset: number
}

export function MatrixDepthBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let animationId = 0
    let tick = 0

    const pickChar = () => CHARSET[(Math.random() * CHARSET.length) | 0]

    const createGlyph = (initialZ?: number): Glyph => ({
      // Normalized spread: ±1.1 half-extents; perspective projection expands
      // this as the glyph approaches, so far glyphs already fill the field.
      x: (Math.random() - 0.5) * 2.2,
      y: (Math.random() - 0.5) * 2.2,
      z: initialZ ?? MIN_DEPTH + Math.random() * (MAX_DEPTH - MIN_DEPTH),
      speed: 1.2 + Math.random() * 2.0,
      char: pickChar(),
      twinkleOffset: Math.random() * Math.PI * 2,
    })

    const glyphs: Glyph[] = []
    const targetCount = () =>
      Math.min(window.innerWidth, window.innerHeight) < 640 ? COUNT_SMALL : COUNT_DESKTOP

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const want = targetCount()
      while (glyphs.length < want) glyphs.push(createGlyph())
      glyphs.length = want
    }

    const drawFrame = (advance: boolean) => {
      ctx.clearRect(0, 0, width, height)

      const cx = width / 2
      const cy = height / 2
      // Perspective focal length scaled to the viewport so the field reads
      // the same on phone and desktop.
      const focal = Math.min(width, height) * 0.55

      for (const g of glyphs) {
        if (advance) {
          g.z -= g.speed
          if (g.z <= MIN_DEPTH) {
            Object.assign(g, createGlyph(MAX_DEPTH))
          }
          // Occasional glyph mutation keeps the stream feeling alive
          if (Math.random() < 0.003) g.char = pickChar()
        }

        const scale = focal / g.z
        const size = Math.min(58, Math.max(7, scale * 24))
        const px = cx + g.x * scale * cx
        const py = cy + g.y * scale * cy
        if (px < -60 || px > width + 60 || py < -60 || py > height + 60) continue

        // Depth tiers: nearer = brighter (index into precomputed colors)
        const depthRatio = Math.min(1, Math.max(0, (g.z - MIN_DEPTH) / (MAX_DEPTH - MIN_DEPTH)))
        const tier = Math.min(GLYPH_COLORS.length - 1, ((1 - depthRatio) * GLYPH_COLORS.length) | 0)

        // Center suppression: elliptical, viewport-relative so the protected
        // zone adapts to the card on any screen size.
        const nx = (px - cx) / (width * 0.5)
        const ny = (py - cy) / (height * 0.5)
        const radial = Math.sqrt(nx * nx * 0.82 + ny * ny * 1.15)
        const centerFade = radial < 1 ? Math.min(1, Math.max(0, (radial - 0.4) / 0.6)) : 1
        const twinkle = 0.82 + 0.18 * Math.sin(tick * 0.03 + g.twinkleOffset)
        const alpha = centerFade * twinkle
        if (alpha < 0.04) continue

        ctx.font = `${size.toFixed(1)}px 'JetBrains Mono', monospace`
        ctx.fillStyle = GLYPH_COLORS[tier]
        ctx.globalAlpha = alpha
        ctx.fillText(g.char, px, py)
      }
      ctx.globalAlpha = 1
    }

    const animate = () => {
      tick++
      drawFrame(true)
      animationId = requestAnimationFrame(animate)
    }

    resize()
    if (reducedMotion) {
      // Calm static field: mid-depth dim glyphs, no motion, no mutation
      for (const g of glyphs) {
        g.z = MIN_DEPTH + (MAX_DEPTH - MIN_DEPTH) * (0.3 + Math.random() * 0.6)
      }
      drawFrame(false)
    } else {
      animationId = requestAnimationFrame(animate)
    }

    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [reducedMotion])

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* Center readability scrim: calms the area behind the card without
          hiding the field around it */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 42% 52% at 50% 50%, rgba(5,6,10,0.72) 0%, rgba(5,6,10,0.45) 55%, transparent 100%)',
        }}
      />
      {/* Edge vignette grounds the field like the room experience */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(5,6,10,0.55) 100%)',
        }}
      />
    </div>
  )
}
