/**
 * MediaPicker (v2.2.0 Phase 3) — Unified media selection with R2 support.
 *
 * Supports:
 * 1. Cloudflare R2 uploaded media (https://media.alifaniani.ir/...)
 * 2. Static build-time manifest media (/media/...)
 * 3. Direct inline file upload into R2 from within the picker
 * 4. Safe URL validation without false warning on R2 assets
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { inputClasses } from './Field'
import { listMedia, uploadMediaFiles, type MediaCategory } from './mediaApi'
import { UploadCloudIcon } from './ui/icons'

export interface MediaEntry {
  path: string
  bytes: number
  width: number | null
  height: number | null
  displayName?: string
  source: 'r2' | 'static'
}

export function useMediaLibrary() {
  const [entries, setEntries] = useState<MediaEntry[] | null>(null)
  const [error, setError] = useState('')

  const loadEntries = useCallback(async () => {
    let combined: MediaEntry[] = []
    let fetchError = ''

    // 1. Fetch live R2 media assets (if authenticated)
    try {
      const r2Data = await listMedia({ limit: 100 })
      const r2Entries: MediaEntry[] = (r2Data.items ?? []).map((asset) => ({
        path: asset.url,
        bytes: asset.bytes,
        width: asset.width,
        height: asset.height,
        displayName: asset.display_name,
        source: 'r2',
      }))
      combined.push(...r2Entries)
    } catch {
      // Ignored if unauthenticated or endpoint unavailable; fallback to manifest
    }

    // 2. Fetch static media manifest
    try {
      const res = await fetch('/media-manifest.json')
      if (res.ok) {
        const manifest: {
          media: Record<string, { bytes: number; width: number | null; height: number | null }>
        } = await res.json()

        const staticEntries: MediaEntry[] = Object.entries(manifest.media).map(([path, meta]) => ({
          path,
          ...meta,
          source: 'static',
        }))
        combined.push(...staticEntries)
      }
    } catch (e: any) {
      if (combined.length === 0) {
        fetchError = e.message || 'Media library unavailable'
      }
    }

    // Deduplicate by path
    const seen = new Set<string>()
    const unique: MediaEntry[] = []
    for (const item of combined) {
      if (!seen.has(item.path)) {
        seen.add(item.path)
        unique.push(item)
      }
    }

    unique.sort((a, b) => {
      // Prioritize R2 uploads, then alphabetically
      if (a.source !== b.source) return a.source === 'r2' ? -1 : 1
      return a.path.localeCompare(b.path)
    })

    setEntries(unique)
    if (fetchError && unique.length === 0) {
      setError(fetchError)
    }
  }, [])

  useEffect(() => {
    void loadEntries()
  }, [loadEntries])

  return { entries, error, reload: loadEntries }
}

interface PickerProps {
  /** current value (root-relative media URL or https://media.alifaniani.ir/...) */
  value: string
  onChange: (next: string) => void
  label: string
  /** optional path filter, e.g. (p) => p.includes('/project/') */
  filter?: (path: string) => boolean
  category?: MediaCategory
}

export function MediaPicker({ value, onChange, label, filter, category = 'project' }: PickerProps) {
  const { entries, error, reload } = useMediaLibrary()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const visible = (entries ?? [])
    .filter((e) => (filter ? filter(e.path) : true))
    .filter(
      (e) =>
        e.path.toLowerCase().includes(query.toLowerCase()) ||
        (e.displayName && e.displayName.toLowerCase().includes(query.toLowerCase()))
    )

  const isKnown =
    !value ||
    value.startsWith('/assets/') ||
    value.startsWith('https://media.alifaniani.ir/') ||
    (entries && entries.some((e) => e.path === value || value.endsWith(e.path)))

  const handleInlineUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    try {
      setIsUploading(true)
      setUploadError(null)
      const res = await uploadMediaFiles([file], category)
      if (res.uploaded && res.uploaded.length > 0) {
        const uploaded = res.uploaded[0]
        onChange(uploaded.url)
        await reload()
        setOpen(false)
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium uppercase tracking-wider text-mist">{label}</span>
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label={`${label} media path`}
          className={`${inputClasses} font-mono text-xs flex-1`}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close' : 'Browse'}
        </Button>
      </div>

      {!isKnown && (
        <span role="alert" className="block text-xs text-amber-300">
          Warning: not found in the media library — please verify before publishing.
        </span>
      )}

      {error && <span className="block text-xs text-danger">{error}</span>}

      {open && (
        <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-edge bg-void/90 p-3 shadow-xl backdrop-blur-md">
          {/* Top Controls: Search + Quick Upload */}
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search media…"
              aria-label="Filter media"
              className={`${inputClasses} text-xs flex-1`}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 shrink-0"
            >
              <UploadCloudIcon className="h-3.5 w-3.5 text-accent" />
              <span>{isUploading ? 'Uploading…' : 'Upload'}</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".webp,.png,.jpg,.jpeg,.avif,image/webp,image/png,image/jpeg,image/avif"
              className="hidden"
              onChange={(e) => void handleInlineUpload(e.target.files)}
            />
          </div>

          {uploadError && <p className="text-xs text-danger">{uploadError}</p>}

          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visible.map((entry) => (
              <li key={entry.path}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(entry.path)
                    setOpen(false)
                  }}
                  aria-label={`Select ${entry.displayName || entry.path}`}
                  className={`w-full cursor-pointer rounded-lg border p-1.5 text-left transition-colors ${
                    entry.path === value ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-edge hover:border-accent/50 bg-abyss/60'
                  }`}
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded bg-void">
                    <img
                      src={entry.path}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const img = e.currentTarget
                        if (!img.src.includes('/media/')) {
                          img.src = entry.path.replace('https://media.alifaniani.ir', '')
                        }
                      }}
                    />
                    {entry.source === 'r2' && (
                      <span className="absolute top-1 right-1 rounded bg-accent/80 px-1 py-0.2 font-mono text-[8px] font-semibold text-void">
                        R2
                      </span>
                    )}
                  </div>
                  <span className="mt-1 block truncate font-mono text-[10px] text-frost" title={entry.displayName || entry.path}>
                    {entry.displayName || entry.path.split('/').pop()}
                  </span>
                  <span className="block font-mono text-[9px] text-mist/60">
                    {entry.width && entry.height ? `${entry.width}×${entry.height}` : '—'}
                  </span>
                </button>
              </li>
            ))}
            {entries !== null && visible.length === 0 && (
              <li className="col-span-full py-4 text-center text-xs text-mist">
                No matching media. Use the Upload button above to add one.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
