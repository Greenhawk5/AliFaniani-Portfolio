export interface BoardSlide {
  title: string
  tagline: string
  banner: string
  tags: string[]
  accent: string
  accent2: string
  initial: string
}

const W = 1024
const H = 620

export interface BoardRenderer {
  canvas: HTMLCanvasElement
  update(elapsed: number): boolean
  advance(): void
  back(): void
  getActiveIndex(): number
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

  let activeIndex = 0
  let transitionStart = -1
  let lastDrawn = -1
  const bannerImages = slides.map((slide) => {
    const image = new Image()
    image.onload = () => {
      lastDrawn = -1
    }
    image.src = slide.banner
    return image
  })

  function drawSlide(slide: BoardSlide) {
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#0d1120')
    grad.addColorStop(1, '#090c16')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

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

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 32) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = 0; y < H; y += 32) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }

    ctx.fillStyle = slide.accent
    ctx.fillRect(48, 64, 56, 5)

    ctx.fillStyle = '#e8ecf4'
    ctx.font = 'bold 58px Inter, sans-serif'
    ctx.fillText(slide.title, 48, 160)

    const banner = bannerImages[activeIndex]
    if (banner?.complete && banner.naturalWidth > 0) {
      const panelX = 600
      const panelY = 320
      const panelW = 376
      const panelH = 238
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.roundRect(panelX - 8, panelY - 8, panelW + 16, panelH + 16, 14)
      ctx.fill()
      const scale = Math.max(panelW / banner.naturalWidth, panelH / banner.naturalHeight)
      const width = banner.naturalWidth * scale
      const height = banner.naturalHeight * scale
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(panelX, panelY, panelW, panelH, 10)
      ctx.clip()
      ctx.drawImage(banner, panelX + (panelW - width) / 2, panelY + (panelH - height) / 2, width, height)
      ctx.restore()
      ctx.strokeStyle = `${slide.accent}88`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(panelX, panelY, panelW, panelH, 10)
      ctx.stroke()
    }

    ctx.fillStyle = '#9aa4b8'
    ctx.font = '28px Inter, sans-serif'
    ctx.fillText(slide.tagline, 48, 210)

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

    ctx.fillStyle = slide.accent
    ctx.font = 'bold 26px Inter, sans-serif'
    ctx.fillText('VIEW PROJECT  →', 48, H - 60)

    for (let i = 0; i < slides.length; i++) {
      ctx.beginPath()
      ctx.arc(W - 48 - (slides.length - 1 - i) * 26, 48, 5, 0, Math.PI * 2)
      ctx.fillStyle = i === activeIndex ? slide.accent : 'rgba(255,255,255,0.18)'
      ctx.fill()
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, W - 20, H - 20)
  }

  drawSlide(slides[0])

  return {
    canvas,
    getActiveIndex: () => activeIndex,
    advance() {
      if (transitionStart >= 0) return
      sctx.clearRect(0, 0, W, H)
      sctx.drawImage(canvas, 0, 0)
      activeIndex = (activeIndex + 1) % slides.length
      transitionStart = performance.now() / 1000
    },
    back() {
      if (transitionStart >= 0) return
      sctx.clearRect(0, 0, W, H)
      sctx.drawImage(canvas, 0, 0)
      activeIndex = (activeIndex - 1 + slides.length) % slides.length
      transitionStart = performance.now() / 1000
    },
    update(elapsed: number) {
      if (transitionStart < 0) {
        if (lastDrawn < 0) {
          lastDrawn = elapsed
          return true
        }
        return false
      }

      const t = Math.min(1, (elapsed - transitionStart) / 0.7)
      const eased = t * t * (3 - 2 * t)
      drawSlide(slides[activeIndex])
      ctx.globalAlpha = 1 - eased
      ctx.drawImage(snapshot, 0, 0)
      ctx.globalAlpha = 1

      if (t >= 1) transitionStart = -1
      return true
    },
  }
}
