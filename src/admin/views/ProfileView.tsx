/**
 * Profile — the fixed set of About-page sections. Not creatable/archivable
 * via the dialog (server enforces the fixed key set); each row opens the
 * JSON editor with a per-section human label.
 */

import { useMemo } from 'react'
import { useAdminData } from '../AdminDataProvider'
import { ContentListView, type ListAccessors } from './ContentListView'
import { ContentEditor } from '../ContentEditor'
import type { ContentListItem } from '../contentApi'

/** Human labels for the fixed profile section keys. */
const SECTION_LABELS: Record<string, { title: string; hint: string }> = {
  hero: { title: 'Hero', hint: 'Name, role, intro, avatar' },
  about: { title: 'About', hint: 'Biography paragraphs' },
  focus: { title: 'Focus', hint: 'Current focus areas list' },
  education: { title: 'Education', hint: 'Degree, school, period' },
  skills: { title: 'Skills', hint: 'Grouped skills with levels' },
  technologies: { title: 'Technologies', hint: 'Technology chips' },
  certificates: { title: 'Certificates', hint: 'Certificate cards with images' },
  experience: { title: 'Experience', hint: 'Role history entries' },
}

export function ProfileView({
  param,
  navigate,
}: {
  param: string | null
  navigate: (view: 'profile', param?: string) => void
}) {
  const { items, refreshContent } = useAdminData()

  const accessors = useMemo<ListAccessors>(
    () => ({
      title: (item: ContentListItem) => SECTION_LABELS[item.key]?.title ?? item.key,
      subtitle: (item: ContentListItem) => SECTION_LABELS[item.key]?.hint ?? null,
      emptyHint: 'Profile sections are a fixed set — they should already exist.',
      canCreate: false,
    }),
    []
  )

  const selected = useMemo(() => {
    if (!param) return null
    return (items ?? []).find((i) => i.kind === 'profile-section' && i.key === param) ?? null
  }, [param, items])

  if (selected) {
    return (
      <ContentEditor item={selected} onSaved={() => void refreshContent()} onClose={() => navigate('profile')} />
    )
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Content</p>
        <h1 className="mt-1 text-2xl font-semibold text-frost">Profile sections</h1>
        <p className="mt-1 text-sm text-mist">
          The About page is built from these eight sections — a fixed set, edited in place.
        </p>
      </header>
      <ContentListView
        kind="profile-section"
        accessors={accessors}
        onOpen={(item) => navigate('profile', item.key)}
      />
    </div>
  )
}
