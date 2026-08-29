// Temporary validation — descriptions, twitter tags, JSON-LD, headers.
const BASE = 'http://127.0.0.1:8788'
const checks = [
  ['/room', 'Explore the interactive 3D developer room'],
  ['/about', 'About Ali Faniani — software developer focused on AI'],
  ['/projects/hawkbucks-bot', 'A Telegram automation system'],
  ['/contact', 'Contact Ali Faniani — Freelance'],
  ['/projects/greenhawk-ai', 'An AI-powered web application'],
]
for (const [p, descStart] of checks) {
  const s = await (await fetch(BASE + p)).text()
  const desc = (s.match(/name="description"[^>]*content="([^"]+)"/) || [])[1] ?? 'MISSING'
  const twTitle = (s.match(/name="twitter:title" content="([^"]+)"/) || [])[1] ?? 'MISSING'
  const twDesc = (s.match(/name="twitter:description"[^>]*content="([^"]+)"/) || [])[1] ?? 'MISSING'
  const jsonld = s.includes('application/ld+json')
  console.log(
    `${p} | desc-ok: ${desc.startsWith(descStart)} | tw-title: "${twTitle.slice(0, 28)}" | tw-desc-ok: ${twDesc.startsWith(descStart.slice(0, 20))} | jsonld: ${jsonld}`
  )
}
const res = await fetch(BASE + '/room', { method: 'HEAD' })
console.log('/room headers:')
for (const h of [
  'strict-transport-security',
  'content-security-policy',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'cache-control',
]) {
  console.log(`  ${h}: ${res.headers.get(h)}`)
}
const forHumans = [
  '/sitemap.xml',
  '/robots.txt',
  '/manifest.webmanifest',
  '/og-image.jpg',
  '/fonts/inter-latin-var.woff2',
]
for (const p of forHumans) {
  const r = await fetch(BASE + p)
  console.log(`${r.status} ${p} [${r.headers.get('content-type')?.split(';')[0]}]`)
}
