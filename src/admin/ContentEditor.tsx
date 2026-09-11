/**
 * Content editor (Phase 6A): structured forms for projects; JSON editing for
 * profile sections and links (their shapes are small and stable). Save ≠
 * publish — the API writes the draft overlay (published rows) or the working
 * copy (draft rows). Handles 409 conflicts with an explicit reload action.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { updateContent, archiveContent, type ContentListItem } from './contentApi'
import { Field, inputClasses, Notice, StateBadge } from './Field'
import { ProjectForm, type ProjectDraft } from './ProjectForm'

interface EditorProps {
  item: ContentListItem
  onSaved: () => void
  onCancel: () => void
}

/** Maps API failures to human-readable guidance without leaking internals. */
function describeError(err: Error & { status?: number }): string {
  switch (err.status) {
    case 401:
      return 'Your session has expired — reload the page and sign in again.'
    case 409:
      return 'This content changed since you opened it.'
    case 429:
      return 'Too many requests — wait a moment and try again.'
    case 500:
      return 'Server error while saving. Nothing was broken — try again.'
    default:
      return err.message || 'Saving failed.'
  }
}

export function ContentEditor({ item, onSaved, onCancel }: EditorProps) {
  const [text, setText] = useState<string | null>(null)
  const [liveText, setLiveText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([])
  const [savedAt, setSavedAt] = useState('')
  const [confirmingArchive, setConfirmingArchive] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const baselineRef = useRef<string | null>(null)
  const [baseline, setBaseline] = useState<string | null>(null)
  const [updatedAtRef, setUpdatedAtRef] = useState(item.updatedAt)

  useEffect(() => {
    let cancelled = false
    getText(item.kind, item.key)
      .then(({ content, live, updatedAt }) => {
        if (cancelled) return
        baselineRef.current = content
        setBaseline(content)
        setText(content)
        setLiveText(live)
        setUpdatedAtRef(updatedAt)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(describeError(e as Error & { status?: number }))
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [item.kind, item.key])

  const dirty = useMemo(() => text !== null && baseline !== null && text !== baseline, [text, baseline])

  const save = async () => {
    if (!text) return
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (e) {
      setError('Invalid JSON: ' + (e as Error).message)
      return
    }
    setSaving(true)
    setError('')
    setConflict(false)
    setIssues([])
    try {
      const result = await updateContent(item.kind, item.key, {
        data: parsed,
        ifUnmodifiedSince: updatedAtRef,
      })
      const serialized = JSON.stringify(parsed, null, 2)
      baselineRef.current = serialized
      setBaseline(serialized)
      setUpdatedAtRef(result.content.updatedAt)
      setSavedAt(result.content.updatedAt)
      onSaved()
    } catch (e) {
      const err = e as Error & { issues?: { path: string; message: string }[]; status?: number }
      setError(describeError(err))
      setIssues(err.issues ?? [])
      if (err.status === 409) setConflict(true)
    } finally {
      setSaving(false)
    }
  }

  const archive = async () => {
    setSaving(true)
    try {
      await archiveContent(item.kind, item.key)
      onSaved()
    } catch (e) {
      setError(describeError(e as Error & { status?: number }))
      setSaving(false)
      setConfirmingArchive(false)
    }
  }

  const reload = () => {
    setLoading(true)
    setError('')
    setConflict(false)
    setBaseline(null)
    baselineRef.current = null
    // Re-trigger the load effect by reloading the page section: simplest is
    // to re-run through the component key — here we just re-fetch inline.
    getText(item.kind, item.key)
      .then(({ content, live, updatedAt }) => {
        baselineRef.current = content
        setBaseline(content)
        setText(content)
        setLiveText(live)
        setUpdatedAtRef(updatedAt)
        setLoading(false)
      })
      .catch((e: Error) => {
        setError(describeError(e as Error & { status?: number }))
        setLoading(false)
      })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-5 w-5 text-accent" />
      </div>
    )
  }

  const isProject = item.kind === 'project'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            ← Back
          </Button>
          <h2 className="font-mono text-sm text-frost">{item.key}</h2>
          <StateBadge state={item.state} hasDraft={item.hasDraft || dirty} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {item.state === 'draft' && !confirmingDelete && (
            <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          )}
          {confirmingDelete && (
            <>
              <span className="text-xs text-danger" role="alert">
                Permanently delete this draft? This cannot be undone.
              </span>
              <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
                Keep
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirmingDelete(false)
                  void import('./contentApi').then(({ deleteContent }) =>
                    deleteContent(item.kind, item.key).then(onSaved).catch((e: Error & { status?: number }) => setError(describeError(e)))
                  )
                }}
              >
                Confirm delete
              </Button>
            </>
          )}
          {item.state !== 'archived' && !confirmingArchive && (
            <Button variant="outline" size="sm" onClick={() => setConfirmingArchive(true)}>
              Archive
            </Button>
          )}
          {confirmingArchive && (
            <>
              <span className="text-xs text-mist">
                Archive? Content stays in D1 but disappears from the public site after the next build.
              </span>
              <Button variant="outline" size="sm" onClick={() => setConfirmingArchive(false)}>
                Keep
              </Button>
              <Button size="sm" onClick={() => void archive()} disabled={saving}>
                Confirm archive
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? <Spinner className="h-4 w-4" /> : 'Save'}
          </Button>
        </div>
      </div>

      {item.state === 'published' && (
        <p className="rounded-lg border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-xs leading-relaxed text-cyan-200/90">
          This record is <strong>published</strong>. Saving stores your edits as a draft overlay — the live
          website keeps showing the current content until you publish (dashboard). Saving never publishes.
        </p>
      )}

      {error && <Notice kind="error">{error}</Notice>}
      {conflict && (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={reload}>
            Reload latest version
          </Button>
          <span className="text-xs text-mist">Your unsaved changes will be replaced.</span>
        </div>
      )}
      {issues.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {issues.map((issue, index) => (
            <li key={index}>
              <span className="font-mono">{issue.path || '(root)'}</span>: {issue.message}
            </li>
          ))}
        </ul>
      )}
      {savedAt && !dirty && !conflict && (
        <Notice kind="success">
          Saved as {item.state === 'published' ? 'draft overlay' : 'working copy'} at {savedAt}.
        </Notice>
      )}

      {text !== null && isProject && <ProjectJsonBridge text={text} onChange={setText} />}
      {text !== null && !isProject && (
        <Field label="Content (JSON)" hint="validated by the server on save">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            spellCheck={false}
            rows={Math.min(28, Math.max(10, text.split('\n').length + 1))}
            className={`${inputClasses} font-mono text-xs leading-relaxed`}
          />
        </Field>
      )}

      {liveText !== null && liveText !== text && (
        <details className="rounded-lg border border-edge bg-panel/40 p-3">
          <summary className="cursor-pointer text-xs text-mist">Currently live version (read-only)</summary>
          <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-mist/80">{liveText}</pre>
        </details>
      )}
    </div>
  )
}

/** Adapts the raw JSON text to the structured ProjectForm bidirectionally. */
function ProjectJsonBridge({ text, onChange }: { text: string; onChange: (next: string) => void }) {
  let parsed: ProjectDraft | null
  try {
    parsed = JSON.parse(text) as ProjectDraft
  } catch {
    parsed = null
  }
  if (!parsed || typeof parsed !== 'object' || !('slug' in parsed)) {
    return (
      <Field label="Content (JSON)" hint="invalid project JSON — fix to use the structured editor">
        <textarea
          value={text}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          rows={16}
          className={`${inputClasses} font-mono text-xs leading-relaxed`}
        />
      </Field>
    )
  }
  return (
    <ProjectForm
      value={parsed}
      onChange={(next) => onChange(JSON.stringify(next, null, 2))}
    />
  )
}

async function getText(kind: string, key: string): Promise<{ content: string; live: string | null; updatedAt: string }> {
  const { getContent } = await import('./contentApi')
  const { content } = await getContent(kind as never, key)
  return {
    content: JSON.stringify(content.data, null, 2),
    live: content.liveData ? JSON.stringify(content.liveData, null, 2) : null,
    updatedAt: content.updatedAt,
  }
}
