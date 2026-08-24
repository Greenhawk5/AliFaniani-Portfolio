import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const baseField =
  'w-full bg-abyss border rounded-xl px-3.5 py-2.5 text-sm text-frost placeholder:text-mist/50 transition-colors focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15 disabled:opacity-50'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  optional?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, optional, className, id, ...props },
  ref
) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-medium text-mist">
        {label}
        {optional && <span className="ml-1.5 text-mist/50">(optional)</span>}
      </label>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={cn(baseField, error ? 'border-danger/60' : 'border-edge', className)}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, ...props },
  ref
) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-medium text-mist">
        {label}
      </label>
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={cn(baseField, 'min-h-32 resize-y', error ? 'border-danger/60' : 'border-edge', className)}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
})
