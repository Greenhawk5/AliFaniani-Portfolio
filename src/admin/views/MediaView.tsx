/**
 * Media Library (v2.2.0 Phase 3) — Cloudflare R2 media management.
 *
 * Full management UI:
 * - Direct R2 upload (drag & drop + file picker + multi-file)
 * - Category filtering (project, profile, certificate, misc)
 * - Real-time search by filename or associated key
 * - Metadata inspector (rename display name, change category)
 * - One-click public URL copy (https://media.alifaniani.ir/...)
 * - Safe delete with reference integrity conflict alerts
 * - Synchronizes with activity feed
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  listMedia,
  getMediaStats,
  uploadMediaFiles,
  updateMediaItem,
  deleteMediaItem,
  type MediaAsset,
  type MediaStats,
  type MediaCategory,
  type ReferenceMatch,
} from '../mediaApi'
import { useAdminData } from '../AdminDataProvider'
import { AdminCard, AdminEmpty, AdminNotice, Skeleton } from '../ui/primitives'
import { AdminSelect } from '../ui/form-controls'
import {
  SearchIcon,
  ImageIcon,
  UploadCloudIcon,
  CopyIcon,
  CheckIcon,
  TrashIcon,
  XIcon,
} from '../ui/icons'
import { Button } from '@/components/ui/Button'
import { inputClasses } from '../Field'
import { cn } from '@/lib/cn'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const CATEGORIES: { id: string; label: string; value?: MediaCategory }[] = [
  { id: 'all', label: 'All Media' },
  { id: 'project', label: 'Projects', value: 'project' },
  { id: 'profile', label: 'Profile', value: 'profile' },
  { id: 'certificate', label: 'Certificates', value: 'certificate' },
  { id: 'misc', label: 'Misc', value: 'misc' },
]

function AssetInspector({
  asset,
  onClose,
  onUpdated,
  onDeleted,
}: {
  asset: MediaAsset
  onClose: () => void
  onUpdated: (updated: MediaAsset) => void
  onDeleted: () => void
}) {
  const [editName, setEditName] = useState(asset.display_name)
  const [editCategory, setEditCategory] = useState<MediaCategory>(asset.category)
  const [isSavingMeta, setIsSavingMeta] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteReferences, setDeleteReferences] = useState<ReferenceMatch[] | null>(null)

  const handleCopyUrl = () => {
    void navigator.clipboard.writeText(asset.url)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const handleSaveMeta = async () => {
    try {
      setIsSavingMeta(true)
      const res = await updateMediaItem(asset.id, {
        displayName: editName,
        category: editCategory,
      })
      onUpdated(res.asset)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update metadata.')
    } finally {
      setIsSavingMeta(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(`Permanently delete "${asset.display_name}" from Cloudflare R2?`)
    if (!confirmed) return

    try {
      setIsDeleting(true)
      setDeleteError(null)
      setDeleteReferences(null)
      await deleteMediaItem(asset.id)
      onDeleted()
    } catch (err: unknown) {
      const apiErr = err as Error & { status?: number; referencingRecords?: ReferenceMatch[] }
      if (apiErr.status === 409 && apiErr.referencingRecords) {
        setDeleteError(apiErr.message)
        setDeleteReferences(apiErr.referencingRecords)
      } else {
        setDeleteError(apiErr.message || 'Failed to delete asset.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AdminCard className="sticky top-6 p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-edge pb-3">
        <h3 className="text-sm font-semibold text-frost">Asset Inspector</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-mist hover:text-frost hover:bg-void"
          aria-label="Close inspector"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Preview image */}
      <div className="aspect-video w-full overflow-hidden rounded-lg border border-edge bg-void flex items-center justify-center">
        <img
          src={asset.url}
          alt={asset.display_name}
          className="h-full w-full object-contain"
          onError={(e) => {
            const img = e.currentTarget
            if (!img.src.includes('/media/')) {
              img.src = `/media/${asset.r2_key.replace(/^media\//, '')}`
            }
          }}
        />
      </div>

      {/* Public URL Box */}
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-mist mb-1">
          Public URL
        </label>
        <div className="flex items-center gap-1.5">
          <input
            readOnly
            value={asset.url}
            className={cn(inputClasses, 'font-mono text-xs py-1.5 flex-1')}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopyUrl}
            title="Copy URL"
          >
            {copiedUrl ? <CheckIcon className="h-3.5 w-3.5 text-accent" /> : <CopyIcon className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Technical details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-edge/60 bg-void/40 p-2">
          <span className="text-[10px] uppercase text-mist/70 block">Dimensions</span>
          <span className="font-mono text-frost">
            {asset.width && asset.height
              ? `${asset.width} × ${asset.height}`
              : 'Unknown'}
          </span>
        </div>
        <div className="rounded border border-edge/60 bg-void/40 p-2">
          <span className="text-[10px] uppercase text-mist/70 block">File Size</span>
          <span className="font-mono text-frost">{formatBytes(asset.bytes)}</span>
        </div>
        <div className="rounded border border-edge/60 bg-void/40 p-2">
          <span className="text-[10px] uppercase text-mist/70 block">Format</span>
          <span className="font-mono text-frost">{asset.mime_type}</span>
        </div>
        <div className="rounded border border-edge/60 bg-void/40 p-2">
          <span className="text-[10px] uppercase text-mist/70 block">R2 Key</span>
          <span className="font-mono text-[10px] text-frost truncate block" title={asset.r2_key}>
            {asset.r2_key}
          </span>
        </div>
      </div>

      {/* Edit form */}
      <div className="space-y-3 border-t border-edge pt-3">
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-mist mb-1">
            Display Name
          </label>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className={cn(inputClasses, 'text-xs')}
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium uppercase tracking-wider text-mist mb-1">
            Category
          </label>
          <AdminSelect
            value={editCategory}
            onChange={(val) => setEditCategory(val as MediaCategory)}
            options={[
              { value: 'project', label: 'Project' },
              { value: 'profile', label: 'Profile' },
              { value: 'certificate', label: 'Certificate' },
              { value: 'misc', label: 'Misc' },
            ]}
            ariaLabel="Edit Category"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={isSavingMeta}
          onClick={() => void handleSaveMeta()}
        >
          {isSavingMeta ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {/* Delete section */}
      <div className="border-t border-edge pt-3 space-y-2">
        {deleteError && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
            <p className="font-semibold">{deleteError}</p>
            {deleteReferences && deleteReferences.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-[11px] text-mist">Referenced by active content:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {deleteReferences.map((ref, i) => (
                    <li key={i} className="font-mono text-[10px]">
                      {ref.kind}:{ref.key} {ref.hasLiveRef ? '(live)' : ''} {ref.hasDraftRef ? '(draft)' : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center gap-2 border-danger/50 text-danger hover:bg-danger/10 hover:border-danger hover:text-danger"
          disabled={isDeleting}
          onClick={() => void handleDelete()}
        >
          <TrashIcon className="h-3.5 w-3.5" />
          {isDeleting ? 'Deleting from R2…' : 'Delete Asset'}
        </Button>
      </div>
    </AdminCard>
  )
}

export function MediaView() {
  const { refreshActivity } = useAdminData()

  const [assets, setAssets] = useState<MediaAsset[] | null>(null)
  const [stats, setStats] = useState<MediaStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const [categoryTab, setCategoryTab] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null)

  // Upload state
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>('project')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reloadData = useCallback(() => {
    setRefreshIndex((i) => i + 1)
  }, [])

  useEffect(() => {
    let active = true

    void Promise.all([
      listMedia({
        category: categoryTab !== 'all' ? categoryTab : undefined,
        search: searchQuery || undefined,
        limit: 100,
      }),
      getMediaStats(),
    ])
      .then(([listRes, statsRes]) => {
        if (!active) return
        setAssets(listRes.items)
        setStats(statsRes)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load media assets.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [categoryTab, searchQuery, refreshIndex])

  const handleUploadFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) =>
      /\.(webp|png|jpe?g|avif)$/i.test(f.name)
    )
    if (validFiles.length === 0) {
      setUploadError('Only WebP, PNG, JPEG, and AVIF images are supported.')
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)
      const res = await uploadMediaFiles(validFiles, uploadCategory)
      void refreshActivity()
      reloadData()
      if (res.uploaded.length > 0) {
        setSelectedAsset(res.uploaded[0])
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleUploadFiles(e.dataTransfer.files)
    }
  }

  const visibleAssets = useMemo(() => assets ?? [], [assets])

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Storage & Media</p>
          <h1 className="mt-1 text-2xl font-semibold text-frost">Media Library</h1>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            Cloudflare R2 storage (<span className="font-mono text-xs text-accent">media.alifaniani.ir</span>).
            Upload, inspect, categorize, and safely manage portfolio images.
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-3 rounded-lg border border-edge bg-void/60 px-4 py-2 font-mono text-xs text-mist">
            <div>
              <span className="text-frost font-semibold">{stats.totalAssets}</span> assets
            </div>
            <div className="h-3 w-px bg-edge" />
            <div>
              <span className="text-frost font-semibold">{formatBytes(stats.totalBytes)}</span> storage
            </div>
          </div>
        )}
      </header>

      {error && <AdminNotice kind="error">{error}</AdminNotice>}

      {/* Upload Zone */}
      <AdminCard className="p-4">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors',
            isDragging ? 'border-accent bg-accent/5' : 'border-edge hover:border-accent/40 bg-void/30'
          )}
        >
          <UploadCloudIcon className="h-10 w-10 text-mist/60 mb-2" />
          <p className="text-sm font-medium text-frost">
            Drag and drop images here, or browse files
          </p>
          <p className="mt-1 text-xs text-mist">
            WebP, PNG, JPEG, and AVIF supported (up to 10 MB per file)
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-mist">Target category:</span>
              <AdminSelect
                value={uploadCategory}
                onChange={(val) => setUploadCategory(val as MediaCategory)}
                options={[
                  { value: 'project', label: 'Projects' },
                  { value: 'profile', label: 'Profile' },
                  { value: 'certificate', label: 'Certificates' },
                  { value: 'misc', label: 'Misc' },
                ]}
                ariaLabel="Upload Target Category"
              />
            </div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? 'Uploading to R2…' : 'Select Files'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".webp,.png,.jpg,.jpeg,.avif,image/webp,image/png,image/jpeg,image/avif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void handleUploadFiles(e.target.files)
                }
              }}
            />
          </div>

          {uploadError && (
            <p className="mt-3 text-xs text-danger">{uploadError}</p>
          )}
        </div>
      </AdminCard>

      {/* Filter and Category Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5 border-b border-edge/60 pb-2 sm:border-0 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryTab(cat.id)
                if (cat.value) setUploadCategory(cat.value)
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                categoryTab === cat.id
                  ? 'bg-accent/20 text-accent border border-accent/40 font-semibold'
                  : 'text-mist hover:text-frost hover:bg-void/40'
              )}
            >
              {cat.label}
              {stats && cat.value && stats.byCategory[cat.value] !== undefined && (
                <span className="ml-1.5 text-[10px] opacity-70">
                  ({stats.byCategory[cat.value]})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative min-w-0 sm:w-64">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist/60" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files…"
            aria-label="Search media files"
            className={cn(inputClasses, 'pl-9 text-xs')}
          />
        </div>
      </div>

      {/* Grid and Inspector Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Grid */}
        <div className={cn(selectedAsset ? 'lg:col-span-2' : 'lg:col-span-3', 'space-y-4')}>
          {loading && !assets ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-36 rounded-lg" />
              ))}
            </div>
          ) : visibleAssets.length === 0 ? (
            <AdminEmpty
              title="No media assets found"
              description="Upload images above or select a different category filter."
              icon={<ImageIcon className="h-8 w-8" />}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {visibleAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelectedAsset(selectedAsset?.id === asset.id ? null : asset)}
                  aria-label={`Inspect ${asset.display_name}`}
                  className={cn(
                    'group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all',
                    selectedAsset?.id === asset.id
                      ? 'border-accent bg-accent/5 ring-1 ring-accent'
                      : 'border-edge hover:border-accent/50 bg-abyss/80'
                  )}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-void">
                    <img
                      src={asset.url}
                      alt={asset.display_name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        const img = e.currentTarget
                        if (!img.src.includes('/media/')) {
                          img.src = `/media/${asset.r2_key.replace(/^media\//, '')}`
                        }
                      }}
                    />
                    <div className="absolute top-1.5 right-1.5 rounded bg-abyss/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-frost backdrop-blur-sm">
                      {asset.category}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="truncate font-mono text-xs text-frost" title={asset.display_name}>
                      {asset.display_name}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-mist/60">
                      {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ''}
                      {formatBytes(asset.bytes)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inspector Panel */}
        {selectedAsset && (
          <div className="lg:col-span-1">
            <AssetInspector
              key={selectedAsset.id}
              asset={selectedAsset}
              onClose={() => setSelectedAsset(null)}
              onUpdated={(updated) => {
                setSelectedAsset(updated)
                setAssets((prev) =>
                  prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : null
                )
                void refreshActivity()
              }}
              onDeleted={() => {
                setSelectedAsset(null)
                void refreshActivity()
                reloadData()
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
