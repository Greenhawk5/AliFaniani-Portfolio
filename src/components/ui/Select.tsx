import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  id?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
  buttonClassName?: string
  menuClassName?: string
  disabled?: boolean
}

export function Select({
  id: explicitId,
  value,
  options,
  onChange,
  ariaLabel,
  className,
  buttonClassName,
  menuClassName,
  disabled = false,
}: SelectProps) {
  const generatedId = useId()
  const id = explicitId || generatedId
  const listboxId = `${id}-listbox`

  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [alignRight, setAlignRight] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  const updateAlignment = () => {
    if (containerRef.current && typeof window !== 'undefined') {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceRight = window.innerWidth - rect.left
      // If opening left-aligned would risk overflowing viewport edge, align right
      if (spaceRight < 260 && rect.right > 200) {
        setAlignRight(true)
      } else {
        setAlignRight(false)
      }
    }
  }

  const openMenu = () => {
    updateAlignment()
    const idx = options.findIndex((opt) => opt.value === value)
    setFocusedIndex(idx >= 0 ? idx : 0)
    setIsOpen(true)
  }

  const closeMenu = () => {
    setIsOpen(false)
    setFocusedIndex(-1)
  }

  // Close when clicking outside & handle viewport resize
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }

    const handleResize = () => {
      updateAlignment()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (isOpen && focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value)
          closeMenu()
        } else {
          openMenu()
        }
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          openMenu()
        } else {
          setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0))
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!isOpen) {
          openMenu()
        } else {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1))
        }
        break
      case 'Home':
        if (isOpen) {
          e.preventDefault()
          setFocusedIndex(0)
        }
        break
      case 'End':
        if (isOpen) {
          e.preventDefault()
          setFocusedIndex(options.length - 1)
        }
        break
      case 'Escape':
        if (isOpen) {
          e.preventDefault()
          closeMenu()
        }
        break
      case 'Tab':
        if (isOpen) {
          closeMenu()
        }
        break
      default:
        break
    }
  }

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && (isOpen ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2.5 rounded-xl border border-edge-2 bg-panel/85 px-3 py-2 font-mono text-xs text-frost backdrop-blur-sm transition-all duration-150 hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50',
          isOpen && 'border-accent/60 ring-1 ring-accent/40',
          disabled && 'cursor-not-allowed opacity-50',
          buttonClassName
        )}
      >
        <span className="truncate">{selectedOption?.label ?? value}</span>
        <svg
          aria-hidden="true"
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-mist/70 transition-transform duration-200',
            isOpen && 'rotate-180 text-accent'
          )}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          className={cn(
            'absolute top-full z-40 mt-1.5 max-h-60 min-w-full w-max max-w-[calc(100vw-2rem)] sm:max-w-md overflow-y-auto overflow-x-hidden rounded-xl border border-edge-2 bg-panel-2/95 py-1.5 shadow-2xl backdrop-blur-md focus:outline-none',
            alignRight ? 'right-0' : 'left-0',
            menuClassName
          )}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            const isFocused = i === focusedIndex
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value)
                  closeMenu()
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-3 px-3 py-2 font-mono text-xs transition-colors',
                  isSelected
                    ? 'bg-accent/15 text-accent font-semibold'
                    : 'text-frost/85 hover:bg-white/5 hover:text-frost',
                  isFocused && !isSelected && 'bg-white/10 text-frost'
                )}
              >
                <span className="whitespace-normal break-words sm:whitespace-nowrap">{opt.label}</span>
                {isSelected && (
                  <span className="shrink-0 font-mono text-xs text-accent" aria-hidden="true">
                    ✓
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
