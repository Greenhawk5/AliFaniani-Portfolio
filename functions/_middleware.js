/**
 * Cloudflare Pages middleware (runs for every non-excluded request, before
 * static assets and other functions).
 *
 * 1. Redirects the default pages.dev subdomain to the production domain.
 * 2. Normalizes URLs: lowercases paths and strips trailing slashes
 *    (except the homepage) so each route has exactly one canonical form.
 * 3. Returns a real HTTP 404 for unknown routes — including unknown project
 *    slugs — instead of the SPA's index.html fallback (which previously made
 *    every URL return 200). The 404 response still serves the app shell so
 *    the client-side NotFound page renders for human visitors, and carries
 *    `X-Robots-Tag: noindex` as a crawl-safe signal.
 *
 * Valid routes and project slugs come from dist/_content_meta.json, which is
 * generated from the canonical content snapshot at build time
 * (scripts/generate-content-meta.mjs) — no hand-maintained lists remain.
 * The file is read via env.ASSETS and memoized per isolate.
 */

const STATIC_PREFIXES = ['/assets/', '/models/', '/draco/', '/icons/', '/fonts/', '/media/', '/api/']

const STATIC_FILES = new Set([
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.svg',
  '/og-image.webp',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/media-manifest.json',
  '/_content_meta.json',
])

/** Fallbacks used only if _content_meta.json cannot be loaded. */
const FALLBACK_ROUTES = ['/', '/about', '/projects', '/contact', '/room']

/** Per-isolate memo for the generated content meta. */
let contentMetaCache = null

async function loadContentMeta(env, url) {
  if (contentMetaCache) return contentMetaCache
  try {
    const res = await env.ASSETS.fetch(new URL('/_content_meta.json', url.origin).toString())
    if (res.status === 200) {
      contentMetaCache = await res.json()
      return contentMetaCache
    }
  } catch {
    // fall through to fallbacks
  }
  return null
}

function isStaticAsset(pathname) {
  return (
    pathname.includes('.') ||
    STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    STATIC_FILES.has(pathname)
  )
}

function redirect(url, pathname, status) {
  const target = new URL(url.origin)
  target.pathname = pathname
  target.search = url.search
  return Response.redirect(target.toString(), status)
}

/**
 * Private, unlisted routes. Served like valid routes (SPA) but ALWAYS with
 * `X-Robots-Tag: noindex`, and intentionally absent from _content_meta.json,
 * the sitemap, robots.txt, and all public metadata — the admin surface must
 * not be advertised or indexable.
 */
const PRIVATE_ROUTES = ['/admin']

function escapeAttr(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}

function setAttr(html, pattern, value) {
  return html.replace(pattern, `$1${escapeAttr(value)}$2`)
}

async function renderProjectEdgeShell(env, url, slug, project) {
  try {
    const baseRes = await env.ASSETS.fetch(new URL('/index.html', url.origin).toString())
    if (baseRes.status !== 200) return null
    let html = await baseRes.text()

    const title = `${project.title || slug} | Ali Faniani`
    const description = project.shortDescription || project.subtitle || project.overview || ''
    const canonical = `https://alifaniani.ir/projects/${slug}`
    const ogImage = project.banner
      ? (project.banner.startsWith('http') ? project.banner : `https://alifaniani.ir${project.banner}`)
      : 'https://alifaniani.ir/og-image.webp'

    html = setAttr(html, /(<title>)[^<]*(<\/title>)/, title)
    html = setAttr(html, /(<meta[^>]*name="description"[^>]*content=")[^"]*(")/, description)
    html = setAttr(html, /(<link rel="canonical" href=")[^"]*(")/, canonical)
    html = setAttr(html, /(<meta[^>]*property="og:url"[^>]*content=")[^"]*(")/, canonical)
    html = setAttr(html, /(<meta[^>]*property="og:title"[^>]*content=")[^"]*(")/, title)
    html = setAttr(html, /(<meta[^>]*property="og:description"[^>]*content=")[^"]*(")/, description)
    html = setAttr(html, /(<meta[^>]*property="og:image"[^>]*content=")[^"]*(")/, ogImage)
    html = setAttr(html, /(<meta[^>]*name="twitter:title"[^>]*content=")[^"]*(")/, title)
    html = setAttr(html, /(<meta[^>]*name="twitter:description"[^>]*content=")[^"]*(")/, description)
    html = setAttr(html, /(<meta[^>]*name="twitter:image"[^>]*content=")[^"]*(")/, ogImage)

    const headers = new Headers(baseRes.headers)
    headers.set('Content-Type', 'text/html; charset=utf-8')
    headers.set('Cache-Control', 'public, max-age=60, s-maxage=300')
    headers.set('X-Content-Source', 'd1-edge-shell')

    return new Response(html, { status: 200, headers })
  } catch {
    return null
  }
}

async function isValidRoute(pathname, env, url) {
  if (FALLBACK_ROUTES.includes(pathname)) return true
  const meta = await loadContentMeta(env, url)
  if (meta) {
    if (meta.staticRoutes.includes(pathname)) return true
    if (pathname.startsWith('/projects/')) {
      const slug = pathname.split('/')[2] ?? ''
      if (meta.projectSlugs.includes(slug)) return true

      // Fallback: check live D1 for newly published projects
      if (env.DB) {
        try {
          const row = await env.DB
            .prepare("SELECT 1 FROM content WHERE kind = 'project' AND key = ? AND state = 'published'")
            .bind(slug)
            .first()
          if (row) return true
        } catch {
          // ignore database query error and proceed to 404
        }
      }
      return false
    }
    return false
  }

  // Meta unavailable: check D1 if project route
  if (pathname.startsWith('/projects/')) {
    const slug = pathname.split('/')[2] ?? ''
    if (env.DB) {
      try {
        const row = await env.DB
          .prepare("SELECT 1 FROM content WHERE kind = 'project' AND key = ? AND state = 'published'")
          .bind(slug)
          .first()
        if (row) return true
      } catch {
        // ignore database query error
      }
    }
  }
  return false
}

export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const { pathname } = url

  // Keep the default pages.dev subdomain out of the index.
  if (url.hostname === 'alifaniani.pages.dev') {
    const target = new URL('https://alifaniani.ir')
    target.pathname = pathname
    target.search = url.search
    return Response.redirect(target.toString(), 301)
  }

  // /index.html is a duplicate of / — normalize it to the canonical root.
  if (pathname === '/index.html') {
    return redirect(url, '/', 308)
  }

  // Generated route shells (e.g. /room.html) exist only for the middleware —
  // normalize direct requests to their clean, canonical path.
  if (pathname.endsWith('.html')) {
    return redirect(url, pathname.slice(0, -5), 308)
  }

  // Static assets, hashed bundles, models, media and the API functions pass through.
  if (isStaticAsset(pathname)) {
    return context.next()
  }

  // One URL per route: lowercase + no trailing slash (except the homepage).
  if (pathname !== pathname.toLowerCase()) {
    return redirect(url, pathname.toLowerCase(), 308)
  }
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return redirect(url, pathname.replace(/\/+$/, '') || '/', 308)
  }

  // Private routes (e.g. /admin): serve the SPA with noindex — never 404,
  // never a generated shell, never in any public metadata.
  if (PRIVATE_ROUTES.includes(pathname)) {
    const response = await context.next()
    const headers = new Headers(response.headers)
    headers.set('X-Robots-Tag', 'noindex')
    headers.set('Cache-Control', 'no-store')
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }

  if (await isValidRoute(pathname, env, url)) {
    // 1. Serve pre-rendered static shell if present
    const shell = await env.ASSETS.fetch(new URL(pathname + '.html', url.origin).toString())
    if (shell.status === 200) return shell

    // 2. If project route without pre-rendered shell, dynamically generate edge shell from D1
    if (pathname.startsWith('/projects/') && env.DB) {
      const slug = pathname.split('/')[2] ?? ''
      try {
        const row = await env.DB
          .prepare("SELECT data FROM content WHERE kind = 'project' AND key = ? AND state = 'published'")
          .bind(slug)
          .first()
        if (row && row.data) {
          const project = JSON.parse(row.data)
          const edgeShell = await renderProjectEdgeShell(env, url, slug, project)
          if (edgeShell) return edgeShell
        }
      } catch {
        // ignore dynamic shell generation error and proceed to fallback
      }
    }

    return context.next()
  }

  // Unknown route → real 404 with the SPA shell attached so the app's
  // NotFound UI still renders. X-Robots-Tag keeps it out of search indexes
  // even if client-side metadata never runs.
  const shell = await env.ASSETS.fetch(new URL('/index.html', url.origin).toString())
  const headers = new Headers(shell.headers)
  headers.set('X-Robots-Tag', 'noindex')
  return new Response(shell.body, { status: 404, statusText: 'Not Found', headers })
}
