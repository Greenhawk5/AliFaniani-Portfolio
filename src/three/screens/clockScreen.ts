export interface ClockRenderer {
  canvas: HTMLCanvasElement
  update(time: string, dateLine: string, tzLine: string): boolean
}

const W = 512
const H = 300

export function createClockRenderer(): ClockRenderer {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  let lastKey = ''

  return {
    canvas,
    update(time, dateLine, tzLine) {
      const key = `${time}|${dateLine}|${tzLine}|${Math.floor(Date.now() / 1000) % 2}`
      if (key === lastKey) return false
      lastKey = key

      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#0c101c')
      grad.addColorStop(1, '#080b14')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      ctx.fillStyle = '#39ff8b'
      ctx.shadowColor = '#39ff8b'
      ctx.shadowBlur = 26
      ctx.font = 'bold 104px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      const [hh, mm] = time.split(':')
      const blink = (Math.floor(Date.now() / 1000) % 2 === 0)
      const display = blink ? `${hh}:${mm}` : `${hh} ${mm}`
      ctx.fillText(display, W / 2, 128)
      ctx.shadowBlur = 0

      ctx.fillStyle = '#39ff8b'
      ctx.fillRect(W / 2 - 60, 156, 120, 2)

      ctx.fillStyle = '#8b93a7'
      ctx.font = 'bold 24px Inter, sans-serif'
      ctx.fillText(dateLine.toUpperCase(), W / 2, 208)

      ctx.fillStyle = '#586074'
      ctx.font = '17px "JetBrains Mono", monospace'
      ctx.fillText(tzLine, W / 2, 246)

      ctx.strokeStyle = 'rgba(57,255,139,0.25)'
      ctx.lineWidth = 2
      ctx.strokeRect(8, 8, W - 16, H - 16)

      return true
    },
  }
}
