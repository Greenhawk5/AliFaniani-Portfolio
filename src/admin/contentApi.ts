/**
 * Admin content API client — admin-chunk-only. Extends authApi patterns:
 * authenticated fetch, CSRF header for mutations, no localStorage.
 */

import { readCsrfToken } from './authApi'

export type ContentKind = 'project' | 'profile-section' | 'link'
export type ContentState = 'draft' | 'published' | 'archived'

export interface ContentListItem {
  kind: ContentKind
  key: string
  state: ContentState
  sortOrder: number
  version: number
  updatedAt: string
  publishedAt: string | null
  hasDraft: boolean
  draftUpdatedAt: string | null
}

export interface ContentItem extends ContentListItem {
  /** working copy — what the editor shows and saves */
  data: unknown
  /** currently-live content for published rows (null otherwise) */
  liveData: unknown | null
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.method && init.method !== 'GET' ? { 'X-CSRF-Token': readCsrfToken() } : {}),
      ...init.headers,
    },
  })
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null
  if (!response.ok) {
    const error = new Error(payload?.error ?? `Request failed (${response.status})`) as Error & {
      status?: number
      issues?: { path: string; message: string }[]
    }
    error.status = response.status
    throw error
  }
  return payload as T
}

export function listContent(): Promise<{ items: ContentListItem[] }> {
  return request('/api/admin/content')
}

export function getContent(kind: ContentKind, key: string): Promise<{ content: ContentItem }> {
  return request(`/api/admin/content/${kind}/${encodeURIComponent(key)}`)
}

export function createContent(input: {
  kind: ContentKind
  key: string
  data: unknown
  sortOrder?: number
}): Promise<{ content: { kind: ContentKind; key: string; state: ContentState } }> {
  return request('/api/admin/content', { method: 'POST', body: JSON.stringify(input) })
}

export function updateContent(
  kind: ContentKind,
  key: string,
  input: { data: unknown; sortOrder?: number; ifUnmodifiedSince?: string }
): Promise<{ content: { kind: ContentKind; key: string; state: ContentState; hasDraft: boolean; version: number; updatedAt: string } }> {
  return request(`/api/admin/content/${kind}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function archiveContent(kind: ContentKind, key: string): Promise<{ content: { state: ContentState } }> {
  return request(`/api/admin/content/${kind}/${encodeURIComponent(key)}`, { method: 'POST' })
}

/**
 * Discard unpublished changes — clears the draft overlay and returns the
 * record to its last published state. Live content is untouched by design
 * (the server never modifies `data` on this path).
 */
export function discardDraft(
  kind: ContentKind,
  key: string
): Promise<{ content: { state: ContentState; hasDraft: boolean; version: number; updatedAt: string } }> {
  return request(`/api/admin/content/${kind}/${encodeURIComponent(key)}`, {
    method: 'POST',
    body: JSON.stringify({ action: 'discard' }),
  })
}

export function deleteContent(kind: ContentKind, key: string): Promise<{ ok: boolean }> {
  return request(`/api/admin/content/${kind}/${encodeURIComponent(key)}`, { method: 'DELETE' })
}
