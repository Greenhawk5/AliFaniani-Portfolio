/**
 * /api/admin/media/upload — Multipart upload endpoint for R2 media assets.
 *
 * Accepts single or multiple files in multipart/form-data.
 * Requires active admin session + valid CSRF token.
 * Validates magic-byte signatures, calculates dimensions, stores in R2,
 * registers metadata in D1, and writes audit event.
 */

import type { AdminEnv } from '../../../lib/auth-env'
import { jsonResponse, unauthorizedResponse, badRequestResponse, clientIp } from '../../../lib/http'
import { requireMutationAuth } from '../../../lib/session-auth'
import { logAuthEvent, requestCountry } from '../../../lib/auth-log'
import {
  uploadMediaAsset,
  type MediaCategory,
  type MediaAssetRow,
} from '../../../lib/media-store'

type Env = AdminEnv

const VALID_CATEGORIES = new Set<MediaCategory>(['project', 'profile', 'certificate', 'misc'])

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const context = await requireMutationAuth(request, env.DB)
  if (!context) return unauthorizedResponse()

  if (!env.MEDIA_BUCKET) {
    return jsonResponse(
      { error: 'Cloudflare R2 MEDIA_BUCKET binding is not configured in this environment.' },
      500
    )
  }

  const ip = clientIp(request)
  const country = requestCountry(request)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (err) {
    return badRequestResponse('Malformed multipart/form-data body: ' + (err instanceof Error ? err.message : String(err)))
  }

  const rawCategory = (formData.get('category') as string | null) || 'project'
  const category: MediaCategory = VALID_CATEGORIES.has(rawCategory as MediaCategory)
    ? (rawCategory as MediaCategory)
    : 'project'

  const rawAssociatedKey = (formData.get('associatedKey') as string | null) || undefined
  const associatedKey = rawAssociatedKey?.trim() ? rawAssociatedKey.trim() : null

  // Collect all files from formData: supports 'file', 'files', or any File entries
  const files: File[] = []
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && (key === 'file' || key === 'files' || key.startsWith('file'))) {
      if (value.size > 0) {
        files.push(value)
      }
    }
  }

  if (files.length === 0) {
    return badRequestResponse('No file provided in upload request. Include at least one file under field "file".')
  }

  const uploaded: MediaAssetRow[] = []

  for (const file of files) {
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      const asset = await uploadMediaAsset(
        env.DB,
        env.MEDIA_BUCKET,
        bytes,
        file.name,
        category,
        associatedKey
      )

      uploaded.push(asset)

      await logAuthEvent(env.DB, 'media_uploaded', {
        ip,
        country,
        ok: true,
        note: `${asset.r2_key} (${asset.bytes} bytes, ${asset.width ?? '?'}x${asset.height ?? '?'})`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      await logAuthEvent(env.DB, 'media_upload_failed', {
        ip,
        country,
        ok: false,
        note: `${file.name} - ${errorMessage}`,
      })
      return badRequestResponse(errorMessage)
    }
  }

  return jsonResponse({ uploaded }, 201)
}
