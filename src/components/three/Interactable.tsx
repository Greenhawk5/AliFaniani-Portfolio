import type { ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useUiStore, type FocusTarget } from '@/stores/uiStore'

const FOCUSABLE: ReadonlySet<string> = new Set([
  'monitor',
  'clock',
  'shelf',
  'projectBoard',
  'socialBoard',
])

interface InteractableProps {
  id: string
  label: string
  focusable?: boolean
  onActivate?: () => void
  children: ReactNode
}

export function Interactable({ id, label, focusable, onActivate, children }: InteractableProps) {
  const setHoveredLabel = useUiStore((s) => s.setHoveredLabel)
  const setFocus = useUiStore((s) => s.setFocus)
  const focus = useUiStore((s) => s.focus)

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHoveredLabel(label)
    document.body.style.cursor = 'pointer'
  }

  const onOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHoveredLabel(null)
    document.body.style.cursor = 'auto'
  }

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    // While already focused on this object, clicks belong to the focused
    // content (e.g. board slides) — don't re-trigger the focus transition.
    if (focusable && FOCUSABLE.has(id) && focus !== id) setFocus(id as FocusTarget)
    onActivate?.()
  }

  return (
    <group onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
      {children}
    </group>
  )
}
