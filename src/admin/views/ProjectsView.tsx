/**
 * Projects — content list + editor routing. `param` carries either the
 * record key (from #/projects/<key>) or 'new'. The list maps record keys to
 * display titles from the stored JSON once the editor fetches it; titles on
 * list rows come from a derived map (data.lastUpdated ordering is preserved).
 */

import { useMemo } from 'react'
import { useAdminData } from '../AdminDataProvider'
import { ContentListView, type ListAccessors } from './ContentListView'
import { ContentEditor } from '../ContentEditor'
import { NewRecordDialog } from '../NewRecordDialog'
import { AdminNotice } from '../ui/primitives'
import type { ContentListItem } from '../contentApi'

export function ProjectsView({
  param,
  navigate,
}: {
  param: string | null
  navigate: (view: 'projects', param?: string) => void
}) {
  const { items, refreshContent } = useAdminData()
  const creating = param === 'new'

  // Titles need the record payload, which the list API does not carry — the
  // key IS the slug, so slug doubles as the list title (matches the public
  // URL the content generates).
  const accessors = useMemo<ListAccessors>(
    () => ({
      title: (item: ContentListItem) => item.key,
      subtitle: (item: ContentListItem) =>
        item.state === 'published' ? `/projects/${item.key} — live` : item.hasDraft ? 'has unpublished edits' : null,
      emptyHint: 'Case studies live here. Create a draft, fill in the structured editor, then publish.',
      canCreate: true,
      createLabel: 'New project',
      sortKey: (item: ContentListItem) => (item.hasDraft ? item.draftUpdatedAt ?? item.updatedAt : item.updatedAt),
    }),
    []
  )

  const selected = useMemo(() => {
    if (!param || creating) return null
    return (items ?? []).find((i) => i.kind === 'project' && i.key === param) ?? null
  }, [param, creating, items])

  if (selected) {
    return (
      <ContentEditor
        item={selected}
        onSaved={() => void refreshContent()}
        onClose={() => navigate('projects')}
      />
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Content</p>
        <h1 className="mt-1 text-2xl font-semibold text-frost">Projects</h1>
      </header>
      {items !== null && (items ?? []).filter((i) => i.kind === 'project').length > 0 && !creating && (
        <AdminNotice kind="info">
          Rows open in the structured editor. Slug = public URL path; every save is a draft until you publish.
        </AdminNotice>
      )}
      <ContentListView
        kind="project"
        accessors={accessors}
        creating={creating ? <NewRecordDialogWrapper onDone={() => navigate('projects')} onCancel={() => navigate('projects')} /> : undefined}
        onOpenNew={() => navigate('projects', 'new')}
        onOpen={(item) => navigate('projects', item.key)}
      />
    </div>
  )
}

function NewRecordDialogWrapper({ onDone, onCancel }: { onDone: (kind: 'project' | 'link', key: string) => void; onCancel: () => void }) {
  return (
    <NewRecordDialog
      initialKind="project"
      onClose={onCancel}
      onCreated={(kind, key) => onDone(kind === 'link' ? 'link' : 'project', key)}
    />
  )
}
