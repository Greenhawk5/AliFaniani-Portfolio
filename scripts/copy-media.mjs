import { copyMediaToDist } from './generate-media-manifest.mjs'
import { resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await copyMediaToDist(resolve(root, 'dist'))
