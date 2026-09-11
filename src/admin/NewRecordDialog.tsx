/**
 * New-record dialog (Phase 6A): creates a draft project/link with sensible
 * starter payloads (profile sections are a fixed set — not creatable).
 * Server-side Zod validation remains authoritative; failures render inline.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createContent, type ContentKind } from './contentApi'
import { Field, inputClasses, Notice } from './Field'

const STARTER_PROJECT = {
  slug: '',
  title: '',
  subtitle: '',
  shortDescription: '',
  overview: '',
  category: '',
  year: new Date().getFullYear(),
  banner: '',
  screenshots: [{ src: '', caption: 'Screenshot' }],
  technologies: [''],
  techGroups: [{ label: 'Core', items: [''] }],
  features: [''],
  architecture: [''],
  repository: '',
}

const STARTER_LINK = { label: '', href: '' }

export function NewRecordDialog({ onCreated, onClose }: { onCreated: (kind: ContentKind, key: string) => void; onClose: () => void }) {
  const [kind, setKind] = useState<ContentKind>('project')
  const [key, setKey] = useState('')
  const [title, setTitle] = useState('')
  const [href, setHref] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([])

  const submit = async () => {
    setBusy(true)
    setError('')
    setIssues([])
    try {
      const data = kind === 'project' ? { ...STARTER_PROJECT, slug: key, title } : { ...STARTER_LINK, label: key, href }
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
    <div className="space-y-4 rounded-2xl border border-edge bg-panel/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-frost">New content</h3>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
          ×
        </Button>
      </div>

      <div className="flex gap-2" role="radiogroup" aria-label="Content type">
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
        <span className="self-center text-xs text-mist/60">profile sections are a fixed set — edit them from the list</span>
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {issues.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {issues.map((issue, index) => (
            <li key={index}>
              <span className="font-mono">{issue.path || '(root)'}</span>: {issue.message}
            </li>
          ))}
        </ul>
      )}

      {kind === 'project' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Slug" hint="e.g. my-new-app">
            <input value={key} onChange={(e) => setKey(e.target.value)} className={`${inputClasses} font-mono text-xs`} spellCheck={false} />
          </Field>
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClasses} />
          </Field>
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
        Created as a <strong>draft</strong> — invisible to the public site until you publish.
      </p>
      <Button size="sm" onClick={() => void submit()} disabled={busy || !key || (kind === 'link' ? !href : !title)}>
        {busy ? 'Creating…' : 'Create draft'}
      </Button>
    </div>
  )
}
