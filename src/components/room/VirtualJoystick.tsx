import { useRef, useState, useEffect } from 'react'
import { useFreecamStore } from '@/stores/freecamStore'
import { cn } from '@/lib/cn'

interface VirtualJoystickProps {
  className?: string
}

const PAD_RADIUS = 52
const STICK_RADIUS = 22
const MAX_OFFSET = PAD_RADIUS - STICK_RADIUS // 30px
const DEADZONE = 0.08

export function VirtualJoystick({ className }: VirtualJoystickProps) {
  const padRef = useRef<HTMLDivElement>(null)
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  const activePointerId = useRef<number | null>(null)
  const startPos = useRef({ x: 0, y: 0 })

  const setMove = useFreecamStore((s) => s.setMove)
  const setElevate = useFreecamStore((s) => s.setElevate)
  const resetStore = useFreecamStore((s) => s.reset)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== null) return
    e.stopPropagation()
    activePointerId.current = e.pointerId
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* non-fatal */
    }

    const rect = e.currentTarget.getBoundingClientRect()
    startPos.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }

    setActive(true)
    handleMove(e.clientX, e.clientY)
  }

  const handleMove = (clientX: number, clientY: number) => {
    const dx = clientX - startPos.current.x
    const dy = clientY - startPos.current.y
    const dist = Math.hypot(dx, dy)

    const clampedDist = Math.min(dist, MAX_OFFSET)
    const angle = Math.atan2(dy, dx)

    const knobX = clampedDist * Math.cos(angle)
    const knobY = clampedDist * Math.sin(angle)

    setKnobPos({ x: knobX, y: knobY })

    const normDist = clampedDist / MAX_OFFSET
    if (normDist < DEADZONE) {
      setMove(0, 0)
    } else {
      // Map: positive Y is forward (-dy in screen space)
      const moveX = knobX / MAX_OFFSET
      const moveY = -(knobY / MAX_OFFSET)
      setMove(moveX, moveY)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return
    e.stopPropagation()
    handleMove(e.clientX, e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerId.current) return
    e.stopPropagation()
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* non-fatal */
    }
    activePointerId.current = null
    setActive(false)
    setKnobPos({ x: 0, y: 0 })
    resetStore()
  }

  useEffect(() => {
    return () => {
      resetStore()
    }
  }, [resetStore])

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-end gap-3 select-none touch-none',
        className
      )}
    >
      {/* Main Directional Thumb Joystick */}
      <div
        ref={padRef}
        role="region"
        aria-label="Virtual movement joystick"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          'relative flex items-center justify-center rounded-full border border-edge-2 bg-panel/75 backdrop-blur-md shadow-2xl transition-colors duration-150',
          active ? 'border-accent/60 bg-panel/90 shadow-[0_0_20px_rgba(57,255,139,0.15)]' : 'hover:border-accent/30'
        )}
        style={{ width: PAD_RADIUS * 2, height: PAD_RADIUS * 2 }}
      >
        {/* Subtle crosshairs guide */}
        <div className="pointer-events-none absolute h-6 w-[1px] bg-mist/20" />
        <div className="pointer-events-none absolute h-[1px] w-6 bg-mist/20" />

        {/* Thumb stick knob */}
        <div
          className={cn(
            'pointer-events-none absolute flex items-center justify-center rounded-full transition-transform duration-75',
            active
              ? 'bg-accent shadow-[0_0_12px_rgba(57,255,139,0.5)] scale-105'
              : 'border border-edge-2 bg-panel-2/95 shadow-md'
          )}
          style={{
            width: STICK_RADIUS * 2,
            height: STICK_RADIUS * 2,
            transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
          }}
        >
          <div
            className={cn(
              'h-2.5 w-2.5 rounded-full transition-colors',
              active ? 'bg-void' : 'bg-accent/80'
            )}
          />
        </div>
      </div>

      {/* Compact Elevation Buttons (Up/Down) */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          aria-label="Move camera up"
          onPointerDown={(e) => {
            e.stopPropagation()
            setElevate(1)
          }}
          onPointerUp={(e) => {
            e.stopPropagation()
            setElevate(0)
          }}
          onPointerCancel={(e) => {
            e.stopPropagation()
            setElevate(0)
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-edge-2 bg-panel/80 text-frost/90 backdrop-blur-md active:border-accent active:bg-accent active:text-void active:shadow-[0_0_10px_rgba(57,255,139,0.3)] transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 10l4-4 4 4" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Move camera down"
          onPointerDown={(e) => {
            e.stopPropagation()
            setElevate(-1)
          }}
          onPointerUp={(e) => {
            e.stopPropagation()
            setElevate(0)
          }}
          onPointerCancel={(e) => {
            e.stopPropagation()
            setElevate(0)
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-edge-2 bg-panel/80 text-frost/90 backdrop-blur-md active:border-accent active:bg-accent active:text-void active:shadow-[0_0_10px_rgba(57,255,139,0.3)] transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
