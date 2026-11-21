import { useState, useRef, useEffect, useId } from 'react'
import { cn } from '@/lib/cn'

export interface SelectOption<T extends string | number = string> {
  value: T
  label: string
}

export interface AdminSelectProps<T extends string | number = string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  label?: string
  ariaLabel?: string
  className?: string
  disabled?: boolean
}

/**
 * Accessible custom dark dropdown replacing native HTML `<select>`.
 *
 * Implements ARIA listbox pattern with full keyboard navigation:
 * Enter/Space to toggle, Up/Down to navigate options, Escape to close.
 */
export function AdminSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  label,
  ariaLabel,
  className,
  disabled = false,
}: AdminSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [navIndex, setNavIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  const selectedIndex = options.findIndex((o) => o.value === value)
  const focusedIndex = navIndex !== null ? navIndex : selectedIndex >= 0 ? selectedIndex : 0
  const selectedOption = options.find((o) => o.value === value) ?? options[0]

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setNavIndex(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setNavIndex(selectedIndex >= 0 ? selectedIndex : 0)
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setNavIndex(null)
        break
      case 'ArrowDown':
        e.preventDefault()
        setNavIndex((prev) => ((prev !== null ? prev : selectedIndex) + 1) % options.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setNavIndex((prev) => ((prev !== null ? prev : selectedIndex) - 1 + options.length) % options.length)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value)
          setIsOpen(false)
          setNavIndex(null)
        }
        break
    }
  }

  return (
    <div ref={containerRef} className={cn('relative inline-block text-left', className)}>
      {label && (
        <span className="mb-1 block font-mono text-[10px] tracking-wider text-mist uppercase">
          {label}
        </span>
      )}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-8 w-full items-center justify-between gap-2 rounded border border-edge-2 bg-panel px-2.5 font-mono text-xs text-frost transition-all duration-150 hover:border-accent/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span className="truncate">{selectedOption?.label ?? String(value)}</span>
        <svg
          aria-hidden="true"
          className={cn(
            'h-3.5 w-3.5 text-mist/70 transition-transform duration-200',
            isOpen && 'rotate-180 text-accent'
          )}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 mt-1 max-h-56 w-full min-w-[8rem] overflow-auto rounded-md border border-edge-2 bg-panel-2 py-1 shadow-2xl backdrop-blur-md focus:outline-none"
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            const isFocused = i === focusedIndex
            return (
              <li
                key={String(opt.value)}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between px-3 py-1.5 font-mono text-xs transition-colors',
                  isSelected ? 'bg-accent/15 text-accent font-semibold' : 'text-frost/85 hover:bg-white/5',
                  isFocused && !isSelected && 'bg-white/10'
                )}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <span className="font-mono text-accent">✓</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

/**
 * Standardized cyberpunk admin input with accessible labels and borders.
 */
export function AdminInput({ label, error, className, id, ...props }: AdminInputProps) {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block font-mono text-[10px] tracking-wider text-mist uppercase"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded border border-edge-2 bg-panel px-3 py-1.5 font-mono text-xs text-frost transition-colors placeholder:text-mist/40 hover:border-edge focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50',
          error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 font-mono text-[10px] text-rose-400">{error}</p>}
    </div>
  )
}

export interface AdminSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
  className?: string
}

/**
 * Accessible toggle switch for boolean settings.
 */
export function AdminSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: AdminSwitchProps) {
  return (
    <label
      className={cn(
        'flex items-center justify-between gap-3 cursor-pointer select-none',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <div>
        <span className="block font-mono text-xs font-semibold text-frost">{label}</span>
        {description && (
          <span className="block text-[11px] text-mist">{description}</span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          checked ? 'bg-accent' : 'bg-panel-2 border-edge-2'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-void shadow-md ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-4 bg-void' : 'translate-x-0.5 bg-mist/60'
          )}
        />
      </button>
    </label>
  )
}
