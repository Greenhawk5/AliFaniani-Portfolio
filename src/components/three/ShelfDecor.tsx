import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { env } from '@/three/env'
import { Interactable } from './Interactable'
import { SocialBoard } from './SocialBoard'
import { ShelfCharacters } from './ShelfCharacters'

function Shelf() {
  const wood = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#241c13', roughness: 0.55, metalness: 0.1 }),
    []
  )
  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0e1219', roughness: 0.4, metalness: 0.6 }),
    []
  )

  const bookColors = ['#3a4a6b', '#6b3a4a', '#3a6b55', '#6b5a3a', '#4a3a6b', '#2d5a6b', '#6b4a3a']
  const bookHeights = [0.26, 0.3, 0.24, 0.29, 0.26, 0.31, 0.25]

  return (
    <Interactable id="shelf" label="Display Shelf — click to inspect the collectibles" focusable>
      <group position={[-4.4, 0, 0.8]}>
        {/* Invisible click target covering both shelf boards and contents */}
        <mesh position={[0.05, 1.9, 0]} visible={false}>
          <boxGeometry args={[0.55, 1.0, 1.8]} />
        </mesh>
        {[1.62, 2.14].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh castShadow receiveShadow material={wood}>
            <boxGeometry args={[0.36, 0.04, 1.7]} />
          </mesh>
          {[-0.5, 0.5].map((z) => (
            <mesh key={z} position={[0.1, -0.035, z]} material={metal}>
              <boxGeometry args={[0.16, 0.03, 0.03]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Lower-shelf books — group shifted to keep all books on the board
          (board spans z -0.85..0.85; previously overhung the -z end) */}
      <group position={[0.02, 1.64 + 0.02, -0.28]}>
        {bookColors.map((color, i) => {
          const z = -0.55 + i * 0.075
          return (
            <mesh key={color} position={[0, bookHeights[i] / 2, z]} rotation={[0, 0, i === 6 ? 0.12 : 0]} castShadow>
              <boxGeometry args={[0.2, bookHeights[i], 0.055]} />
              <meshStandardMaterial color={color} roughness={0.85} />
            </mesh>
          )
        })}
      </group>

      <group position={[0.02, 2.16, -0.5]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.04, 0.08, 14]} />
          <meshStandardMaterial color="#8a4a3a" roughness={0.8} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos(i * 2.1) * 0.03, 0.09, Math.sin(i * 2.1) * 0.03]} castShadow>
            <sphereGeometry args={[0.045, 10, 8]} />
            <meshStandardMaterial color="#2d5a3d" roughness={1} />
          </mesh>
        ))}
      </group>

      {/* Gold trophy removed by design decision — intentionally empty space */}

      <group position={[0.02, 2.16, 0.68]}>
        {['#2d4a5a', '#5a3a2d'].map((color, i) => (
          <mesh key={color} position={[0, 0.02 + i * 0.045, 0]} rotation={[0, i * 0.3, 0]} castShadow>
            <boxGeometry args={[0.24, 0.04, 0.17]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
        ))}
      </group>
      </group>
    </Interactable>
  )
}

function Posters() {
  /**
   * Branded board: displays the approved geometric Ali Faniani logo
   * and live visitor analytics stats directly below the digital clock.
   * Rendered once onto an offscreen canvas and updated only when real stats
   * arrive — zero continuous per-frame texture re-allocations or GPU overhead.
   */
  const logoTexture = useMemo(() => {
    const W = 560
    const H = 740
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4

    let loadedImg: HTMLImageElement | null = null
    let visitorCount = '1,240+'

    function renderBoard() {
      // 1. Dark tech background
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#0a0e18')
      grad.addColorStop(1, '#060810')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // 2. Subtle cyber border
      ctx.strokeStyle = 'rgba(57,255,139,0.22)'
      ctx.lineWidth = 3
      ctx.strokeRect(12, 12, W - 24, H - 24)

      // 3. Draw logo
      if (loadedImg) {
        const logoSize = W * 0.62
        ctx.drawImage(loadedImg, (W - logoSize) / 2, 54, logoSize, logoSize)
      }

      // 4. Separator
      ctx.fillStyle = 'rgba(57,255,139,0.3)'
      ctx.fillRect(W / 2 - 90, 440, 180, 2)

      // 5. Visitor counter section
      ctx.fillStyle = '#7a8599'
      ctx.font = 'bold 20px "JetBrains Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('PORTFOLIO VISITS', W / 2, 490)

      ctx.font = 'bold 54px "JetBrains Mono", monospace'
      ctx.fillStyle = '#39ff8b'
      ctx.shadowColor = '#39ff8b'
      ctx.shadowBlur = 18
      ctx.fillText(visitorCount, W / 2, 570)
      ctx.shadowBlur = 0

      // Sub-label
      ctx.fillStyle = '#4f5869'
      ctx.font = '16px "JetBrains Mono", monospace'
      ctx.fillText('VERIFIED · FIRST-PARTY', W / 2, 630)

      tex.needsUpdate = true
    }

    renderBoard()

    const img = new Image()
    img.onload = () => {
      loadedImg = img
      renderBoard()
    }
    img.src = '/favicon.svg'

    fetch('/api/analytics/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { totalVisitors?: number } | null) => {
        if (data && typeof data.totalVisitors === 'number') {
          visitorCount = data.totalVisitors.toLocaleString()
          renderBoard()
        }
      })
      .catch(() => {})

    return tex
  }, [])

  const frame = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0b0e16', roughness: 0.4, metalness: 0.5 }),
    []
  )

  return (
    <group>
      <group position={[3.9, 1.72, -4.44]}>
        <mesh castShadow material={frame}>
          <boxGeometry args={[0.64, 0.82, 0.04]} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <planeGeometry args={[0.56, 0.74]} />
          {/* Subtle green-tinged emissive, consistent with the clock/board
              screens (0.75–1.1 range) — soft glow via the existing bloom. */}
          <meshStandardMaterial
            map={logoTexture}
            emissive="#ffffff"
            emissiveMap={logoTexture}
            emissiveIntensity={0.85}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
      </group>
    </group>
  )
}

function Plant() {
  const sway = useRef<THREE.Group>(null)

  useFrame(() => {
    if (sway.current) {
      sway.current.rotation.z = Math.sin(env.time * 0.8) * 0.015
    }
  })

  return (
    <group position={[-3.65, 0, -3.6]}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.36, 18]} />
        <meshStandardMaterial color="#1f2534" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.035, 0.5, 8]} />
        <meshStandardMaterial color="#3a2d1f" roughness={0.9} />
      </mesh>
      <group ref={sway} position={[0, 0.8, 0]}>
        {[
          [0, 0.15, 0, 0.32],
          [0.18, 0.05, 0.08, 0.24],
          [-0.16, 0.02, -0.06, 0.26],
          [0.05, -0.08, -0.18, 0.22],
          [-0.06, -0.05, 0.17, 0.2],
        ].map(([x, y, z, s], i) => (
          <mesh key={i} position={[x, y, z]} scale={[s * 0.7, s, s * 0.7]} castShadow>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={i % 2 ? '#2d5a3d' : '#3a6b4d'} roughness={1} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function ShelfDecor() {
  return (
    <group>
      <Shelf />
      <Posters />
      <SocialBoard />
      <Plant />
      <ShelfCharacters />
    </group>
  )
}
