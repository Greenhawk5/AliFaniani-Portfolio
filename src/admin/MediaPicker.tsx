/**
 * MediaPicker (Phase 6A) — static media library over the build-generated
 * manifest. NO uploads, NO R2: selecting writes only the stable /media/ URL
 * into the content field. New images arrive via the git → build pipeline.
 *
 * The manifest is public build output (public/media-manifest.json) — fetched
 * directly, no admin endpoint needed and no secrets involved.
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { inputClasses } from './Field'

export interface MediaEntry {
  path: string
  bytes: number
  width: number | null
  height: number | null
}

export function useMediaLibrary() {
  const [entries, setEntries] = useState<MediaEntry[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/media-manifest.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Media library unavailable'))))
      .then((manifest: { media: Record<string, { bytes: number; width: number | null; height: number | null }> }) => {
        if (cancelled) return
        setEntries(
          Object.entries(manifest.media).map(([path, meta]) => ({ path, ...meta })).sort((a, b) => a.path.localeCompare(b.path))
        )
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [])

  return { entries, error }
}

interface PickerProps {
  /** current value (root-relative media URL) */
  value: string
  onChange: (next: string) => void
  label: string
  /** optional path filter, e.g. (p) => p.includes('/project/') */
  filter?: (path: string) => boolean
}

export function MediaPicker({ value, onChange, label, filter }: PickerProps) {
  const { entries, error } = useMediaLibrary()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const visible = (entries ?? []).filter((e) => (filter ? filter(e.path) : true)).filter((e) => e.path.includes(query))

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium uppercase tracking-wider text-mist">{label}</span>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label={`${label} media path`}
          className={`${inputClasses} font-mono text-xs`}
        />
        <Button type="button" size="sm" variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Close' : 'Browse'}
        </Button>
      </div>
      {value && !error && entries && !entries.some((e) => e.path === value) && !value.startsWith('/assets/') && (
        <span role="alert" className="block text-xs text-amber-300">
          Warning: not in the media library — will fail publish validation.
        </span>
      )}
      {error && <span className="block text-xs text-danger">{error}</span>}
      {open && (
        <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-edge bg-void/60 p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter…"
            aria-label="Filter media"
            className={`${inputClasses} text-xs`}
          />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visible.map((entry) => (
              <li key={entry.path}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(entry.path)
                    setOpen(false)
                  }}
                  aria-label={`Select ${entry.path}`}
                  className={`w-full cursor-pointer rounded-lg border p-1.5 text-left transition-colors ${
                    entry.path === value ? 'border-accent bg-accent/10' : 'border-edge hover:border-accent/50'
                  }`}
                >
                  <img src={entry.path} alt="" loading="lazy" className="h-14 w-full rounded object-cover" />
                  <span className="mt-1 block truncate font-mono text-[10px] text-mist">{entry.path.split('/').pop()}</span>
                </button>
              </li>
            ))}
            {entries !== null && visible.length === 0 && <li className="text-xs text-mist">No matches.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
