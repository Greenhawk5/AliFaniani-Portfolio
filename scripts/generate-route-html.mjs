// Generates route-specific HTML files from the built index.html shell so
// crawlers that do not execute JavaScript (Bing Live Inspection, social
// crawlers) receive route-correct <title>/canonical/OG metadata.
//
// Metadata comes from src/data/route-meta.ts (loaded through Vite's SSR
// module runner), which itself derives project entries from
// src/data/projects.ts — the single source of truth shared with the runtime
// metadata system.
//
// Runs automatically after `vite build` (see the "build" script).
import { createServer } from 'vite'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Load the TS metadata map through Vite (handles the @ alias, image imports
// and import.meta.env without extra dependencies).
const vite = await createServer({
  configFile: false,
  root,
  logLevel: 'error',
  resolve: { alias: { '@': resolve(root, 'src') } },
  server: { middlewareMode: true },
  optimizeDeps: { noDiscovery: true },
})
const { ROUTE_META } = await vite.ssrLoadModule('/src/data/route-meta.ts')
await vite.close()

const shell = readFileSync(resolve(root, 'dist/index.html'), 'utf8')

function escapeAttr(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}

/** Replaces the content of the first matching attribute in the shell. */
function setAttr(html, pattern, value) {
  const next = html.replace(pattern, `$1${escapeAttr(value)}$2`)
  if (next === html) {
    throw new Error(`Pattern did not match while generating route HTML: ${pattern}`)
  }
  return next
}

function buildRouteHtml(pathname, meta) {
  const canonical = `https://alifaniani.ir${pathname}`
  let html = shell
  html = setAttr(html, /(<title>)[^<]*(<\/title>)/, meta.title)
  html = setAttr(html, /(<meta[^>]*name="description"[^>]*content=")[^"]*(")/, meta.description)
  html = setAttr(html, /(<link rel="canonical" href=")[^"]*(")/, canonical)
  html = setAttr(html, /(<meta[^>]*property="og:url"[^>]*content=")[^"]*(")/, canonical)
  html = setAttr(html, /(<meta[^>]*property="og:title"[^>]*content=")[^"]*(")/, meta.title)
  html = setAttr(
    html,
    /(<meta[^>]*property="og:description"[^>]*content=")[^"]*(")/,
    meta.description
  )
  html = setAttr(html, /(<meta[^>]*name="twitter:title"[^>]*content=")[^"]*(")/, meta.title)
  html = setAttr(
    html,
    /(<meta[^>]*name="twitter:description"[^>]*content=")[^"]*(")/,
    meta.description
  )
  return html
}

let count = 0
for (const [pathname, meta] of Object.entries(ROUTE_META)) {
  if (pathname === '/') continue // homepage uses dist/index.html as-is
  const html = buildRouteHtml(pathname, meta)
  const outFile = resolve(root, 'dist', pathname.replace(/^\//, '') + '.html')
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, html)
  count++
}
console.log(`✓ route HTML generated — ${count} files (+ dist/index.html for /)`)
