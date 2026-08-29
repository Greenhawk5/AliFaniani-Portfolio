// Temporary validation — raw initial HTML per route via the local runtime.
const BASE = 'http://127.0.0.1:8788'
const routes = [
  ['/', 'Ali Faniani — Software Developer', 'https://alifaniani.ir/'],
  ['/about', 'About Ali Faniani — Software Developer', 'https://alifaniani.ir/about'],
  ['/projects', 'Projects — Ali Faniani', 'https://alifaniani.ir/projects'],
  ['/projects/greenhawk-ai', 'GreenHawk AI — Ali Faniani', 'https://alifaniani.ir/projects/greenhawk-ai'],
  ['/projects/hawkbucks', 'HawkBucks — Ali Faniani', 'https://alifaniani.ir/projects/hawkbucks'],
  ['/projects/hawkbucks-bot', 'HawkBucks Bot — Ali Faniani', 'https://alifaniani.ir/projects/hawkbucks-bot'],
  ['/contact', 'Contact Ali Faniani — Software Developer', 'https://alifaniani.ir/contact'],
  ['/room', 'Interactive 3D Portfolio — Ali Faniani', 'https://alifaniani.ir/room'],
]

for (const [path, title, canonical] of routes) {
  const res = await fetch(BASE + path)
  const s = await res.text()
  const g = (re) => (s.match(re) || [])[1] ?? 'MISSING'
  const t = g(/<title>([^<]+)<\/title>/)
  const can = g(/rel="canonical" href="([^"]+)"/)
  const ogUrl = g(/property="og:url" content="([^"]+)"/)
  const ogTitle = g(/property="og:title" content="([^"]+)"/)
  const ogImg = g(/property="og:image" content="([^"]+)"/)
  const twImg = g(/name="twitter:image" content="([^"]+)"/)
  const h1 = (s.match(/<h1/g) || []).length
  const homeCan = s.includes('rel="canonical" href="https://alifaniani.ir/"')
  const ok =
    res.status === 200 &&
    t === title &&
    can === canonical &&
    ogUrl === canonical &&
    ogTitle === title &&
    h1 === 1 &&
    (path === '/' ? true : !homeCan)
  console.log(
    `${ok ? 'PASS' : 'FAIL'} ${path} | status=${res.status} | title="${t}" | canonical=${can} | og:url=${ogUrl} | og:title=${ogTitle} | h1=${h1} | og:image=${ogImg.replace('https://alifaniani.ir', '')} | tw:image=${twImg.replace('https://alifaniani.ir', '')}${path === '/' ? '' : ` | homeCanonicalLeak=${homeCan}`}`
  )
}

// 404 / noindex
for (const p of ['/anything-invalid', '/projects/not-a-real-project', '/hawkbucks']) {
  const res = await fetch(BASE + p)
  console.log(`${res.status} ${p} noindex=${res.headers.get('x-robots-tag')}`)
}

// Normalization
for (const p of ['/about/', '/room/', '/About', '/index.html', '/room.html']) {
  const res = await fetch(BASE + p, { redirect: 'manual' })
  console.log(`${res.status} ${p} -> ${res.headers.get('location')}`)
}
