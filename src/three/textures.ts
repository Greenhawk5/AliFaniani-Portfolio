import * as THREE from 'three'

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return { canvas, ctx: canvas.getContext('2d')! }
}

export function createWoodTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 512)
  const rand = mulberry32(1337)
  const plankH = 64

  for (let row = 0; row < 512 / plankH; row++) {
    const base = 0x16
    const r = base + Math.floor(rand() * 14)
    const g = base - 4 + Math.floor(rand() * 10)
    const b = base + 4 + Math.floor(rand() * 10)
    ctx.fillStyle = `rgb(${r + 14}, ${g + 10}, ${b + 12})`
    ctx.fillRect(0, row * plankH, 512, plankH)

    ctx.strokeStyle = `rgba(0, 0, 0, ${0.12 + rand() * 0.1})`
    ctx.lineWidth = 1
    for (let i = 0; i < 14; i++) {
      const y = row * plankH + rand() * plankH
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(170, y + rand() * 6 - 3, 340, y + rand() * 6 - 3, 512, y)
      ctx.stroke()
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.fillRect(0, row * plankH, 512, 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
    ctx.fillRect(0, row * plankH + 2, 512, 1)

    const seam = Math.floor(rand() * 512)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(seam, row * plankH, 2, plankH)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function createPosterTexture(seed: number, accent: string, accent2: string): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(256, 340)
  const rand = mulberry32(seed)
  ctx.fillStyle = '#0d1120'
  ctx.fillRect(0, 0, 256, 340)

  for (let i = 0; i < 5; i++) {
    const grad = ctx.createRadialGradient(
      rand() * 256,
      rand() * 340,
      4,
      rand() * 256,
      rand() * 340,
      60 + rand() * 90
    )
    grad.addColorStop(0, i % 2 === 0 ? `${accent}55` : `${accent2}44`)
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 256, 340)
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  for (let i = 0; i < 12; i++) {
    ctx.beginPath()
    ctx.moveTo(rand() * 256, 0)
    ctx.lineTo(rand() * 256, 340)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(232, 236, 244, 0.85)'
  ctx.font = 'bold 20px Inter, sans-serif'
  ctx.fillText('SYS.' + (1 + Math.floor(rand() * 9)), 20, 310)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function createNeonTexture(text: string, color: string): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(1024, 256)
  ctx.clearRect(0, 0, 1024, 256)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 92px Inter, sans-serif'

  // Layered neon-tube rendering: the glow follows the letterforms via
  // multiple low-blur passes instead of one huge blur that floods the
  // canvas and reads as a rectangle after bloom.
  const passes: Array<[number, number, string]> = [
    // [shadowBlur, globalAlpha, fillStyle] — wide halo → tight glow → core
    [20, 0.26, color],
    [12, 0.45, color],
    [6, 0.9, color],
    [0, 1, '#f4fff9'], // white-hot tube core
  ]
  for (const [blur, alpha, fill] of passes) {
    ctx.shadowColor = color
    ctx.shadowBlur = blur
    ctx.globalAlpha = alpha
    ctx.fillStyle = fill
    ctx.fillText(text, 512, 128)
  }
  // Second core pass for a denser tube center.
  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, 512, 128)
  ctx.globalAlpha = 1

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
