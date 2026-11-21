import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  FakeD1Database,
  FakeKV,
  FakeR2Bucket,
  makeEnv,
  makeContext,
  postJson,
  getRequest,
  interceptFetch,
  installFetchStub,
  clearInterceptors,
  turnstileHandler,
  type TestEnv,
} from './helpers'
import { onRequestPost as loginHandler } from '../functions/api/admin/login'
import { onRequestGet as listMediaHandler } from '../functions/api/admin/media/index'
import { onRequestPost as uploadMediaHandler } from '../functions/api/admin/media/upload'
import {
  onRequestGet as getSingleMediaHandler,
  onRequestPatch as patchMediaHandler,
  onRequestDelete as deleteMediaHandler,
} from '../functions/api/admin/media/[id]'
import { onRequestGet as getStatsHandler } from '../functions/api/admin/media/stats'
import { onRequestGet as mediaProxyHandler } from '../functions/media/[[path]]'
import { resetBurstLimiterForTests } from '../functions/lib/rate-limit'

function makeValidPng(width = 100, height = 50): Uint8Array {
  const bytes = new Uint8Array(33)
  // PNG signature
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
  // IHDR length
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8)
  // IHDR chunk type
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  // width (BE)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width, false)
  // height (BE)
  view.setUint32(20, height, false)
  // bit depth, color type, compression, filter, interlace
  bytes.set([0x08, 0x02, 0x00, 0x00, 0x00], 24)
  return bytes
}

function makeValidWebp(width = 120, height = 80): Uint8Array {
  const bytes = new Uint8Array(32)
  // RIFF
  bytes.set([0x52, 0x49, 0x46, 0x46], 0)
  // size
  bytes.set([0x18, 0x00, 0x00, 0x00], 4)
  // WEBP
  bytes.set([0x57, 0x45, 0x42, 0x50], 8)
  // VP8X
  bytes.set([0x56, 0x50, 0x38, 0x58], 12)
  // chunk size
  bytes.set([0x0a, 0x00, 0x00, 0x00], 16)
  // flags
  bytes.set([0x00, 0x00, 0x00, 0x00], 20)
  // 24-bit width - 1
  const w = width - 1
  bytes[24] = w & 0xff
  bytes[25] = (w >> 8) & 0xff
  bytes[26] = (w >> 16) & 0xff
  // 24-bit height - 1
  const h = height - 1
  bytes[27] = h & 0xff
  bytes[28] = (h >> 8) & 0xff
  bytes[29] = (h >> 16) & 0xff
  return bytes
}

function makeValidJpeg(width = 200, height = 150): Uint8Array {
  const bytes = new Uint8Array(20)
  bytes.set([0xff, 0xd8, 0xff], 0) // SOI + marker prefix
  bytes.set([0xc0], 3) // SOF0
  bytes.set([0x00, 0x11], 4) // length = 17
  bytes.set([0x08], 6) // precision
  bytes[7] = (height >> 8) & 0xff
  bytes[8] = height & 0xff
  bytes[9] = (width >> 8) & 0xff
  bytes[10] = width & 0xff
  bytes.set([0xff, 0xd9], 18) // EOI
  return bytes
}

describe('Admin Media Backend (v2.2.0 Phase 2)', () => {
  let db: FakeD1Database
  let kv: FakeKV
  let bucket: FakeR2Bucket
  let env: TestEnv

  let cookies: string
  let csrf: string
  let authHeaders: Record<string, string>

  beforeEach(async () => {
    resetBurstLimiterForTests()
    db = new FakeD1Database()
    kv = new FakeKV()
    bucket = new FakeR2Bucket()
    env = makeEnv(db, kv, { MEDIA_BUCKET: bucket as unknown as R2Bucket })
    installFetchStub()

    interceptFetch(turnstileHandler(true))
    const loginRes = await loginHandler(
      makeContext(postJson('/api/admin/login', { password: 'test-admin-password-correct', turnstileToken: 'tok' }), env)
    )
    cookies = loginRes.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
    csrf = ((await loginRes.json()) as { csrfToken: string }).csrfToken
    authHeaders = {
      Cookie: cookies,
      'X-CSRF-Token': csrf,
      'CF-Connecting-IP': '203.0.113.10',
    }
  })

  afterEach(() => {
    clearInterceptors()
    vi.unstubAllGlobals()
  })

  it('rejects unauthorized requests without session cookie', async () => {
    const req = new Request('https://alifaniani.ir/api/admin/media')
    const res = await (listMediaHandler as any)(makeContext(req, env))
    expect(res.status).toBe(401)
  })

  it('uploads valid PNG file, extracts dimensions, and records to R2 and D1', async () => {
    const pngBytes = makeValidPng(320, 240)
    const formData = new FormData()
    formData.append('file', new File([pngBytes], 'hero-banner.png', { type: 'image/png' }))
    formData.append('category', 'project')
    formData.append('associatedKey', 'greenhawk-ai')

    const req = new Request('https://alifaniani.ir/api/admin/media/upload', {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })

    const res = await (uploadMediaHandler as any)(makeContext(req, env))
    expect(res.status).toBe(201)

    const json = await res.json()
    expect(json.uploaded).toHaveLength(1)
    const asset = json.uploaded[0]

    expect(asset.original_name).toBe('hero-banner.png')
    expect(asset.mime_type).toBe('image/png')
    expect(asset.width).toBe(320)
    expect(asset.height).toBe(240)
    expect(asset.category).toBe('project')
    expect(asset.associated_key).toBe('greenhawk-ai')
    expect(asset.url).toMatch(/^https:\/\/media\.alifaniani\.ir\/media\/project\//)

    // Verify R2 storage
    const r2Obj = await bucket.get(asset.r2_key)
    expect(r2Obj).not.toBeNull()
    expect(r2Obj?.size).toBe(pngBytes.length)

    // Verify D1 row
    expect(db.mediaRows()).toHaveLength(1)
    expect(db.mediaRows()[0].id).toBe(asset.id)

    // Verify audit log
    const authLogs = db.authRows()
    expect(authLogs.some((l) => l.note?.includes('media_uploaded') && l.note.includes(asset.r2_key))).toBe(true)
  })

  it('uploads valid WebP and JPEG files with correct mime detection', async () => {
    const webpBytes = makeValidWebp(800, 600)
    const jpegBytes = makeValidJpeg(1024, 768)

    const formWebp = new FormData()
    formWebp.append('file', new File([webpBytes], 'screenshot.webp', { type: 'image/webp' }))
    formWebp.append('category', 'project')

    const resWebp = await (uploadMediaHandler as any)(
      makeContext(new Request('https://alifaniani.ir/api/admin/media/upload', { method: 'POST', headers: authHeaders, body: formWebp }), env)
    )
    expect(resWebp.status).toBe(201)
    const jsonWebp = await resWebp.json()
    expect(jsonWebp.uploaded[0].mime_type).toBe('image/webp')
    expect(jsonWebp.uploaded[0].width).toBe(800)
    expect(jsonWebp.uploaded[0].height).toBe(600)

    const formJpeg = new FormData()
    formJpeg.append('file', new File([jpegBytes], 'photo.jpg', { type: 'image/jpeg' }))
    formJpeg.append('category', 'profile')

    const resJpeg = await (uploadMediaHandler as any)(
      makeContext(new Request('https://alifaniani.ir/api/admin/media/upload', { method: 'POST', headers: authHeaders, body: formJpeg }), env)
    )
    expect(resJpeg.status).toBe(201)
    const jsonJpeg = await resJpeg.json()
    expect(jsonJpeg.uploaded[0].mime_type).toBe('image/jpeg')
    expect(jsonJpeg.uploaded[0].width).toBe(1024)
    expect(jsonJpeg.uploaded[0].height).toBe(768)
  })

  it('rejects spoofed file (HTML or script disguised as image)', async () => {
    const fakeImageBytes = new TextEncoder().encode('<script>alert("exploit")</script>')
    const formData = new FormData()
    formData.append('file', new File([fakeImageBytes], 'avatar.png', { type: 'image/png' }))

    const req = new Request('https://alifaniani.ir/api/admin/media/upload', {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })

    const res = await (uploadMediaHandler as any)(makeContext(req, env))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/Unsupported or spoofed image format/)

    // Ensure R2 is empty and failed event logged
    expect(bucket.objects.size).toBe(0)
    expect(db.mediaRows()).toHaveLength(0)
    expect(db.authRows().some((l) => l.note?.includes('media_upload_failed'))).toBe(true)
  })

  it('rejects SVG files for security', async () => {
    const svgBytes = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>')
    const formData = new FormData()
    formData.append('file', new File([svgBytes], 'vector.svg', { type: 'image/svg+xml' }))

    const req = new Request('https://alifaniani.ir/api/admin/media/upload', {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })

    const res = await (uploadMediaHandler as any)(makeContext(req, env))
    expect(res.status).toBe(400)
    expect(bucket.objects.size).toBe(0)
  })

  it('rejects files exceeding maximum size limit', async () => {
    const oversized = new Uint8Array(11 * 1024 * 1024)
    oversized.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0)
    const formData = new FormData()
    formData.append('file', new File([oversized], 'huge.png', { type: 'image/png' }))

    const req = new Request('https://alifaniani.ir/api/admin/media/upload', {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    })

    const res = await (uploadMediaHandler as any)(makeContext(req, env))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/exceeds maximum allowed 10 MB limit/)
  })

  it('lists media with category filtering and pagination', async () => {
    const categories: ('project' | 'profile' | 'certificate')[] = ['project', 'profile', 'certificate']
    for (const cat of categories) {
      const form = new FormData()
      form.append('file', new File([makeValidPng()], `${cat}-img.png`, { type: 'image/png' }))
      form.append('category', cat)
      await (uploadMediaHandler as any)(
        makeContext(new Request('https://alifaniani.ir/api/admin/media/upload', { method: 'POST', headers: authHeaders, body: form }), env)
      )
    }

    // List all
    const reqAll = getRequest('/api/admin/media', cookies)
    const resAll = await (listMediaHandler as any)(makeContext(reqAll, env))
    expect(resAll.status).toBe(200)
    const jsonAll = await resAll.json()
    expect(jsonAll.total).toBe(3)
    expect(jsonAll.items).toHaveLength(3)

    // Filter by project
    const reqProj = getRequest('/api/admin/media?category=project', cookies)
    const resProj = await (listMediaHandler as any)(makeContext(reqProj, env))
    const jsonProj = await resProj.json()
    expect(jsonProj.total).toBe(1)
    expect(jsonProj.items[0].category).toBe('project')

    // Stats endpoint
    const reqStats = getRequest('/api/admin/media/stats', cookies)
    const resStats = await (getStatsHandler as any)(makeContext(reqStats, env))
    const jsonStats = await resStats.json()
    expect(jsonStats.totalAssets).toBe(3)
    expect(jsonStats.byCategory.project).toBe(1)
    expect(jsonStats.byCategory.profile).toBe(1)
    expect(jsonStats.byCategory.certificate).toBe(1)
  })

  it('updates display_name and category via PATCH /api/admin/media/:id', async () => {
    const form = new FormData()
    form.append('file', new File([makeValidPng()], 'original.png', { type: 'image/png' }))
    const uploadRes = await (uploadMediaHandler as any)(
      makeContext(new Request('https://alifaniani.ir/api/admin/media/upload', { method: 'POST', headers: authHeaders, body: form }), env)
    )
    const { uploaded } = await uploadRes.json()
    const id = uploaded[0].id

    const patchReq = postJson(
      `/api/admin/media/${id}`,
      { displayName: 'Renamed Banner', category: 'certificate', associatedKey: 'cert-123' },
      authHeaders
    )
    const patchRes = await (patchMediaHandler as any)(
      makeContext({ request: patchReq, env, params: { id } })
    )
    expect(patchRes.status).toBe(200)

    const { asset } = await patchRes.json()
    expect(asset.display_name).toBe('Renamed Banner')
    expect(asset.category).toBe('certificate')
    expect(asset.associated_key).toBe('cert-123')
  })

  it('blocks deletion with 409 Conflict when media is referenced by content', async () => {
    const form = new FormData()
    form.append('file', new File([makeValidPng()], 'referenced.png', { type: 'image/png' }))
    const uploadRes = await (uploadMediaHandler as any)(
      makeContext(new Request('https://alifaniani.ir/api/admin/media/upload', { method: 'POST', headers: authHeaders, body: form }), env)
    )
    const { uploaded } = await uploadRes.json()
    const asset = uploaded[0]

    // Create a project in D1 that references this media URL
    const projectContent = JSON.stringify({
      slug: 'my-project',
      title: 'My Project',
      banner: asset.url,
    })
    await db
      .prepare(
        `INSERT INTO content (id, kind, key, data, sort_order, state, created_at, updated_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        'project:my-project',
        'project',
        'my-project',
        projectContent,
        1,
        'published',
        '2026-01-01',
        '2026-01-01',
        '2026-01-01'
      )
      .run()

    // Attempt to delete
    const deleteReq = new Request(`https://alifaniani.ir/api/admin/media/${asset.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    const deleteRes = await (deleteMediaHandler as any)(
      makeContext({ request: deleteReq, env, params: { id: asset.id } })
    )
    expect(deleteRes.status).toBe(409)

    const errorJson = await deleteRes.json()
    expect(errorJson.error).toMatch(/referenced by content/)
    expect(errorJson.referencingRecords).toHaveLength(1)
    expect(errorJson.referencingRecords[0].key).toBe('my-project')
    expect(errorJson.referencingRecords[0].hasLiveRef).toBe(true)

    // Verify asset still exists in R2 and D1
    expect(bucket.objects.has(asset.r2_key)).toBe(true)
    expect(db.mediaRows().some((r) => r.id === asset.id)).toBe(true)

    // Verify audit log rejected
    expect(db.authRows().some((l) => l.note?.includes('media_delete_rejected'))).toBe(true)
  })

  it('successfully deletes unreferenced media from both R2 and D1', async () => {
    const form = new FormData()
    form.append('file', new File([makeValidPng()], 'unreferenced.png', { type: 'image/png' }))
    const uploadRes = await (uploadMediaHandler as any)(
      makeContext(new Request('https://alifaniani.ir/api/admin/media/upload', { method: 'POST', headers: authHeaders, body: form }), env)
    )
    const { uploaded } = await uploadRes.json()
    const asset = uploaded[0]

    const deleteReq = new Request(`https://alifaniani.ir/api/admin/media/${asset.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    const deleteRes = await (deleteMediaHandler as any)(
      makeContext({ request: deleteReq, env, params: { id: asset.id } })
    )
    expect(deleteRes.status).toBe(200)

    // Verify removed from R2 and D1
    expect(bucket.objects.has(asset.r2_key)).toBe(false)
    expect(db.mediaRows().some((r) => r.id === asset.id)).toBe(false)

    // Verify audit log
    expect(db.authRows().some((l) => l.note?.includes('media_deleted') && l.note.includes(asset.r2_key))).toBe(true)
  })

  it('serves media through fallback proxy route /media/[[path]]', async () => {
    const png = makeValidPng(150, 100)
    await bucket.put('media/project/test-preview.png', png, {
      httpMetadata: { contentType: 'image/png' },
    })

    const req = new Request('https://alifaniani.ir/media/project/test-preview.png')
    const res = await (mediaProxyHandler as any)(
      makeContext({ request: req, env, params: { path: ['project', 'test-preview.png'] } })
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/png')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
  })
})
