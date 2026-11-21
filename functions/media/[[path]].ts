/**
 * /media/[[path]] — Fallback & proxy route for R2-stored media assets.
 *
 * When an asset does not exist in the build-time static dist/media/ directory,
 * Cloudflare Pages invokes this function. If the object exists in env.MEDIA_BUCKET,
 * it streams the object with immutable caching headers.
 */

import type { PagesEnv } from '../lib/auth-env'

export const onRequestGet: PagesFunction<PagesEnv, 'path'> = async ({ env, params }) => {
  if (!env.MEDIA_BUCKET) {
    return new Response('Not Found', { status: 404 })
  }

  const rawPath = Array.isArray(params.path) ? params.path.join('/') : (params.path as string) || ''
  if (!rawPath) {
    return new Response('Not Found', { status: 404 })
  }

  // R2 keys are stored as "media/<category>/..."
  const r2Key = rawPath.startsWith('media/') ? rawPath : `media/${rawPath}`

  const object = await env.MEDIA_BUCKET.get(r2Key)
  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/webp')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  if (object.httpEtag) {
    headers.set('ETag', object.httpEtag)
  }

  return new Response(object.body, {
    status: 200,
    headers,
  })
}

