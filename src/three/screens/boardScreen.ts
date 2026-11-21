export interface BoardSlide {
  title: string
  tagline: string
  tags: string[]
  accent: string
  accent2: string
  initial: string
}

const W = 1024
const H = 620
const TRANSITION_DURATION = 0.35 // Crisp 350ms slide transition

export interface BoardRenderer {
  canvas: HTMLCanvasElement
  update(nowSeconds: number): boolean
  advance(nowSeconds?: number): void
  back(nowSeconds?: number): void
  getActiveIndex(): number
  forceRender(): void
}

export function createBoardRenderer(slides: BoardSlide[]): BoardRenderer {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const snapshot = document.createElement('canvas')
  snapshot.width = W
  snapshot.height = H
  const sctx = snapshot.getContext('2d')!

  // Static background buffer — pre-rendered once, eliminating 52 per-frame canvas stroke operations
  const bgCanvas = document.createElement('canvas')
  bgCanvas.width = W
  bgCanvas.height = H
  const bgCtx = bgCanvas.getContext('2d')!

  const grad = bgCtx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, '#0d1120')
  grad.addColorStop(1, '#090c16')
  bgCtx.fillStyle = grad
  bgCtx.fillRect(0, 0, W, H)

  bgCtx.strokeStyle = 'rgba(255,255,255,0.05)'
  bgCtx.lineWidth = 1
  for (let x = 0; x < W; x += 32) {
    bgCtx.beginPath()
    bgCtx.moveTo(x, 0)
    bgCtx.lineTo(x, H)
    bgCtx.stroke()
  }
  for (let y = 0; y < H; y += 32) {
    bgCtx.beginPath()
    bgCtx.moveTo(0, y)
    bgCtx.lineTo(W, y)
    bgCtx.stroke()
  }

  let activeIndex = 0
  let transitionStart = -1
  let isDirty = true

  function drawInitialPanel(slide: BoardSlide) {
    ctx.font = 'bold 124px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const cx = 600 + 376 / 2
    const cy = 300 + 258 / 2
    ctx.shadowColor = `${slide.accent}55`
    ctx.shadowBlur = 22
    ctx.fillStyle = slide.accent
    ctx.fillText(slide.initial, cx, cy)
    ctx.shadowBlur = 0
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
  }

  function drawSlide(slide: BoardSlide) {
    if (!slide) return

    // Blit pre-rendered background
    ctx.drawImage(bgCanvas, 0, 0)

    // Soft color glows
    const glow = ctx.createRadialGradient(120, 90, 10, 120, 90, 420)
    glow.addColorStop(0, `${slide.accent}30`)
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    const glow2 = ctx.createRadialGradient(W - 100, H - 60, 10, W - 100, H - 60, 380)
    glow2.addColorStop(0, `${slide.accent2}26`)
    glow2.addColorStop(1, 'transparent')
    ctx.fillStyle = glow2
    ctx.fillRect(0, 0, W, H)

    // Top accent bar
    ctx.fillStyle = slide.accent
    ctx.fillRect(48, 64, 56, 5)

    // Title
    ctx.fillStyle = '#e8ecf4'
    ctx.font = 'bold 58px Inter, sans-serif'
    ctx.fillText(slide.title, 48, 160)

    // Initial neon badge
    drawInitialPanel(slide)

    // Subtitle
    ctx.fillStyle = '#9aa4b8'
    ctx.font = '28px Inter, sans-serif'
    ctx.fillText(slide.tagline, 48, 210)

    // Technology pills
    let x = 48
    ctx.font = '19px "JetBrains Mono", monospace'
    for (const tag of slide.tags.slice(0, 5)) {
      const w = ctx.measureText(tag).width + 28
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.beginPath()
      ctx.roundRect(x, 260, w, 38, 10)
      ctx.fill()
      ctx.strokeStyle = `${slide.accent}44`
      ctx.stroke()
      ctx.fillStyle = '#c9d1d9'
      ctx.fillText(tag, x + 14, 285)
      x += w + 12
    }

    // Call to action
    ctx.fillStyle = slide.accent
    ctx.font = 'bold 26px Inter, sans-serif'
    ctx.fillText('VIEW PROJECT  →', 48, H - 60)

    // Indicators
    for (let i = 0; i < slides.length; i++) {
      ctx.beginPath()
      ctx.arc(W - 48 - (slides.length - 1 - i) * 26, 48, 5, 0, Math.PI * 2)
      ctx.fillStyle = i === activeIndex ? slide.accent : 'rgba(255,255,255,0.18)'
      ctx.fill()
    }

    // Frame border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, W - 20, H - 20)
  }

  // Initial draw
  if (slides.length > 0) {
    drawSlide(slides[0])
  }

  return {
    canvas,
    getActiveIndex: () => activeIndex,
    forceRender() {
      if (slides.length > 0) {
        drawSlide(slides[activeIndex])
        isDirty = true
      }
    },
    advance(nowSeconds = performance.now() / 1000) {
      if (slides.length <= 1) return
      sctx.clearRect(0, 0, W, H)
      sctx.drawImage(canvas, 0, 0)
      activeIndex = (activeIndex + 1) % slides.length
      transitionStart = nowSeconds
      isDirty = true
    },
    back(nowSeconds = performance.now() / 1000) {
      if (slides.length <= 1) return
      sctx.clearRect(0, 0, W, H)
      sctx.drawImage(canvas, 0, 0)
      activeIndex = (activeIndex - 1 + slides.length) % slides.length
      transitionStart = nowSeconds
      isDirty = true
    },
    update(nowSeconds: number): boolean {
      // 1. If currently transitioning between slides
      if (transitionStart >= 0) {
        const elapsed = nowSeconds - transitionStart
        const t = Math.min(1, Math.max(0, elapsed / TRANSITION_DURATION))
        const eased = t * t * (3 - 2 * t)

        drawSlide(slides[activeIndex])

        if (t < 1) {
          ctx.globalAlpha = 1 - eased
          ctx.drawImage(snapshot, 0, 0)
          ctx.globalAlpha = 1
          return true
        } else {
          // Transition complete: final state drawn
          ctx.globalAlpha = 1
          transitionStart = -1
          isDirty = false
          return true
        }
      }

      // 2. If a static redraw was flagged
      if (isDirty) {
        isDirty = false
        return true
      }

      // 3. Resting idle state: NO redraw, NO texture upload
      return false
    },
  }
}
