// Temporary audit script — reports GLB composition (textures, geometry, size).
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'meshopt.decoder': MeshoptDecoder,
    'meshopt.encoder': MeshoptEncoder,
  })
const root = 'public/models'

const files = []
for (const entry of readdirSync(root, { recursive: true })) {
  const p = join(root, entry)
  if (entry.endsWith('.glb')) files.push(p)
}

let total = 0
for (const file of files.sort()) {
  const kb = Math.round(statSync(file).size / 1024)
  total += statSync(file).size
  const doc = await io.read(file)
  const textures = doc.getRoot().listTextures().map((t) => {
    const size = t.getSize()
    return `${t.getMimeType().replace('image/', '')} ${size ? size[0] + 'x' + size[1] : '?'} (${Math.round((t.getImage()?.byteLength ?? 0) / 1024)}KB)`
  })
  let verts = 0
  let prims = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      verts += prim.listAttributes()[0]?.getCount() ?? 0
      prims++
    }
  }
  const anims = doc.getRoot().listAnimations().length
  console.log(
    `\n${file} — ${kb} KB | meshes: ${doc.getRoot().listMeshes().length} prims: ${prims} verts: ${verts} anims: ${anims}`
  )
  for (const t of textures) console.log(`   tex: ${t}`)
}
console.log(`\nTOTAL GLB payload: ${(total / 1024 / 1024).toFixed(2)} MB`)
