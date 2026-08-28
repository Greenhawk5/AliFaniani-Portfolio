// Texture optimizer for GLB assets — converts/ downsizes embedded textures to
// WebP via a raw-RGBA round trip (avoids sharp colourspace conversion issues).
//
// Usage: node scripts/optimize-glb-textures.mjs <in.glb> <out.glb> [maxSize=1024]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  })

const [, , inPath, outPath, sizeArg] = process.argv
const maxSize = Number(sizeArg ?? 1024)

async function convertTexture(buffer) {
  const meta = await sharp(buffer).metadata()
  let pipe = sharp(buffer)
  if (Math.max(meta.width, meta.height) > maxSize) {
    const scale = maxSize / Math.max(meta.width, meta.height)
    pipe = pipe.resize(
      Math.max(1, Math.round(meta.width * scale)),
      Math.max(1, Math.round(meta.height * scale))
    )
  }
  const { data, info } = await pipe.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .webp({ quality: 85 })
    .toBuffer()
}

const doc = await io.read(inPath)
for (const texture of doc.getRoot().listTextures()) {
  const image = texture.getImage()
  if (!image) continue
  const mime = texture.getMimeType()
  const size = texture.getSize()
  try {
    const webp = await convertTexture(Buffer.from(image))
    if (webp.length < image.byteLength) {
      texture.setImage(webp).setMimeType('image/webp')
      console.log(
        `  tex ${size?.[0]}x${size?.[1]} ${mime}: ${Math.round(image.byteLength / 1024)}KB -> ${Math.round(webp.length / 1024)}KB webp`
      )
    } else {
      console.log(`  tex ${size?.[0]}x${size?.[1]} ${mime}: kept (webp not smaller)`)
    }
  } catch (e) {
    console.log(`  tex ${size?.[0]}x${size?.[1]} ${mime}: FAILED — ${e.message} (kept original)`)
  }
}
await io.write(outPath, doc)
console.log(`written: ${outPath}`)
