/**
 * /api/admin/media/[id] — Single Media Asset management endpoint.
 *
 * GET: Retrieve single asset metadata and reference status.
 * PUT/PATCH: Update display name, category, or associated key.
 * DELETE: Safe deletion checking references across published and draft content.
 */

import { z } from 'zod'
import type { AdminEnv } from '../../../lib/auth-env'
import {
  jsonResponse,
  unauthorizedResponse,
  badRequestResponse,
  notFoundResponse,
  clientIp,
} from '../../../lib/http'
import { requireSession, requireMutationAuth } from '../../../lib/session-auth'
import { logAuthEvent, requestCountry } from '../../../lib/auth-log'
import {
  deleteMediaAsset,
  updateMediaAsset,
  checkMediaReferences,
  type MediaAssetRow,
  type MediaCategory,
} from '../../../lib/media-store'

type Env = AdminEnv

const patchSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  category: z.enum(['project', 'profile', 'certificate', 'misc']).optional(),
  associatedKey: z.string().max(120).nullable().optional(),
})

export const onRequestGet: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const context = await requireSession(request, env.DB)
  if (!context) return unauthorizedResponse()

  const id = params.id as string
  const asset = await env.DB
    .prepare(`SELECT * FROM media_assets WHERE id = ?`)
    .bind(id)
    .first<MediaAssetRow>()

  if (!asset) return notFoundResponse('Media asset not found')

  const referencingRecords = await checkMediaReferences(env.DB, asset.url, asset.r2_key)

  return jsonResponse({
    asset,
    referencingRecords,
    isReferenced: referencingRecords.length > 0,
  })
}

export const onRequestPatch: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const context = await requireMutationAuth(request, env.DB)
  if (!context) return unauthorizedResponse()

  const id = params.id as string
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequestResponse('Invalid JSON payload')
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return badRequestResponse('Validation failed: ' + parsed.error.issues.map((i) => i.message).join(', '))
  }

  const updated = await updateMediaAsset(env.DB, id, {
    displayName: parsed.data.displayName,
    category: parsed.data.category as MediaCategory | undefined,
    associatedKey: parsed.data.associatedKey,
  })

  if (!updated) return notFoundResponse('Media asset not found')

  return jsonResponse({ asset: updated })
}

export const onRequestPut: PagesFunction<Env, 'id'> = onRequestPatch

export const onRequestDelete: PagesFunction<Env, 'id'> = async ({ request, env, params }) => {
  const context = await requireMutationAuth(request, env.DB)
  if (!context) return unauthorizedResponse()

  if (!env.MEDIA_BUCKET) {
    return jsonResponse(
      { error: 'Cloudflare R2 MEDIA_BUCKET binding is not configured in this environment.' },
      500
    )
  }

  const id = params.id as string
  const ip = clientIp(request)
  const country = requestCountry(request)

  const result = await deleteMediaAsset(env.DB, env.MEDIA_BUCKET, id)

  if (!result.success) {
    if (result.referencingRecords && result.referencingRecords.length > 0) {
      const refSummary = result.referencingRecords
        .map((r) => `${r.kind}:${r.key}${r.hasLiveRef ? ' (live)' : ''}${r.hasDraftRef ? ' (draft)' : ''}`)
        .join(', ')

      await logAuthEvent(env.DB, 'media_delete_rejected', {
        ip,
        country,
        ok: false,
        note: `${result.asset?.r2_key ?? id} referenced by [${refSummary}]`,
      })

      return jsonResponse(
        {
          error: 'Cannot delete media asset because it is currently referenced by content.',
          referencingRecords: result.referencingRecords,
        },
        409
      )
    }

    return notFoundResponse('Media asset not found')
  }

  await logAuthEvent(env.DB, 'media_deleted', {
    ip,
    country,
    ok: true,
    note: `${result.asset?.r2_key ?? id}`,
  })

  return jsonResponse({ ok: true, deleted: result.asset })
}
