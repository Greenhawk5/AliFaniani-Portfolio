/**
 * New-record dialog (v2): creates a draft project/link with sensible starter
 * payloads (profile sections are a fixed set — not creatable). Server-side
 * Zod validation remains authoritative; failures render inline.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createContent, type ContentKind } from './contentApi'
import { Field, inputClasses } from './Field'
import { AdminModal } from './ui/primitives'

// A new project must satisfy the FULL canonical projectSchema even as a
// draft (server validation is schema-complete by design). Fields the owner
// hasn't provided yet get clearly-marked placeholder values they complete in
// the editor; repository is a real URL so it is requested up front.
const STARTER_PROJECT = {
  slug: '',
  title: '',
  subtitle: 'Coming soon',
  shortDescription: 'Project description coming soon.',
  overview: 'Project overview coming soon.',
  category: 'Uncategorized',
  year: new Date().getFullYear(),
  banner: '/media/profile/projects.webp', // neutral manifest asset; replace via MediaPicker
  screenshots: [{ src: '/media/profile/projects.webp', caption: 'Screenshot coming soon' }],
  technologies: ['TBD'],
  techGroups: [{ label: 'Core', items: ['TBD'] }],
  features: ['TBD'],
  architecture: ['TBD'],
  repository: '',
}

const STARTER_LINK = { label: '', href: '' }

export function NewRecordDialog({
  initialKind = 'project',
  onCreated,
  onClose,
}: {
  initialKind?: ContentKind
  onCreated: (kind: ContentKind, key: string) => void
  onClose: () => void
}) {
  const [kind, setKind] = useState<ContentKind>(initialKind)
  const [key, setKey] = useState('')
  const [title, setTitle] = useState('')
  const [repository, setRepository] = useState('')
  const [href, setHref] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([])

  const submit = async () => {
    setBusy(true)
    setError('')
    setIssues([])
    try {
      const data = kind === 'project' ? { ...STARTER_PROJECT, slug: key, title, repository } : { ...STARTER_LINK, label: key, href }
      await createContent({ kind, key, data })
      onCreated(kind, key)
    } catch (e) {
      const err = e as Error & { issues?: { path: string; message: string }[] }
      setError(err.message)
      setIssues(err.issues ?? [])
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminModal open onClose={onClose} title="New content">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Content type">
          {(['project', 'link'] as ContentKind[]).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={kind === option ? 'primary' : 'outline'}
              role="radio"
              aria-checked={kind === option}
              onClick={() => setKind(option)}
            >
              {option}
            </Button>
          ))}
          <span className="self-center text-xs text-mist/60">profile sections are a fixed set</span>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-danger/40 bg-danger/8 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {issues.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-danger/30 bg-danger/6 px-3 py-2 text-xs text-danger">
            {issues.map((issue, index) => (
              <li key={index}>
                <span className="font-mono">{issue.path || '(root)'}</span>: {issue.message}
              </li>
            ))}
          </ul>
        )}

        {kind === 'project' ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Slug" hint="e.g. my-new-app">
                <input value={key} onChange={(e) => setKey(e.target.value)} className={`${inputClasses} font-mono text-xs`} spellCheck={false} />
              </Field>
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} />
              </Field>
            </div>
            <Field label="Repository URL" hint="required — must be a valid URL">
              <input value={repository} onChange={(e) => setRepository(e.target.value)} className={inputClasses} placeholder="https://github.com/…" />
            </Field>
            <p className="text-xs text-mist/70">
              Placeholder values are filled in for the remaining fields — complete them in the editor after
              creation.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Label" hint="e.g. Mastodon">
              <input value={key} onChange={(e) => setKey(e.target.value)} className={inputClasses} />
            </Field>
            <Field label="URL" hint="https://… or mailto:">
              <input value={href} onChange={(e) => setHref(e.target.value)} className={inputClasses} />
            </Field>
          </div>
        )}

        <p className="text-xs text-mist/70">
          Created as a <strong className="text-amber">draft</strong> — invisible to the public site until you
          publish.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={busy || !key || (kind === 'link' ? !href : !title || !repository)}>
            {busy ? 'Creating…' : 'Create draft'}
          </Button>
        </div>
      </div>
    </AdminModal>
  )
}
