/**
 * Links — social/contact link management with the structured LinkForm
 * editor. New links open the redesigned creation dialog (#/links/new).
 */

import { useMemo } from 'react'
import { useAdminData } from '../AdminDataProvider'
import { ContentListView, type ListAccessors } from './ContentListView'
import { ContentEditor } from '../ContentEditor'
import { NewRecordDialog } from '../NewRecordDialog'
import type { ContentListItem } from '../contentApi'

export function LinksView({
  param,
  navigate,
}: {
  param: string | null
  navigate: (view: 'links', param?: string) => void
}) {
  const { items, refreshContent } = useAdminData()
  const creating = param === 'new'

  const accessors = useMemo<ListAccessors>(
    () => ({
      title: (item: ContentListItem) => item.key,
      subtitle: (item: ContentListItem) => {
        // href is available only when the row is open; on the list we show state hints.
        return item.hasDraft ? 'has unpublished edits' : null
      },
      emptyHint: 'Footer and contact links live here. Add GitHub, LinkedIn, email, and more.',
      canCreate: true,
      createLabel: 'Add link',
    }),
    []
  )

  const selected = useMemo(() => {
    if (!param || creating) return null
    return (items ?? []).find((i) => i.kind === 'link' && i.key === param) ?? null
  }, [param, creating, items])

  if (selected) {
    return <ContentEditor item={selected} onSaved={() => void refreshContent()} onClose={() => navigate('links')} />
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Content</p>
        <h1 className="mt-1 text-2xl font-semibold text-frost">Links</h1>
        <p className="mt-1 text-sm text-mist">Social and contact destinations rendered across the public site.</p>
      </header>
      <ContentListView
        kind="link"
        accessors={accessors}
        creating={creating ? <NewRecordDialog initialKind="link" onClose={() => navigate('links')} onCreated={() => navigate('links')} /> : undefined}
        onOpenNew={() => navigate('links', 'new')}
        onOpen={(item) => navigate('links', item.key)}
      />
    </div>
  )
}
