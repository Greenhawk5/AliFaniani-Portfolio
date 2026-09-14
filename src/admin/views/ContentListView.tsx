/**
 * Shared content-list experience for Projects / Profile / Links — search,
 * state filters, sorting, and the row → editor navigation. Kind-specific
 * presentation (project titles, section labels, link URLs) is injected via
 * `accessors`. All editor behavior lives in ContentEditor (workflows are
 * kind-agnostic at the API level).
 */

import { useMemo, useState } from 'react'
import { useAdminData } from '../AdminDataProvider'
import type { ContentListItem, ContentKind } from '../contentApi'
import { AdminCard, AdminEmpty, SkeletonRows, AdminNotice, relativeTime, absoluteTime } from '../ui/primitives'
import { StateBadge } from '../Field'
import { Button } from '@/components/ui/Button'
import { SearchIcon, PlusIcon, ImageIcon } from '../ui/icons'
import { inputClasses } from '../Field'
import { cn } from '@/lib/cn'

export type StateFilter = 'all' | 'published' | 'draft' | 'archived'

const FILTERS: { value: StateFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
]

export interface ListAccessors {
  /** Primary display title for a row. */
  title: (item: ContentListItem) => string
  /** Secondary line under the title. */
  subtitle?: (item: ContentListItem) => string | null
  /** Small preview image path, when the kind has one. */
  preview?: (item: ContentListItem) => string | null
  /** Sort key (defaults to updated date descending). */
  sortKey?: (item: ContentListItem) => string
  /** Explanation shown when this kind has no rows at all. */
  emptyHint: string
  /** Whether the "+ New" affordance applies to this kind. */
  canCreate: boolean
  createLabel?: string
}

export function ContentListView({
  kind,
  accessors,
  creating,
  onOpenNew,
  onOpen,
}: {
  kind: ContentKind
  accessors: ListAccessors
  creating?: React.ReactNode
  onOpenNew?: () => void
  /** Row activation — navigates to the kind editor (hash route). */
  onOpen: (item: ContentListItem) => void
}) {
  const { items, itemsError } = useAdminData()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StateFilter>('all')

  const rows = useMemo(() => {
    const all = (items ?? []).filter((i) => i.kind === kind)
    const q = query.trim().toLowerCase()
    const filtered = all
      .filter((i) => (filter === 'all' ? true : i.state === filter))
      .filter((i) => {
        if (!q) return true
        const haystack = `${i.key} ${accessors.title(i)} ${accessors.subtitle?.(i) ?? ''}`.toLowerCase()
        return haystack.includes(q)
      })
    const keyOf = accessors.sortKey ?? ((i: ContentListItem) => i.updatedAt)
    return filtered.sort((a, b) => keyOf(b).localeCompare(keyOf(a)))
  }, [items, kind, query, filter, accessors])

  const kindRows = useMemo(() => (items ?? []).filter((i) => i.kind === kind), [items, kind])

  const stateCount = (state: StateFilter) =>
    state === 'all' ? kindRows.length : kindRows.filter((i) => i.state === state).length

  if (itemsError) {
    return <AdminNotice kind="error">{itemsError}</AdminNotice>
  }

  if (items === null) {
    return (
      <div className="space-y-3">
        <ListToolbar query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} stateCount={stateCount} disabled />
        <SkeletonRows rows={6} />
      </div>
    )
  }

  if (kindRows.length === 0) {
    return (
      <>
        {creating}
        <AdminEmpty
          title="Nothing here yet"
          description={accessors.emptyHint}
          icon={<ImageIcon className="h-8 w-8" />}
          action={
            accessors.canCreate && onOpenNew ? (
              <Button size="sm" onClick={onOpenNew}>
                <PlusIcon className="h-3.5 w-3.5" /> {accessors.createLabel ?? 'Create'}
              </Button>
            ) : undefined
          }
        />
      </>
    )
  }

  return (
    <div className="space-y-3">
      {creating}
      <ListToolbar
        query={query}
        setQuery={setQuery}
        filter={filter}
        setFilter={setFilter}
        stateCount={stateCount}
        disabled={false}
        trailing={
          accessors.canCreate && onOpenNew ? (
            <Button size="sm" onClick={onOpenNew}>
              <PlusIcon className="h-3.5 w-3.5" /> {accessors.createLabel ?? 'New'}
            </Button>
          ) : undefined
        }
      />

      {rows.length === 0 ? (
        <AdminEmpty title="No matches" description="Try a different search term or filter." />
      ) : (
        <AdminCard className="overflow-hidden p-0">
          <ul className="divide-y divide-edge">
            {rows.map((item) => (
              <li key={`${item.kind}:${item.key}`}>
                <RowButton item={item} onClick={() => onOpen(item)}>
                  <RowContent item={item} accessors={accessors} />
                </RowButton>
              </li>
            ))}
          </ul>
        </AdminCard>
      )}

      <p className="text-xs text-mist/60" aria-live="polite">
        {rows.length} of {kindRows.length} shown
      </p>
    </div>
  )
}

function ListToolbar({
  query,
  setQuery,
  filter,
  setFilter,
  stateCount,
  disabled,
  trailing,
}: {
  query: string
  setQuery: (q: string) => void
  filter: StateFilter
  setFilter: (f: StateFilter) => void
  stateCount: (f: StateFilter) => number
  disabled: boolean
  trailing?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          aria-label="Search content"
          disabled={disabled}
          className={cn(inputClasses, 'pl-9')}
        />
      </div>
      <div role="tablist" aria-label="Filter by state" className="flex gap-1 rounded-xl border border-edge bg-panel/60 p-1">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            role="tab"
            aria-selected={filter === option.value}
            disabled={disabled}
            onClick={() => setFilter(option.value)}
            className={cn(
              'cursor-pointer rounded-lg px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors disabled:opacity-40',
              filter === option.value ? 'bg-accent/15 text-accent' : 'text-mist hover:text-frost'
            )}
          >
            {option.label}
            <span className="ml-1.5 text-mist/70">{stateCount(option.value)}</span>
          </button>
        ))}
      </div>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  )
}

function RowButton({ item, onClick, children }: { item: ContentListItem; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-panel-2/60"
      aria-label={`Open ${item.key}`}
    >
      {children}
    </button>
  )
}

function RowContent({
  item,
  accessors,
}: {
  item: ContentListItem
  accessors: ListAccessors
}) {
  const preview = accessors.preview?.(item) ?? null
  const title = accessors.title(item)
  const subtitle = accessors.subtitle?.(item) ?? null
  return (
    <>
      {preview && (
        <img
          src={preview}
          alt=""
          loading="lazy"
          className="h-10 w-16 shrink-0 rounded-md border border-edge object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-frost">{title}</p>
          <StateBadge state={item.state} hasDraft={item.hasDraft} />
        </div>
        {subtitle && <p className="truncate text-xs text-mist">{subtitle}</p>}
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="font-mono text-[10px] text-mist/70" title={absoluteTime(item.updatedAt)}>
          {relativeTime(item.updatedAt)}
        </p>
        <p className="font-mono text-[10px] text-mist/50">v{item.version}</p>
      </div>
    </>
  )
}
