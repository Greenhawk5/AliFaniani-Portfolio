/**
 * Content editor (v2 Control Center) — structured forms for projects and
 * links; JSON editing for profile sections (their shapes are small and
 * stable). Save ≠ publish — the API writes the draft overlay (published
 * rows) or the working copy (draft rows). Handles 409 conflicts with an
 * explicit reload action.
 *
 * Preserved workflows from Phase 6A: optimistic concurrency
 * (ifUnmodifiedSince), server Zod issue display, archive/delete
 * confirmation, live-version comparison, structured ProjectForm bridge.
 * New: sticky action bar, live dirty state, ⌘/Ctrl+S save, live JSON parse
 * feedback, structured LinkForm.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ChevronLeftIcon } from '@/components/ui/icons'
import { updateContent, archiveContent, deleteContent, discardDraft, getContent, type ContentListItem } from './contentApi'
import { Field, inputClasses, Notice, StateBadge } from './Field'
import { ProjectForm, type ProjectDraft } from './ProjectForm'
import { LinkForm, type LinkDraft } from './LinkForm'
import { AdminModal, AdminNotice, relativeTime, absoluteTime, toast } from './ui/primitives'
import { cn } from '@/lib/cn'

interface EditorProps {
  item: ContentListItem
  onSaved: () => void
  onClose: () => void
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

type Mode = 'form' | 'json'

export function ContentEditor({ item, onSaved, onClose }: EditorProps) {
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
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)
  const [mode, setMode] = useState<Mode>('form')
  const [showLiveDiff, setShowLiveDiff] = useState(false)
  const baselineRef = useRef<string | null>(null)
  const [baseline, setBaseline] = useState<string | null>(null)
  const [updatedAtRef, setUpdatedAtRef] = useState(item.updatedAt)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setConflict(false)
    try {
      const { content, live, updatedAt } = await getText(item.kind, item.key)
      baselineRef.current = content
      setBaseline(content)
      setText(content)
      setLiveText(live)
      setUpdatedAtRef(updatedAt)
      setLoading(false)
    } catch (e) {
      setError(describeError(e as Error & { status?: number }))
      setLoading(false)
    }
  }, [item.kind, item.key])

  useEffect(() => {
    let cancelled = false
    // Kick off async fetch; state updates land after the await (never
    // synchronously in the effect body).
    void Promise.resolve().then(() => {
      if (cancelled) return
      return load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const dirty = useMemo(() => text !== null && baseline !== null && text !== baseline, [text, baseline])

  const save = useCallback(async () => {
    if (!text || saving) return
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
      toast('success', item.state === 'published' ? 'Saved as draft overlay — live site unchanged.' : 'Saved.')
      onSaved()
    } catch (e) {
      const err = e as Error & { issues?: { path: string; message: string }[]; status?: number }
      setError(describeError(err))
      setIssues(err.issues ?? [])
      if (err.status === 409) setConflict(true)
    } finally {
      setSaving(false)
    }
  }, [text, saving, item.kind, item.key, item.state, updatedAtRef, onSaved])

  // ⌘/Ctrl+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty && !saving) void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, saving, save])

  const archive = async () => {
    setSaving(true)
    try {
      await archiveContent(item.kind, item.key)
      toast('success', 'Content archived — it disappears from the site after the next build.')
      onSaved()
    } catch (e) {
      setError(describeError(e as Error & { status?: number }))
      setSaving(false)
      setConfirmingArchive(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await deleteContent(item.kind, item.key)
      toast('success', 'Draft deleted.')
      onSaved()
    } catch (e) {
      setError(describeError(e as Error & { status?: number }))
      setSaving(false)
      setConfirmingDelete(false)
    }
  }

  const discard = async () => {
    setSaving(true)
    try {
      await discardDraft(item.kind, item.key)
      toast('success', 'Unpublished changes discarded — live content untouched.')
      onSaved()
      onClose()
    } catch (e) {
      setError(describeError(e as Error & { status?: number }))
      setSaving(false)
      setConfirmingDiscard(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-5 w-5 text-accent" />
      </div>
    )
  }

  const isProject = item.kind === 'project'
  const isLink = item.kind === 'link'

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-frost">{editorTitle(item, text, baseline)}</h1>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-mist">
              <StateBadge state={item.state} hasDraft={item.hasDraft || dirty} />
              <span className="font-mono text-[10px]">
                v{item.version} · updated {relativeTime(item.updatedAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div role="tablist" aria-label="Editor mode" className="flex gap-0.5 rounded-lg border border-edge bg-panel/60 p-0.5">
            <button
              role="tab"
              aria-selected={mode === 'form'}
              disabled={!isProject && !isLink}
              onClick={() => setMode('form')}
              className={cn(
                'cursor-pointer rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                mode === 'form' ? 'bg-accent/15 text-accent' : 'text-mist hover:text-frost'
              )}
            >
              Form
            </button>
            <button
              role="tab"
              aria-selected={mode === 'json'}
              onClick={() => setMode('json')}
              className={cn(
                'cursor-pointer rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors',
                mode === 'json' ? 'bg-accent/15 text-accent' : 'text-mist hover:text-frost'
              )}
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Contextual banners */}
      {item.state === 'published' && (
        <AdminNotice kind="info">
          This record is <strong>published</strong>. Saving stores your edits as a draft overlay — the live
          website keeps showing the current content until you publish. Saving never publishes.
        </AdminNotice>
      )}
      {item.state === 'archived' && (
        <AdminNotice kind="warning">
          This record is <strong>archived</strong> — invisible on the public site and excluded from builds.
          Edits are saved directly to the stored copy.
        </AdminNotice>
      )}

      {error && <Notice kind="error">{error}</Notice>}
      {conflict && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber/40 bg-amber/8 px-3.5 py-2.5">
          <span className="text-sm text-amber">This record changed since you opened it.</span>
          <Button variant="outline" size="sm" onClick={load}>
            Reload latest version
          </Button>
          <span className="text-xs text-mist">Your unsaved changes will be replaced.</span>
        </div>
      )}
      {issues.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-danger/30 bg-danger/6 px-3.5 py-2.5 text-xs text-danger">
          {issues.map((issue, index) => (
            <li key={index}>
              <span className="font-mono">{issue.path || '(root)'}</span>: {issue.message}
            </li>
          ))}
        </ul>
      )}
      {savedAt && !dirty && !conflict && (
        <Notice kind="success">
          Saved as {item.state === 'published' ? 'draft overlay' : 'working copy'} at {absoluteTime(savedAt)}.
        </Notice>
      )}

      {/* Editor body */}
      {text !== null && isProject && mode === 'form' && <ProjectJsonBridge text={text} onChange={setText} />}
      {text !== null && isLink && mode === 'form' && <LinkJsonBridge text={text} onChange={setText} />}
      {text !== null && (mode === 'json' || (!isProject && !isLink)) && (
        <Field label="Content (JSON)" hint="validated by the server on save">
          <JsonArea text={text} onChange={setText} />
        </Field>
      )}

      {/* Live version comparison */}
      {liveText !== null && liveText !== text && (
        <div className="rounded-xl border border-edge bg-panel/40">
          <button
            onClick={() => setShowLiveDiff(!showLiveDiff)}
            aria-expanded={showLiveDiff}
            className="flex w-full cursor-pointer items-center justify-between px-3.5 py-2.5 text-left text-xs text-mist transition-colors hover:text-frost"
          >
            Currently live version (read-only)
            <span aria-hidden className="font-mono text-[10px]">{showLiveDiff ? '−' : '+'}</span>
          </button>
          {showLiveDiff && (
            <pre className="overflow-x-auto border-t border-edge px-3.5 py-3 font-mono text-[11px] leading-relaxed text-mist/80">
              {liveText}
            </pre>
          )}
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-edge bg-void/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <p className="min-w-0 flex-1 text-xs" aria-live="polite">
            {dirty ? (
              <span className="font-medium text-amber">Unsaved changes</span>
            ) : savedAt ? (
              <span className="text-mist/70">All changes saved</span>
            ) : (
              <span className="text-mist/50">No changes yet</span>
            )}
          </p>
          {item.state === 'draft' && !confirmingDelete && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          )}
          {(item.hasDraft || dirty) && !confirmingDiscard && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDiscard(true)}>
              Discard changes
            </Button>
          )}
          {item.state !== 'archived' && !confirmingArchive && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmingArchive(true)}>
              Archive
            </Button>
          )}
          <Button size="sm" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? <Spinner className="h-4 w-4" /> : 'Save'}
            {!saving && <span className="ml-1.5 hidden font-mono text-[10px] opacity-60 sm:inline">Ctrl+S</span>}
          </Button>
        </div>
      </div>

      {/* Discard confirmation */}
      <AdminModal open={confirmingDiscard} onClose={() => setConfirmingDiscard(false)} title="Discard unpublished changes">
        <p className="text-sm leading-relaxed text-mist">
          Discard all unpublished changes to <span className="font-mono text-frost">{item.key}</span>? The
          record returns to its last published state. Live content is untouched.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmingDiscard(false)}>
            Keep changes
          </Button>
          <Button
            size="sm"
            className="border border-danger/50 bg-danger/10 text-danger hover:bg-danger/20"
            variant="outline"
            onClick={() => void discard()}
            disabled={saving}
          >
            {saving ? <Spinner className="h-4 w-4" /> : 'Discard changes'}
          </Button>
        </div>
      </AdminModal>

      {/* Archive confirmation */}
      <AdminModal open={confirmingArchive} onClose={() => setConfirmingArchive(false)} title="Archive content">
        <p className="text-sm leading-relaxed text-mist">
          Archive <span className="font-mono text-frost">{item.key}</span>? Content stays in the database but
          disappears from the public site after the next build.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmingArchive(false)}>
            Keep
          </Button>
          <Button size="sm" onClick={() => void archive()} disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : 'Archive'}
          </Button>
        </div>
      </AdminModal>

      {/* Delete confirmation */}
      <AdminModal open={confirmingDelete} onClose={() => setConfirmingDelete(false)} title="Delete draft">
        <p className="text-sm leading-relaxed text-mist">
          Permanently delete the draft <span className="font-mono text-frost">{item.key}</span>? This cannot
          be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
            Keep
          </Button>
          <Button
            size="sm"
            className="border border-danger/50 bg-danger/10 text-danger hover:bg-danger/20"
            variant="outline"
            onClick={() => void remove()}
            disabled={saving}
          >
            {saving ? <Spinner className="h-4 w-4" /> : 'Delete permanently'}
          </Button>
        </div>
      </AdminModal>
    </div>
  )
}

/** Derives a friendlier header title from the parsed content when available. */
function editorTitle(item: ContentListItem, text: string | null, baseline: string | null): string {
  const source = text ?? baseline
  if (source) {
    try {
      const parsed = JSON.parse(source) as { title?: string; label?: string; name?: string }
      const display = parsed.title ?? parsed.label ?? parsed.name
      if (display && typeof display === 'string') return display
    } catch {
      // fall through to key
    }
  }
  return item.key
}

function JsonArea({ text, onChange }: { text: string; onChange: (next: string) => void }) {
  const parseError = useMemo(() => {
    try {
      JSON.parse(text)
      return null
    } catch (e) {
      return (e as Error).message
    }
  }, [text])

  return (
    <div>
      <textarea
        value={text}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        rows={Math.min(32, Math.max(12, text.split('\n').length + 1))}
        className={cn(inputClasses, 'font-mono text-xs leading-relaxed', parseError && 'border-danger/60')}
        aria-invalid={!!parseError}
      />
      {parseError && (
        <p role="alert" className="mt-1 text-xs text-danger">
          Invalid JSON — {parseError}
        </p>
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
      <AdminNotice kind="warning" title="Structured editor unavailable">
        The JSON is invalid or missing a slug. Fix it in the JSON tab to bring back the form editor.
      </AdminNotice>
    )
  }
  return <ProjectForm value={parsed} onChange={(next) => onChange(JSON.stringify(next, null, 2))} />
}

function LinkJsonBridge({ text, onChange }: { text: string; onChange: (next: string) => void }) {
  let parsed: LinkDraft | null
  try {
    parsed = JSON.parse(text) as LinkDraft
  } catch {
    parsed = null
  }
  if (!parsed || typeof parsed !== 'object' || !('label' in parsed) || !('href' in parsed)) {
    return (
      <AdminNotice kind="warning" title="Structured editor unavailable">
        The JSON is invalid or missing label/href. Fix it in the JSON tab to bring back the form editor.
      </AdminNotice>
    )
  }
  return <LinkForm value={parsed} onChange={(next) => onChange(JSON.stringify(next, null, 2))} />
}

async function getText(kind: string, key: string): Promise<{ content: string; live: string | null; updatedAt: string }> {
  const { content } = await getContent(kind as never, key)
  return {
    content: JSON.stringify(content.data, null, 2),
    live: content.liveData ? JSON.stringify(content.liveData, null, 2) : null,
    updatedAt: content.updatedAt,
  }
}
