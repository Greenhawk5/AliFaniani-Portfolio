import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { readdir, mkdir, copyFile } from 'node:fs/promises'
import { join, extname, dirname, resolve, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Generates the static media manifest + copies media into dist/media/.
 *
 * RUNS FIRST in the build pipeline (Guardrail A) — the D1 snapshot export
 * validates content media references against this manifest, so it must exist
 * before snapshot validation.
 *
 * Source of truth: docs/ (content images currently bundled via TS imports).
 * Stable URLs: every image gets a deterministic root-relative path under
 * /media/<area>/<name>.webp, decoupled from Vite's hashed asset names.
 *
 * Output:
 *   public/media-manifest.json — { generatedAt, media: { <path>: {width,height,bytes,source} } }
 *   (dist/media/ is populated during vite build via the /media copy below)
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const MEDIA_SOURCE_DIR = resolve(root, 'docs')
const OUTPUT_JSON = resolve(root, 'public', 'media-manifest.json')

/** Areas copied into dist/media/ during the build (public URLs). */
const COPY_AREAS = [
  { source: join(MEDIA_SOURCE_DIR, 'project'), urlBase: '/media/project' },
  { source: join(MEDIA_SOURCE_DIR, 'profile'), urlBase: '/media/profile' },
  { source: join(MEDIA_SOURCE_DIR, 'certificates'), urlBase: '/media/certificates' },
]

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.svg'])

/**
 * Directory-slug overrides where the docs/ folder name doesn't match the
 * CMS project slug. Keys are docs/ dir names, values are URL segments.
 */
const DIR_SLUG_OVERRIDES = {
  'GreenHawk AI': 'greenhawk-ai',
  'HawkBucks - Web': 'hawkbucks',
  'HawkBucks - Bot': 'hawkbucks-bot',
}

/** Slug for a directory inside docs/project/: overridden if listed, else slugified. */
function slugForProjectDir(dirName) {
  return DIR_SLUG_OVERRIDES[dirName] ?? slugifyFilename(dirName)
}

/** Basic dimensions for webp/png (enough for the manifest; browser re-measures). */
function sniffDimensions(buffer, ext) {
  try {
    if (ext === '.png') {
      return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
    }
    if (ext === '.webp') {
      // RIFF....WEBPVP8/VP8L/VP8X — parse the common lossy/lossless cases.
      const format = buffer.toString('ascii', 12, 16)
      if (format === 'VP8X') {
        // 24-bit little-endian canvas size minus 1, at offsets 24 and 27.
        const width = 1 + ((buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) & 0xffffff)
        const height = 1 + ((buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) & 0xffffff)
        return { width, height }
      }
      if (format === 'VP8 ') {
        return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff }
      }
      if (format === 'VP8L') {
        const b = buffer.readUInt32LE(21)
        return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }
      }
    }
  } catch {
    // fall through
  }
  return { width: null, height: null }
}

function slugifyFilename(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function collectFiles(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await collectFiles(full)))
    else out.push(full)
  }
  return out
}

const manifest = { generatedAt: new Date().toISOString(), media: {} }

for (const area of COPY_AREAS) {
  const files = await collectFiles(area.source)
  for (const file of files) {
    const ext = extname(file).toLowerCase()
    if (!IMAGE_EXTENSIONS.has(ext)) continue

    const relFromArea = file.slice(area.source.length + 1)
    const parsed = posix.parse(relFromArea.replaceAll('\\', '/'))
    // /media/project/<project-slug>/<file>.webp — directory segments under
    // docs/project/ use the CMS project slug (with overrides), other levels
    // slugify normally. Extension preserved.
    const segments = parsed.dir.split('/').filter(Boolean).map((segment) =>
      area.urlBase === '/media/project' && parsed.dir.split('/').filter(Boolean)[0] === segment
        ? slugForProjectDir(segment)
        : slugifyFilename(segment)
    )
    const urlPath = `${area.urlBase}/${posix.join(...segments, slugifyFilename(parsed.name))}${parsed.ext}`

    const stat = statSync(file)
    const buffer = readFileSync(file)
    const { width, height } = sniffDimensions(buffer, ext)

    manifest.media[urlPath] = {
      source: 'docs:' + area.urlBase.replace(/^\/media\//, '') + '/' + relFromArea.replaceAll('\\', '/'),
      // ↑ e.g. docs:project/GreenHawk AI/banner-1280.webp — full area-relative
      // path; directory names are preserved (not slugified) so this is a
      // unique, exact key back to the original file on disk.
      bytes: stat.size,
      width,
      height,
    }
  }
}

const count = Object.keys(manifest.media).length
if (count === 0) {
  throw new Error('Media manifest is empty — refusing to generate (check docs/ contents).')
}

writeFileSync(OUTPUT_JSON, JSON.stringify(manifest, null, 2) + '\n')
console.log(`✓ media manifest generated — ${count} entries (public/media-manifest.json)`)

/** Copy step, importable by the build script: populates dist/media/. */
export async function copyMediaToDist(distDir) {
  let copied = 0
  for (const area of COPY_AREAS) {
    const files = await collectFiles(area.source)
    for (const file of files) {
      const ext = extname(file).toLowerCase()
      if (!IMAGE_EXTENSIONS.has(ext)) continue
      const relFromArea = file.slice(area.source.length + 1)
      const parsed = posix.parse(relFromArea.replaceAll('\\', '/'))
      const segments = parsed.dir.split('/').filter(Boolean).map((segment) =>
        area.urlBase === '/media/project' && parsed.dir.split('/').filter(Boolean)[0] === segment
          ? slugForProjectDir(segment)
          : slugifyFilename(segment)
      )
      const urlPath = `${area.urlBase}/${posix.join(...segments, slugifyFilename(parsed.name))}${parsed.ext}`
      const dest = join(distDir, urlPath.replace(/^\//, ''))
      await mkdir(dirname(dest), { recursive: true })
      await copyFile(file, dest)
      copied++
    }
  }
  console.log(`✓ media copied to dist/media — ${copied} files`)
}
