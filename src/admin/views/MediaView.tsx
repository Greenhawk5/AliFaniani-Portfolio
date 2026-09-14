/**
 * Media — the build-generated media library (public/media-manifest.json).
 * Read-only: no uploads, no R2 — new assets arrive via the git → build
 * pipeline. This view gives the manifest a browsable home (search, grid,
 * dimensions/size) so the admin can verify what the build exported.
 */

import { useMemo, useState } from 'react'
import { useMediaLibrary } from '../MediaPicker'
import { AdminCard, AdminEmpty, AdminNotice, Skeleton } from '../ui/primitives'
import { SearchIcon, ImageIcon } from '../ui/icons'
import { inputClasses } from '../Field'
import { cn } from '@/lib/cn'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaView() {
  const { entries, error } = useMediaLibrary()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const visible = useMemo(
    () => (entries ?? []).filter((e) => e.path.toLowerCase().includes(query.toLowerCase())),
    [entries, query]
  )

  const totals = useMemo(() => {
    const all = entries ?? []
    return {
      count: all.length,
      bytes: all.reduce((sum, e) => sum + e.bytes, 0),
      folders: new Set(all.map((e) => e.path.split('/').slice(0, 3).join('/'))).size,
    }
  }, [entries])

  return (
    <div className="space-y-4">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Content</p>
        <h1 className="mt-1 text-2xl font-semibold text-frost">Media library</h1>
        <p className="mt-1 max-w-2xl text-sm text-mist">
          Build-generated assets served from <span className="font-mono text-xs">/media/</span>. New images
          arrive through the git → build pipeline; pick paths in the editors via the MediaPicker.
        </p>
      </header>

      {error && <AdminNotice kind="error">{error}</AdminNotice>}

      {entries === null && !error ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by path…"
                aria-label="Filter media by path"
                className={cn(inputClasses, 'pl-9')}
              />
            </div>
            <p className="text-xs text-mist/70">
              {totals.count} files · {formatBytes(totals.bytes)} · {totals.folders} folders
            </p>
          </div>

          {visible.length === 0 ? (
            <AdminEmpty title="No matches" description="Try a different path fragment." icon={<ImageIcon className="h-8 w-8" />} />
          ) : (
            <AdminCard className="p-3">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {visible.map((entry) => (
                  <li key={entry.path}>
                    <button
                      onClick={() => setSelected(entry.path === selected ? null : entry.path)}
                      aria-label={`Inspect ${entry.path}`}
                      className={cn(
                        'w-full cursor-pointer overflow-hidden rounded-lg border text-left transition-colors',
                        entry.path === selected ? 'border-accent' : 'border-edge hover:border-accent/50'
                      )}
                    >
                      <img src={entry.path} alt="" loading="lazy" className="h-24 w-full bg-abyss object-cover" />
                      <div className="px-2 py-1.5">
                        <p className="truncate font-mono text-[10px] text-frost" title={entry.path}>
                          {entry.path.split('/').pop()}
                        </p>
                        <p className="font-mono text-[9px] text-mist/60">
                          {entry.width && entry.height ? `${entry.width}×${entry.height}` : '—'} · {formatBytes(entry.bytes)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </AdminCard>
          )}

          {selected && (
            <AdminCard className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist">Path</p>
              <code className="block break-all rounded-lg border border-edge bg-abyss px-3 py-2 font-mono text-xs text-frost">
                {selected}
              </code>
              <p className="mt-2 text-xs text-mist/70">
                Paste this root-relative path into any media field, or use the MediaPicker in the editors.
              </p>
            </AdminCard>
          )}
        </>
      )}
    </div>
  )
}
