import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE } from '@/app/config'

interface DocumentMeta {
  /** Full document title, e.g. "About Ali Faniani — Software Developer". */
  title: string
  description: string
  /** Override the canonical path when it differs from the current location. */
  path?: string
  /** og:image / twitter:image. Absolute URL, or a site-root-relative path. */
  image?: string
  /** Set on 404s and invalid slugs so they are never indexed. */
  noindex?: boolean
}

/**
 * Canonical URL policy:
 * - HTTPS + apex domain (SITE.url)
 * - lowercase
 * - no trailing slash, except the homepage
 * - never includes query strings or hashes
 */
export function normalizePath(pathname: string): string {
  let path = pathname.split(/[?#]/)[0] ?? '/'
  path = path.toLowerCase()
  if (path.length > 1) path = path.replace(/\/+$/, '')
  return path === '' ? '/' : path
}

function toAbsolute(image: string): string {
  if (/^https?:\/\//i.test(image)) return image
  return `${SITE.url}${image.startsWith('/') ? image : `/${image}`}`
}

/** Updates an existing meta tag in place, creating it only if missing. */
function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/** Updates the single canonical link, or removes it when `href` is null. */
function setCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!href) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Route-level document metadata. Always updates the existing head tags in
 * place (never appends duplicates) so SPA navigation keeps a single,
 * consistent set of title/description/canonical/Open Graph/Twitter tags.
 */
export function useDocumentMeta({
  title,
  description,
  path,
  image = SITE.ogImageUrl,
  noindex = false,
}: DocumentMeta) {
  const { pathname } = useLocation()

  useEffect(() => {
    const normalized = normalizePath(path ?? pathname)
    const canonical = `${SITE.url}${normalized}`
    const imageUrl = toAbsolute(image)

    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:image', imageUrl)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', imageUrl)

    // 404s and invalid project slugs must never present themselves as
    // indexable pages — noindex them and drop any canonical signal.
    if (noindex) {
      setMeta('name', 'robots', 'noindex, follow')
      setCanonical(null)
    } else {
      document.head.querySelector('meta[name="robots"]')?.remove()
      setCanonical(canonical)
    }
  }, [title, description, path, pathname, image, noindex])
}

