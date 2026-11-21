/**
 * Media Storage — Cloudflare R2 Bucket operations and D1 media_assets management.
 *
 * Implements:
 * 1. Magic-byte MIME sniffing for PNG, JPEG, WebP, AVIF
 * 2. Dimension sniffing for raster images
 * 3. Filename slugification and unique R2 key generation
 * 4. Atomic upload compensation (removes R2 object if D1 registration fails)
 * 5. Reference integrity checking (blocks deletion if referenced in content data/draft_data)
 * 6. Listing, stats, and metadata update operations
 */

export const PUBLIC_MEDIA_BASE_URL = 'https://media.alifaniani.ir'
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024 // 10MB per file

export type MediaCategory = 'project' | 'profile' | 'certificate' | 'misc'

export interface MediaAssetRow {
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

export interface MediaUploadResult {
  asset: MediaAssetRow
}

export interface SniffedMediaInfo {
  mimeType: 'image/webp' | 'image/png' | 'image/jpeg' | 'image/avif'
  extension: string
  width: number | null
  height: number | null
}

export interface ReferenceMatch {
  kind: string
  key: string
  hasLiveRef: boolean
  hasDraftRef: boolean
}

/**
 * Sniff magic bytes to ensure file is authentic PNG, JPEG, WebP, or AVIF.
 * Rejects SVGs, HTML, executables, or unknown binary payloads.
 */
export function sniffImageFormat(bytes: Uint8Array): SniffedMediaInfo {
  if (bytes.length < 16) {
    throw new Error('File payload is too small to be a valid image.')
  }

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    const dimensions = sniffPngDimensions(bytes)
    return {
      mimeType: 'image/png',
      extension: '.png',
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  // 2. JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    const dimensions = sniffJpegDimensions(bytes)
    return {
      mimeType: 'image/jpeg',
      extension: '.jpg',
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  // 3. WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    const dimensions = sniffWebpDimensions(bytes)
    return {
      mimeType: 'image/webp',
      extension: '.webp',
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  // 4. AVIF: ftypavif or ftypavis
  // Offset 4..7 is "ftyp", offset 8..11 is "avif" or "avis", or compatible brands contain "avif"
  if (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
    const ftypBoxLength = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]
    let isAvif = brand === 'avif' || brand === 'avis'

    if (!isAvif && ftypBoxLength > 16 && ftypBoxLength <= bytes.length) {
      // Check compatible brands
      for (let i = 16; i < ftypBoxLength; i += 4) {
        const comp = String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3])
        if (comp === 'avif' || comp === 'avis') {
          isAvif = true
          break
        }
      }
    }

    if (isAvif) {
      const dimensions = sniffAvifDimensions(bytes)
      return {
        mimeType: 'image/avif',
        extension: '.avif',
        width: dimensions.width,
        height: dimensions.height,
      }
    }
  }

  throw new Error('Unsupported or spoofed image format. Only WebP, PNG, JPEG, and AVIF images are permitted.')
}

function sniffPngDimensions(bytes: Uint8Array): { width: number | null; height: number | null } {
  try {
    if (bytes.length >= 24) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      const width = view.getUint32(16, false)
      const height = view.getUint32(20, false)
      return { width, height }
    }
  } catch {
    // fallback if unparseable
  }
  return { width: null, height: null }
}

function sniffWebpDimensions(bytes: Uint8Array): { width: number | null; height: number | null } {
  try {
    const chunkType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15])
    if (chunkType === 'VP8X' && bytes.length >= 30) {
      const width = 1 + ((bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) & 0xffffff)
      const height = 1 + ((bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) & 0xffffff)
      return { width, height }
    }
    if (chunkType === 'VP8 ' && bytes.length >= 30) {
      const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff
      const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff
      return { width, height }
    }
    if (chunkType === 'VP8L' && bytes.length >= 25) {
      const b0 = bytes[21]
      const b1 = bytes[22]
      const b2 = bytes[23]
      const b3 = bytes[24]
      const val = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)
      const width = 1 + (val & 0x3fff)
      const height = 1 + ((val >> 14) & 0x3fff)
      return { width, height }
    }
  } catch {
    // fallback if unparseable
  }
  return { width: null, height: null }
}

function sniffJpegDimensions(bytes: Uint8Array): { width: number | null; height: number | null } {
  try {
    let offset = 2
    const len = bytes.length
    while (offset < len) {
      if (bytes[offset] !== 0xff) {
        offset++
        continue
      }
      const marker = bytes[offset + 1]
      offset += 2
      if (marker === 0xd8 || marker === 0xd9 || marker === 0x00) continue
      if (marker >= 0xd0 && marker <= 0xd7) continue // RST markers

      if (offset + 2 > len) break
      const segmentLen = (bytes[offset] << 8) | bytes[offset + 1]

      // SOF0, SOF1, SOF2 markers hold image dimensions
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        if (offset + 7 <= len) {
          const height = (bytes[offset + 3] << 8) | bytes[offset + 4]
          const width = (bytes[offset + 5] << 8) | bytes[offset + 6]
          return { width, height }
        }
      }
      offset += segmentLen
    }
  } catch {
    // fallback if unparseable
  }
  return { width: null, height: null }
}

function sniffAvifDimensions(bytes: Uint8Array): { width: number | null; height: number | null } {
  try {
    // Scan for 'ispe' box in meta/iprp/ipco
    for (let i = 0; i < bytes.length - 12; i++) {
      if (
        bytes[i] === 0x69 &&
        bytes[i + 1] === 0x73 &&
        bytes[i + 2] === 0x70 &&
        bytes[i + 3] === 0x65
      ) {
        // 'ispe' found. Next 4 bytes: version & flags. Next 4: width. Next 4: height.
        if (i + 12 <= bytes.length) {
          const view = new DataView(bytes.buffer, bytes.byteOffset + i + 4, 8)
          const width = view.getUint32(0, false)
          const height = view.getUint32(4, false)
          return { width, height }
        }
      }
    }
  } catch {
    // fallback if unparseable
  }
  return { width: null, height: null }
}

export function slugifyFilename(name: string): string {
  const withoutExt = name.replace(/\.[^/.]+$/, '')
  return withoutExt
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file'
}

export function generateMediaId(): string {
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function generateR2Key(category: MediaCategory, slug: string, ext: string): string {
  const rand = generateMediaId().slice(0, 8)
  const timestamp = Date.now().toString(36)
  return `media/${category}/${timestamp}-${rand}-${slug}${ext}`
}

/**
 * Upload single media buffer to R2, extract dimensions, register in D1.
 * Compensates on D1 error by deleting the uploaded R2 object.
 */
export async function uploadMediaAsset(
  db: D1Database,
  bucket: R2Bucket,
  fileBytes: Uint8Array,
  rawName: string,
  category: MediaCategory,
  associatedKey?: string | null
): Promise<MediaAssetRow> {
  if (fileBytes.length > MAX_MEDIA_BYTES) {
    throw new Error(`File size (${(fileBytes.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed 10 MB limit.`)
  }

  const { mimeType, extension, width, height } = sniffImageFormat(fileBytes)
  const slug = slugifyFilename(rawName)
  const r2Key = generateR2Key(category, slug, extension)
  const url = `${PUBLIC_MEDIA_BASE_URL}/${r2Key}`
  const now = new Date().toISOString()
  const id = generateMediaId()

  // 1. Put to R2
  await bucket.put(r2Key, fileBytes, {
    httpMetadata: {
      contentType: mimeType,
      cacheControl: 'public, max-age=31536000, immutable',
    },
    customMetadata: {
      originalName: rawName,
      category,
      uploadedAt: now,
    },
  })

  // 2. Insert into D1 media_assets
  try {
    await db
      .prepare(
        `INSERT INTO media_assets (
          id, r2_key, url, original_name, display_name, mime_type, bytes,
          width, height, category, associated_key, state, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?)`
      )
      .bind(
        id,
        r2Key,
        url,
        rawName,
        rawName,
        mimeType,
        fileBytes.length,
        width,
        height,
        category,
        associatedKey ?? null,
        now,
        now
      )
      .run()

    return {
      id,
      r2_key: r2Key,
      url,
      original_name: rawName,
      display_name: rawName,
      mime_type: mimeType,
      bytes: fileBytes.length,
      width,
      height,
      category,
      associated_key: associatedKey ?? null,
      state: 'ready',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    }
  } catch (err) {
    // Atomic compensation: clean up R2 if D1 insertion failed
    try {
      await bucket.delete(r2Key)
    } catch {
      // ignore rollback failure
    }
    throw err
  }
}

/**
 * Check whether a media URL or R2 key is referenced anywhere in D1 content.
 */
export async function checkMediaReferences(
  db: D1Database,
  url: string,
  r2Key: string
): Promise<ReferenceMatch[]> {
  const urlPattern = `%${url}%`
  const keyPattern = `%${r2Key}%`

  const result = await db
    .prepare(
      `SELECT kind, key, data, draft_data FROM content
       WHERE data LIKE ? OR draft_data LIKE ? OR data LIKE ? OR draft_data LIKE ?`
    )
    .bind(urlPattern, urlPattern, keyPattern, keyPattern)
    .all<{ kind: string; key: string; data: string; draft_data: string | null }>()

  const matches: ReferenceMatch[] = []

  for (const row of result.results ?? []) {
    const hasLiveRef = Boolean(row.data && (row.data.includes(url) || row.data.includes(r2Key)))
    const hasDraftRef = Boolean(
      row.draft_data && (row.draft_data.includes(url) || row.draft_data.includes(r2Key))
    )
    if (hasLiveRef || hasDraftRef) {
      matches.push({
        kind: row.kind,
        key: row.key,
        hasLiveRef,
        hasDraftRef,
      })
    }
  }

  return matches
}

/**
 * Delete a media asset safely:
 * Returns { success: false, referencingRecords } if referenced.
 * Deletes from R2 and removes from D1 if unreferenced.
 */
export async function deleteMediaAsset(
  db: D1Database,
  bucket: R2Bucket,
  id: string
): Promise<{ success: boolean; referencingRecords?: ReferenceMatch[]; asset?: MediaAssetRow }> {
  const asset = await db
    .prepare(`SELECT * FROM media_assets WHERE id = ?`)
    .bind(id)
    .first<MediaAssetRow>()

  if (!asset) {
    return { success: false }
  }

  // 1. Reference check
  const refs = await checkMediaReferences(db, asset.url, asset.r2_key)
  if (refs.length > 0) {
    return {
      success: false,
      referencingRecords: refs,
      asset,
    }
  }

  // 2. Delete from R2
  await bucket.delete(asset.r2_key)

  // 3. Delete from D1
  await db.prepare(`DELETE FROM media_assets WHERE id = ?`).bind(id).run()

  return { success: true, asset }
}

/**
 * Update media asset metadata (display_name, category, associated_key).
 */
export async function updateMediaAsset(
  db: D1Database,
  id: string,
  patch: { displayName?: string; category?: MediaCategory; associatedKey?: string | null }
): Promise<MediaAssetRow | null> {
  const asset = await db
    .prepare(`SELECT * FROM media_assets WHERE id = ?`)
    .bind(id)
    .first<MediaAssetRow>()

  if (!asset) return null

  const displayName = patch.displayName?.trim() || asset.display_name
  const category = patch.category ?? asset.category
  const associatedKey = patch.associatedKey !== undefined ? patch.associatedKey : asset.associated_key
  const now = new Date().toISOString()

  await db
    .prepare(
      `UPDATE media_assets
       SET display_name = ?, category = ?, associated_key = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(displayName, category, associatedKey, now, id)
    .run()

  return {
    ...asset,
    display_name: displayName,
    category,
    associated_key: associatedKey,
    updated_at: now,
  }
}

/**
 * Query media assets with filtering, search, and pagination.
 */
export async function listMediaAssets(
  db: D1Database,
  options: {
    category?: string
    search?: string
    limit?: number
    offset?: number
  } = {}
): Promise<{ items: MediaAssetRow[]; total: number }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const offset = Math.max(options.offset ?? 0, 0)

  const whereClauses = ["state != 'deleted'"]
  const params: unknown[] = []

  if (options.category && options.category !== 'all') {
    whereClauses.push('category = ?')
    params.push(options.category)
  }

  if (options.search && options.search.trim()) {
    whereClauses.push('(display_name LIKE ? OR original_name LIKE ? OR associated_key LIKE ?)')
    const s = `%${options.search.trim()}%`
    params.push(s, s, s)
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const countQuery = `SELECT COUNT(*) as count FROM media_assets ${whereSql}`
  const countRes = await db
    .prepare(countQuery)
    .bind(...params)
    .first<{ count: number }>()
  const total = Number(countRes?.count ?? 0)

  const selectQuery = `SELECT * FROM media_assets ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  const itemsRes = await db
    .prepare(selectQuery)
    .bind(...params, limit, offset)
    .all<MediaAssetRow>()

  return {
    items: itemsRes.results ?? [],
    total,
  }
}

/**
 * Get aggregate media statistics.
 */
export async function getMediaStats(db: D1Database): Promise<{
  totalAssets: number
  totalBytes: number
  byCategory: Record<MediaCategory, number>
}> {
  const rows = await db
    .prepare(
      `SELECT category, COUNT(*) as count, SUM(bytes) as total_bytes
       FROM media_assets
       WHERE state != 'deleted'
       GROUP BY category`
    )
    .all<{ category: MediaCategory; count: number; total_bytes: number }>()

  let totalAssets = 0
  let totalBytes = 0
  const byCategory: Record<MediaCategory, number> = {
    project: 0,
    profile: 0,
    certificate: 0,
    misc: 0,
  }

  for (const r of rows.results ?? []) {
    const c = r.category as MediaCategory
    if (byCategory[c] !== undefined) {
      byCategory[c] = Number(r.count)
    }
    totalAssets += Number(r.count)
    totalBytes += Number(r.total_bytes || 0)
  }

  return {
    totalAssets,
    totalBytes,
    byCategory,
  }
}
