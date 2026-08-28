// One-off image resizer — caps widths for the site's display sizes:
//   avatar 480px (displayed ≤224px), certificate 800px (≤~350px),
//   project images 1280px (≤~1000px). WebP quality 82.
// Usage: node scripts/resize-images.mjs
import sharp from 'sharp'
import { setTimeout as sleep } from 'node:timers'
import { statSync } from 'node:fs'

const TARGETS = [
  ['docs/profile/pic2.webp', 480],
  ['docs/project/GreenHawk AI/banner.webp', 1280],
  ['docs/project/HawkBucks - Bot/banner.webp', 1280],
  ['docs/project/HawkBucks - Web/hawkbucks-header.webp', 1280],
  ['docs/project/HawkBucks - Bot/no mission.webp', 1280],
]

for (const [file, width] of TARGETS) {
  const before = statSync(file).size
  const meta = await sharp(file).metadata()
  if (meta.width <= width) {
    console.log(`skip (already ≤ ${width}px): ${file}`)
    continue
  }
  const buffer = await sharp(file).resize({ width }).webp({ quality: 82 }).toBuffer()
  const tmp = file + '.tmp'
  const { writeFile } = await import('node:fs/promises')
  const { renameSync, rmSync } = await import('node:fs')
  await writeFile(tmp, buffer)
  // Windows AV/indexer locks fresh files briefly — retry delete+rename.
  for (let attempt = 0; ; attempt++) {
    try {
      renameSync(tmp, file)
      break
    } catch (e) {
      if (attempt >= 4) throw e
      try {
        rmSync(file, { force: true })
      } catch {
        /* still locked */
      }
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  const after = statSync(file).size
  console.log(
    `${meta.width}x${meta.height} → ${width}w | ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB | ${file}`
  )
}
