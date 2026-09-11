/**
 * CMS main view — dashboard + content lists + editor routing (Phase 4).
 * Deliberately simple: three kind sections, state badges, draft indicators.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { listContent, type ContentListItem, type ContentKind } from './contentApi'
import { ContentEditor } from './ContentEditor'
import { NewRecordDialog } from './NewRecordDialog'
import { PublishPanel } from './PublishPanel'
import { Notice, StateBadge } from './Field'

type Filter = 'all' | 'draft' | 'published' | 'archived'

export function CmsView() {
  const [items, setItems] = useState<ContentListItem[] | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<{ kind: ContentKind; key: string } | null>(null)
  const [creating, setCreating] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const { items: next } = await listContent()
      setItems(next)
      setError('')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    listContent()
      .then(({ items: next }) => {
        if (!cancelled) {
          setItems(next)
          setError('')
        }
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const all = items ?? []
    return {
      total: all.length,
      published: all.filter((i) => i.state === 'published').length,
      draft: all.filter((i) => i.state === 'draft').length,
      archived: all.filter((i) => i.state === 'archived').length,
      edited: all.filter((i) => i.hasDraft).length,
      lastUpdated: all.reduce<string | null>((latest, i) => (latest && latest > i.updatedAt ? latest : i.updatedAt), null),
    }
  }, [items])

  const visible = useMemo(() => {
    const all = items ?? []
    return filter === 'all' ? all : all.filter((i) => i.state === filter)
  }, [items, filter])

  if (selected) {
    const item = (items ?? []).find((i) => i.kind === selected.kind && i.key === selected.key)
    if (item) {
      return (
        <ContentEditor
          item={item}
          onSaved={() => void refresh()}
          onCancel={() => {
            setSelected(null)
            void refresh()
          }}
        />
      )
    }
  }

  const groups: { kind: ContentKind; title: string }[] = [
    { kind: 'project', title: 'Projects' },
    { kind: 'profile-section', title: 'Profile sections' },
    { kind: 'link', title: 'Links' },
  ]

  return (
    <div className="space-y-6">
      <PublishPanel draftCount={counts.edited} onPublished={refresh} />

      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-mist">Content</h2>
        {!creating && (
          <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
            + New
          </Button>
        )}
      </div>
      {creating && (
        <NewRecordDialog
          onClose={() => setCreating(false)}
          onCreated={(kind, key) => {
            setCreating(false)
            setSelected({ kind, key })
            void refresh()
          }}
        />
      )}
      {/* dashboard */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Records" value={counts.total} />
        <StatCard label="Published" value={counts.published} accent />
        <StatCard label="Drafts" value={counts.draft} />
        <StatCard label="Archived" value={counts.archived} />
        <StatCard label="Edited" value={counts.edited} accent />
      </section>

      {counts.lastUpdated && (
        <p className="text-xs text-mist/70">Last content change: {counts.lastUpdated}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'published', 'draft', 'archived'] as Filter[]).map((option) => (
          <Button
            key={option}
            size="sm"
            variant={filter === option ? 'primary' : 'outline'}
            onClick={() => setFilter(option)}
          >
            {option}
          </Button>
        ))}
      </div>

      {error && <Notice kind="error">{error}</Notice>}

      {items === null ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-5 w-5 text-accent" />
        </div>
      ) : (
        groups.map(({ kind, title }) => {
          const groupItems = visible.filter((i) => i.kind === kind)
          if (groupItems.length === 0) return null
          return (
            <section key={kind} className="space-y-2">
              <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-mist">{title}</h2>
              <ul className="divide-y divide-edge overflow-hidden rounded-xl border border-edge bg-panel/40">
                {groupItems.map((item) => (
                  <li key={`${item.kind}:${item.key}`}>
                    <button
                      onClick={() => setSelected({ kind: item.kind, key: item.key })}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-panel/80"
                    >
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-sm text-frost">{item.key}</span>
                        <StateBadge state={item.state} hasDraft={item.hasDraft} />
                      </span>
                      <span className="font-mono text-[10px] text-mist/60">v{item.version} · {item.updatedAt.slice(0, 10)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-edge bg-panel/40 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-mist/70">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent ? 'text-accent' : 'text-frost'}`}>{value}</p>
    </div>
  )
}
