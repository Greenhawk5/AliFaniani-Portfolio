/**
 * Admin Media API client — authenticated R2 media management.
 * Connects to /api/admin/media endpoints with CSRF protection and credentials.
 */

import { readCsrfToken } from './authApi'

export type MediaCategory = 'project' | 'profile' | 'certificate' | 'misc'

export interface MediaAsset {
  id: string
  r2_key: string
  url: string
  original_name: string
  display_name: string
  mime_type: string
  bytes: number
  width: number | null
  height: number | null
  category: MediaCategory
  associated_key: string | null
  state: 'ready' | 'deleting' | 'deleted'
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MediaStats {
  totalAssets: number
  totalBytes: number
  byCategory: Record<MediaCategory, number>
}

export interface ReferenceMatch {
  kind: string
  key: string
  hasLiveRef: boolean
  hasDraftRef: boolean
}

export interface MediaDeleteConflict {
  error: string
  referencingRecords: ReferenceMatch[]
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isMultipart = init.body instanceof FormData
  const headers: Record<string, string> = {
    ...(init.method && init.method !== 'GET' ? { 'X-CSRF-Token': readCsrfToken() } : {}),
  }

  if (!isMultipart && init.body && typeof init.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(path, {
    credentials: 'same-origin',
    ...init,
    headers: {
      ...headers,
      ...init.headers,
    },
  })

  const payload = (await response.json().catch(() => null)) as (T & {
    error?: string
    referencingRecords?: ReferenceMatch[]
  }) | null

  if (!response.ok) {
    const error = new Error(payload?.error ?? `Request failed (${response.status})`) as Error & {
      status?: number
      referencingRecords?: ReferenceMatch[]
    }
    error.status = response.status
    if (payload?.referencingRecords) {
      error.referencingRecords = payload.referencingRecords
    }
    throw error
  }

  return payload as T
}

export function listMedia(options: {
  category?: string
  search?: string
  limit?: number
  offset?: number
} = {}): Promise<{ items: MediaAsset[]; total: number }> {
  const params = new URLSearchParams()
  if (options.category && options.category !== 'all') params.set('category', options.category)
  if (options.search?.trim()) params.set('search', options.search.trim())
  if (options.limit) params.set('limit', String(options.limit))
  if (options.offset) params.set('offset', String(options.offset))

  const qs = params.toString()
  return request(`/api/admin/media${qs ? `?${qs}` : ''}`)
}

export function getMediaStats(): Promise<MediaStats> {
  return request('/api/admin/media/stats')
}

export function getMediaItem(id: string): Promise<{
  asset: MediaAsset
  referencingRecords: ReferenceMatch[]
  isReferenced: boolean
}> {
  return request(`/api/admin/media/${encodeURIComponent(id)}`)
}

export function uploadMediaFiles(
  files: File[],
  category: MediaCategory = 'project',
  associatedKey?: string
): Promise<{ uploaded: MediaAsset[] }> {
  const formData = new FormData()
  formData.append('category', category)
  if (associatedKey?.trim()) {
    formData.append('associatedKey', associatedKey.trim())
  }
  for (const file of files) {
    formData.append('file', file)
  }

  return request('/api/admin/media/upload', {
    method: 'POST',
    body: formData,
  })
}

export function updateMediaItem(
  id: string,
  patch: { displayName?: string; category?: MediaCategory; associatedKey?: string | null }
): Promise<{ asset: MediaAsset }> {
  return request(`/api/admin/media/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function deleteMediaItem(id: string): Promise<{ ok: boolean; deleted?: MediaAsset }> {
  return request(`/api/admin/media/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
