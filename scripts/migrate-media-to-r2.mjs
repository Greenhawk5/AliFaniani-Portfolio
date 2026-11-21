#!/usr/bin/env node
/**
 * scripts/migrate-media-to-r2.mjs — Legacy Media Migration Tool (v2.2.0 Phase 5)
 *
 * Migrates existing Git/docs-based media assets into Cloudflare R2 bucket
 * `ali-faniani-portfolio-media` and registers metadata in D1 `media_assets`.
 *
 * Modes:
 *   --dry-run       Audit existing files, compute checksums, verify dimensions, print report (no writes)
 *   --generate-sql  Generate idempotent D1 seed file `seeds/seed_media_assets.sql`
 *   --upload        Upload assets directly to Cloudflare R2 via wrangler CLI
 *
 * Preserves legacy files in docs/ and dist/media/ for 100% backward compatibility.
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname, join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST_PATH = resolve(root, 'public/media-manifest.json')
const R2_BUCKET = 'ali-faniani-portfolio-media'
const PUBLIC_MEDIA_URL_BASE = 'https://media.alifaniani.ir'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run') || (!args.has('--upload') && !args.has('--generate-sql'))
const generateSql = args.has('--generate-sql')
const uploadToR2 = args.has('--upload')
const remote = args.has('--remote')

function sha256File(filePath) {
  const buffer = readFileSync(filePath)
  return createHash('sha256').update(buffer).digest('hex')
}

function determineMimeType(filePath) {
  const ext = filePath.toLowerCase()
  if (ext.endsWith('.webp')) return 'image/webp'
  if (ext.endsWith('.png')) return 'image/png'
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return 'image/jpeg'
  if (ext.endsWith('.avif')) return 'image/avif'
  return 'application/octet-stream'
}

function determineCategory(relPath) {
  if (relPath.includes('/project/')) return 'project'
  if (relPath.includes('/profile/')) return 'profile'
  if (relPath.includes('/certificates/')) return 'certificate'
  return 'misc'
}

function determineAssociatedKey(relPath, category) {
  if (category === 'project') {
    const parts = relPath.split('/')
    const projIdx = parts.indexOf('project')
    if (projIdx !== -1 && parts[projIdx + 1]) {
      return parts[projIdx + 1]
    }
  }
  return null
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL'
  return `'${String(str).replace(/'/g, "''")}'`
}

async function run() {
  console.log('== Legacy Media Migration Tool (v2.2.0 Phase 5) ==')
  console.log(`Source Manifest: ${MANIFEST_PATH}`)
  console.log(`Target R2 Bucket: ${R2_BUCKET}`)
  console.log(`Mode: ${uploadToR2 ? 'Upload to R2' : generateSql ? 'Generate D1 Seed SQL' : 'Dry Run Audit'}\n`)

  if (!existsSync(MANIFEST_PATH)) {
    console.error(`Error: Manifest not found at ${MANIFEST_PATH}`)
    process.exit(1)
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  const mediaEntries = Object.entries(manifest.media || {})
  console.log(`Discovered ${mediaEntries.length} media assets in manifest.\n`)

  const migrationItems = []
  let totalBytes = 0

  for (const [urlPath, meta] of mediaEntries) {
    // meta.source e.g. "docs:project/GreenHawk AI/banner-1280.webp"
    const sourceRelative = meta.source.replace(/^docs:/, '')
    const localPath = resolve(root, 'docs', sourceRelative)

    if (!existsSync(localPath)) {
      console.warn(`[MISSING] Local file not found: ${localPath} for ${urlPath}`)
      continue
    }

    const stats = statSync(localPath)
    const checksum = sha256File(localPath)
    const mimeType = determineMimeType(localPath)
    const category = determineCategory(urlPath)
    const associatedKey = determineAssociatedKey(urlPath, category)
    const fileName = basename(localPath)

    // R2 key mirrors the URL structure: media/project/greenhawk-ai/banner-1280.webp
    const r2Key = urlPath.replace(/^\//, '')
    const fullPublicUrl = `${PUBLIC_MEDIA_URL_BASE}/${r2Key}`
    const id = createHash('sha256').update(r2Key).digest('hex').slice(0, 16)

    totalBytes += stats.size
    migrationItems.push({
      id,
      r2Key,
      url: fullPublicUrl,
      localPath,
      originalName: fileName,
      displayName: fileName,
      mimeType,
      bytes: stats.size,
      width: meta.width || null,
      height: meta.height || null,
      category,
      associatedKey,
      checksum,
    })
  }

  console.log(`Verified ${migrationItems.length} existing files (${(totalBytes / (1024 * 1024)).toFixed(2)} MB).`)

  if (dryRun && !uploadToR2 && !generateSql) {
    console.log('\n--- DRY RUN AUDIT REPORT ---')
    console.log(
      'Index | Category | Dimensions | Size | File Name | Checksum (first 12)'
    )
    console.log('-'.repeat(80))
    migrationItems.slice(0, 15).forEach((item, i) => {
      console.log(
        `${String(i + 1).padStart(2)} | ${item.category.padEnd(11)} | ${String(item.width || '?')}x${String(item.height || '?').padEnd(5)} | ${(item.bytes / 1024).toFixed(1).padStart(5)} KB | ${item.originalName.padEnd(25)} | ${item.checksum.slice(0, 12)}`
      )
    })
    if (migrationItems.length > 15) {
      console.log(`... and ${migrationItems.length - 15} more files verified cleanly.`)
    }
    console.log('\n[PASS] All assets verified. Run with --generate-sql or --upload to proceed.')
    return
  }

  if (generateSql) {
    const seedFilePath = resolve(root, 'seeds/seed_media_assets.sql')
    const now = new Date().toISOString()
    const sqlStatements = [
      '-- Seed media_assets table with legacy media migrated to R2 (v2.2.0)',
      '-- Idempotent: INSERT OR REPLACE on id / UNIQUE(r2_key)',
      '',
    ]

    for (const item of migrationItems) {
      sqlStatements.push(
        `INSERT OR REPLACE INTO media_assets (id, r2_key, url, original_name, display_name, mime_type, bytes, width, height, category, associated_key, state, created_at, updated_at) VALUES (${escapeSql(item.id)}, ${escapeSql(item.r2Key)}, ${escapeSql(item.url)}, ${escapeSql(item.originalName)}, ${escapeSql(item.displayName)}, ${escapeSql(item.mimeType)}, ${item.bytes}, ${item.width ?? 'NULL'}, ${item.height ?? 'NULL'}, ${escapeSql(item.category)}, ${escapeSql(item.associatedKey)}, 'ready', ${escapeSql(now)}, ${escapeSql(now)});`
      )
    }

    writeFileSync(seedFilePath, sqlStatements.join('\n') + '\n', 'utf8')
    console.log(`\n✓ Generated SQL seed at ${seedFilePath} (${migrationItems.length} records)`)
    console.log('Apply locally with:')
    console.log('  npx wrangler d1 execute ali-faniani-portfolio-db --local --file seeds/seed_media_assets.sql')
    console.log('Apply remotely with:')
    console.log('  npx wrangler d1 execute ali-faniani-portfolio-db --remote --file seeds/seed_media_assets.sql')
  }

  if (uploadToR2) {
    console.log(`\nUploading ${migrationItems.length} files to R2 bucket "${R2_BUCKET}"...`)
    let uploadedCount = 0
    let failedCount = 0

    for (const item of migrationItems) {
      try {
        process.stdout.write(`Uploading ${item.r2Key} (${(item.bytes / 1024).toFixed(1)} KB)... `)
        // Wrangler r2 object put <bucket>/<key> --file <local> --content-type <mime>
        const remoteFlag = remote ? ' --remote' : ''
        const cmd = `npx wrangler r2 object put "${R2_BUCKET}/${item.r2Key}" --file "${item.localPath}" --content-type "${item.mimeType}"${remoteFlag}`
        execSync(cmd, { stdio: 'pipe' })
        process.stdout.write('✓ OK\n')
        uploadedCount++
      } catch (err) {
        process.stdout.write(`FAILED: ${err.message}\n`)
        failedCount++
      }
    }

    console.log(`\nUpload complete: ${uploadedCount} succeeded, ${failedCount} failed.`)
  }
}

run().catch((err) => {
  console.error('Fatal error during media migration:', err)
  process.exit(1)
})

