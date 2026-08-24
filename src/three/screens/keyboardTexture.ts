import * as THREE from 'three'

const W = 512
const H = 170

export function createKeyboardTexture(): {
  texture: THREE.CanvasTexture
  update(hue: number, intensity: number): boolean
} {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  let lastHue = -1
  let lastIntensity = -1

  const rows = [
    { y: 18, keys: 14, w: 32 },
    { y: 56, keys: 13, w: 34 },
    { y: 94, keys: 12, w: 38 },
    { y: 132, keys: 8, w: 52 },
  ]

  function draw(hue: number, intensity: number) {
    ctx.clearRect(0, 0, W, H)

    ctx.fillStyle = '#0b0e16'
    ctx.beginPath()
    ctx.roundRect(0, 0, W, H, 10)
    ctx.fill()

    if (intensity > 0.01) {
      ctx.save()
      ctx.shadowColor = `hsla(${hue * 360}, 90%, 60%, 0.9)`
      ctx.shadowBlur = 24
      ctx.fillStyle = `hsla(${hue * 360}, 90%, 55%, ${0.55 * intensity})`
      ctx.beginPath()
      ctx.roundRect(6, 6, W - 12, H - 12, 8)
      ctx.fill()
      ctx.restore()
    }

    for (const row of rows) {
      const totalW = row.keys * row.w
      const startX = (W - totalW) / 2
      for (let i = 0; i < row.keys; i++) {
        const x = startX + i * row.w
        ctx.fillStyle = '#161b28'
        ctx.beginPath()
        ctx.roundRect(x + 2, row.y, row.w - 6, 30, 5)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.05)'
        ctx.beginPath()
        ctx.roundRect(x + 2, row.y, row.w - 6, 14, 5)
        ctx.fill()
      }
    }

    if (intensity > 0.01) {
      ctx.fillStyle = `hsla(${hue * 360}, 95%, 65%, ${0.5 * intensity})`
      ctx.shadowColor = `hsla(${hue * 360}, 95%, 65%, 0.9)`
      ctx.shadowBlur = 16
      ctx.fillRect(10, H - 8, W - 20, 3)
      ctx.shadowBlur = 0
    }
  }

  draw(0.36, 1)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  return {
    texture,
    update(hue: number, intensity: number) {
      if (Math.abs(hue - lastHue) < 0.004 && Math.abs(intensity - lastIntensity) < 0.02) {
        return false
      }
      lastHue = hue
      lastIntensity = intensity
      draw(hue, intensity)
      return true
    },
  }
}
