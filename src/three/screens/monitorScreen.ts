export type MonitorMode = 'code' | 'terminal' | 'github' | 'update'

const W = 1024
const H = 600

interface Token {
  text: string
  color: string
}

const CODE_LINES: Token[][] = [
  [
    { text: 'import', color: '#c586c0' },
    { text: ' { useFrame } ', color: '#d4d4d4' },
    { text: 'from', color: '#c586c0' },
    { text: " 'react-three-fiber'", color: '#ce9178' },
  ],
  [
    { text: 'import', color: '#c586c0' },
    { text: ' * ', color: '#d4d4d4' },
    { text: 'as', color: '#c586c0' },
    { text: ' THREE ', color: '#d4d4d4' },
    { text: 'from', color: '#c586c0' },
    { text: " 'three'", color: '#ce9178' },
  ],
  [],
  [
    { text: 'export function', color: '#569cd6' },
    { text: ' Room', color: '#4ec9b0' },
    { text: '() {', color: '#d4d4d4' },
  ],
  [
    { text: '  const', color: '#569cd6' },
    { text: ' lights ', color: '#9cdcfe' },
    { text: '= ', color: '#d4d4d4' },
    { text: 'useLights', color: '#dcdcaa' },
    { text: '({ rgb: ', color: '#d4d4d4' },
    { text: 'true', color: '#569cd6' },
    { text: ' })', color: '#d4d4d4' },
  ],
  [],
  [
    { text: '  useFrame', color: '#dcdcaa' },
    { text: '((state, delta) => {', color: '#d4d4d4' },
  ],
  [
    { text: '    sun', color: '#9cdcfe' },
    { text: '.', color: '#d4d4d4' },
    { text: 'intensity ', color: '#9cdcfe' },
    { text: '= ', color: '#d4d4d4' },
    { text: 'lerp', color: '#dcdcaa' },
    { text: '(sun.intensity, target, delta)', color: '#d4d4d4' },
  ],
  [
    { text: '    sky', color: '#9cdcfe' },
    { text: '.', color: '#d4d4d4' },
    { text: 'color', color: '#9cdcfe' },
    { text: '.setHSL(hue, ', color: '#d4d4d4' },
    { text: '0.7', color: '#b5cea8' },
    { text: ', ', color: '#d4d4d4' },
    { text: '0.5', color: '#b5cea8' },
    { text: ')', color: '#d4d4d4' },
  ],
  [
    { text: '  })', color: '#d4d4d4' },
  ],
  [],
  [
    { text: '  return', color: '#c586c0' },
    { text: ' (', color: '#d4d4d4' },
  ],
  [
    { text: '    <>', color: '#808080' },
  ],
  [
    { text: '      <Desk', color: '#4ec9b0' },
    { text: ' position', color: '#9cdcfe' },
    { text: '={deskPos} />', color: '#d4d4d4' },
  ],
  [
    { text: '      <Monitor', color: '#4ec9b0' },
    { text: ' glow', color: '#9cdcfe' },
    { text: '={lights.monitor} />', color: '#d4d4d4' },
  ],
  [
    { text: '      <Window', color: '#4ec9b0' },
    { text: ' sky', color: '#9cdcfe' },
    { text: '={sky} />', color: '#d4d4d4' },
  ],
  [
    { text: '    </>', color: '#808080' },
  ],
  [
    { text: '  )', color: '#d4d4d4' },
  ],
  [{ text: '}', color: '#d4d4d4' }],
]

const TERMINAL_SCRIPT: Array<{ text: string; delay: number; color: string; typeSpeed?: number }> = [
  { text: '$ npm run build', delay: 0, color: '#4af626', typeSpeed: 24 },
  { text: '  vite v8.2.2 building for production...', delay: 500, color: '#9aa4b8' },
  { text: '  ✓ 478 modules transformed.', delay: 900, color: '#9aa4b8' },
  { text: '  ✓ built in 2.31s', delay: 700, color: '#4af626' },
  { text: '$ git push origin main', delay: 800, color: '#4af626', typeSpeed: 22 },
  { text: '  → analyzing... 100%', delay: 500, color: '#9aa4b8' },
  { text: '  ✓ deployed to production', delay: 800, color: '#4af626' },
  { text: '  https://alifaniani.ir', delay: 400, color: '#37d4ff' },
  { text: '$ echo "ship it"', delay: 1200, color: '#4af626', typeSpeed: 26 },
  { text: '  ship it', delay: 300, color: '#e8ecf4' },
]

const GITHUB_COMMITS = [
  'feat: continuous day/night interpolation',
  'perf: throttle canvas texture uploads',
  'fix: shadow acne on thin geometry',
  'feat: rgb master toggle easter egg',
  'chore: bump three to r185',
]

function seeded(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface MonitorRenderer {
  canvas: HTMLCanvasElement
  update(elapsed: number): boolean
  cycle(): void
}

export function createMonitorRenderer(): MonitorRenderer {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const rand = seeded(42)
  const modes: MonitorMode[] = ['code', 'terminal', 'github', 'update']
  let modeIndex = 0
  let modeStart = 0
  let flash = 0
  let lastDrawn = -1
  let lastBlink = 0

  const gridCells: number[] = []
  for (let i = 0; i < 26 * 7; i++) gridCells.push(Math.floor(rand() * 5))

  function drawChrome() {
    ctx.fillStyle = '#181c27'
    ctx.fillRect(0, 0, W, 34)
    const dots = ['#ff5f57', '#febc2e', '#28c840']
    dots.forEach((c, i) => {
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(22 + i * 22, 17, 6, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.fillStyle = '#10141f'
    ctx.fillRect(0, 34, W, H - 34)
  }

  function drawCode(elapsed: number) {
    drawChrome()
    ctx.fillStyle = '#1c2130'
    ctx.fillRect(0, 34, 190, H - 34)
    ctx.font = '15px "JetBrains Mono", monospace'
    const files = ['Room.tsx', 'timeEngine.ts', 'CameraRig.tsx', 'Window.tsx', 'env.ts']
    files.forEach((f, i) => {
      ctx.fillStyle = i === 0 ? '#e8ecf4' : '#6b7280'
      ctx.fillText(f, 20, 72 + i * 30)
    })

    const totalChars = CODE_LINES.reduce((acc, l) => acc + l.reduce((a, t) => a + t.text.length, 0), 0)
    const speed = 30
    const visibleChars = Math.min(totalChars, Math.floor((elapsed - modeStart) * speed))

    let charCount = 0
    const lineH = 26
    ctx.font = '15px "JetBrains Mono", monospace'
    for (let i = 0; i < CODE_LINES.length; i++) {
      const y = 72 + i * lineH
      ctx.fillStyle = '#3d4457'
      ctx.fillText(String(i + 1).padStart(2, ' '), 200, y)
      let x = 240
      for (const token of CODE_LINES[i]) {
        const remain = visibleChars - charCount
        if (remain <= 0) break
        const text = token.text.slice(0, remain)
        ctx.fillStyle = token.color
        ctx.fillText(text, x, y)
        x += ctx.measureText(token.text).width
        charCount += token.text.length
      }
      if (visibleChars <= charCount && visibleChars > 0) {
        const blink = Math.floor(elapsed * 2) % 2 === 0
        if (blink) {
          ctx.fillStyle = '#4af626'
          ctx.fillRect(x + 1, y - 14, 8, 18)
        }
        break
      }
    }

    if (visibleChars >= totalChars) {
      const blink = Math.floor(elapsed * 2) % 2 === 0
      if (blink) {
        const lastLine = CODE_LINES[CODE_LINES.length - 1][0]
        ctx.fillStyle = '#4af626'
        ctx.fillRect(240 + ctx.measureText(lastLine.text).width + 4, 72 + (CODE_LINES.length - 1) * lineH - 14, 8, 18)
      }
    }

    ctx.fillStyle = '#151a28'
    ctx.fillRect(W - 70, 34, 70, H - 34)
    ctx.fillStyle = '#2a3149'
    for (let i = 0; i < 22; i++) {
      ctx.fillRect(W - 64, 44 + i * 24, 58, Math.max(2, (CODE_LINES.length / 19) * 14))
    }
  }

  function drawTerminal(elapsed: number) {
    drawChrome()
    ctx.font = '17px "JetBrains Mono", monospace'
    let y = 70
    let done = true

    for (const line of TERMINAL_SCRIPT) {
      const localElapsed = elapsed - modeStart - line.delay / 1000
      if (localElapsed < 0) {
        done = false
        break
      }
      const typeSpeed = line.typeSpeed ?? 1000
      const chars =
        line.typeSpeed != null
          ? Math.min(line.text.length, Math.floor(localElapsed * (typeSpeed / 10)))
          : line.text.length
      if (chars < line.text.length) done = false

      ctx.fillStyle = line.color
      ctx.fillText(line.text.slice(0, chars), 24, y)
      if (chars < line.text.length) {
        if (Math.floor(elapsed * 2) % 2 === 0) {
          const wpx = ctx.measureText(line.text.slice(0, chars)).width
          ctx.fillStyle = '#4af626'
          ctx.fillRect(24 + wpx + 2, y - 14, 9, 18)
        }
        break
      }
      y += 30
      if (y > H - 40) break
    }

    if (done && Math.floor(elapsed * 2) % 2 === 0) {
      ctx.fillStyle = '#4af626'
      ctx.fillRect(24, y - 14, 9, 18)
    }
  }

  function drawGithub(elapsed: number) {
    drawChrome()
    ctx.font = 'bold 24px Inter, sans-serif'
    ctx.fillStyle = '#e8ecf4'
    ctx.fillText('alifaniani / portfolio', 24, 76)
    ctx.font = '15px Inter, sans-serif'
    ctx.fillStyle = '#8b93a7'
    ctx.fillText('★ 128 stars   ·   34 forks   ·   TypeScript', 24, 102)

    const cell = 16
    const gx = 24
    const gy = 140
    const reveal = Math.min(26 * 7, Math.floor((elapsed - modeStart) * 40))
    for (let i = 0; i < gridCells.length; i++) {
      if (i > reveal) break
      const col = i % 26
      const row = Math.floor(i / 26)
      const level = gridCells[i]
      const colors = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
      ctx.fillStyle = colors[level]
      ctx.fillRect(gx + col * cell, gy + row * cell, cell - 3, cell - 3)
    }

    ctx.font = '15px "JetBrains Mono", monospace'
    const commitReveal = Math.floor((elapsed - modeStart - 3) * 1.2)
    GITHUB_COMMITS.forEach((c, i) => {
      if (i > commitReveal) return
      const y = 330 + i * 30
      ctx.fillStyle = '#39d353'
      ctx.beginPath()
      ctx.arc(32, y - 5, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#2a3149'
      ctx.beginPath()
      ctx.moveTo(32, y - 1)
      ctx.lineTo(32, y + 25)
      ctx.stroke()
      ctx.fillStyle = '#c9d1d9'
      ctx.fillText(c, 48, y)
    })

    if (commitReveal >= GITHUB_COMMITS.length) {
      ctx.fillStyle = '#4af626'
      ctx.font = 'bold 16px "JetBrains Mono", monospace'
      ctx.fillText('✓ pushed to main', 24, 330 + GITHUB_COMMITS.length * 30 + 16)
    }
  }

  function drawUpdate(elapsed: number) {
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#1a3fa8')
    grad.addColorStop(1, '#0e2a7a')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    const local = elapsed - modeStart
    const pct = Math.min(99, Math.floor((local / 12) * 100))

    const spinners = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    const spin = spinners[Math.floor(elapsed * 8) % spinners.length]

    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px Inter, sans-serif'
    ctx.fillText('Installing updates', W / 2, H / 2 - 60)

    ctx.font = '30px "JetBrains Mono", monospace'
    ctx.fillStyle = '#9cc3ff'
    ctx.fillText(`${spin}  ${pct}%  — please do not turn off your PC`, W / 2, H / 2)

    ctx.font = '18px Inter, sans-serif'
    ctx.fillStyle = '#6f93d6'
    ctx.fillText('This is fine. This is a portfolio. ☕', W / 2, H / 2 + 52)

    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(W / 2 - 220, H / 2 + 90, 440, 10)
    ctx.fillStyle = '#4af626'
    ctx.fillRect(W / 2 - 220, H / 2 + 90, 4.4 * pct, 10)
    ctx.textAlign = 'left'
  }

  function draw() {
    switch (modes[modeIndex]) {
      case 'code':
        drawCode(perf())
        break
      case 'terminal':
        drawTerminal(perf())
        break
      case 'github':
        drawGithub(perf())
        break
      case 'update':
        drawUpdate(perf())
        break
    }

    if (flash > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, flash)})`
      ctx.fillRect(0, 0, W, H)
    }
  }

  function perf() {
    return performance.now() / 1000
  }

  return {
    canvas,
    cycle() {
      modeIndex = (modeIndex + 1) % modes.length
      modeStart = perf()
      flash = 1
    },
    update(elapsed: number) {
      const modeDuration = modes[modeIndex] === 'update' ? 24 : 22
      if (elapsed - modeStart > modeDuration) {
        modeIndex = (modeIndex + 1) % modes.length
        modeStart = elapsed
        flash = 1
      }
      if (flash > 0) flash = Math.max(0, flash - 0.08)

      const blinkPhase = Math.floor(elapsed * 2)
      const needsDraw =
        flash > 0 || blinkPhase !== lastBlink || elapsed - lastDrawn > 0.08 || lastDrawn < 0
      if (!needsDraw) return false

      lastBlink = blinkPhase
      lastDrawn = elapsed
      draw()
      return true
    },
  }
}
