/**
 * Cloudflare Pages middleware (runs for every request, before static assets
 * and other functions).
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
 * ROUTES and PROJECT_SLUGS below must be kept in sync with
 * src/app/router.tsx and src/data/projects.ts.
 * `npm run build` regenerates public/sitemap.xml from src/data/projects.ts;
 * this list is the one manual copy that remains.
 */

const STATIC_PREFIXES = ['/assets/', '/models/', '/draco/', '/icons/', '/api/']

const STATIC_FILES = new Set([
  '/robots.txt',
  '/sitemap.xml',
  '/favicon.svg',
  '/og-image.webp',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
])

/** Valid SPA routes (without trailing slashes). */
const ROUTES = new Set(['/', '/about', '/projects', '/contact', '/room'])

/**
 * Route-specific HTML shells generated at build time
 * (scripts/generate-route-html.mjs) — served to crawlers/no-JS visitors so
 * the initial response carries route-correct title/canonical/OG metadata.
 * `/` uses index.html directly.
 */
const ROUTE_SHELLS = new Set([
  '/about',
  '/projects',
  '/contact',
  '/room',
  '/projects/greenhawk-ai',
  '/projects/hawkbucks',
  '/projects/hawkbucks-bot',
])

/** Valid project slugs — keep in sync with src/data/projects.ts. */
const PROJECT_SLUGS = new Set(['greenhawk-ai', 'hawkbucks', 'hawkbucks-bot'])

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

function isValidRoute(pathname) {
  if (ROUTES.has(pathname)) return true
  if (pathname.startsWith('/projects/')) {
    const slug = pathname.split('/')[2] ?? ''
    return PROJECT_SLUGS.has(slug)
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

  // Static assets, hashed bundles, models and the API functions pass through.
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

  if (isValidRoute(pathname)) {
    // Serve the route-specific generated shell (route-correct initial
    // <head>) when it exists; `/` and any missing shell fall back to the
    // standard SPA response.
    if (ROUTE_SHELLS.has(pathname)) {
      const shell = await env.ASSETS.fetch(new URL(pathname + '.html', url.origin).toString())
      if (shell.status === 200) return shell
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
