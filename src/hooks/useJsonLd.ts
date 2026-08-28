import { useEffect, useMemo } from 'react'

/**
 * Mounts a route-level JSON-LD block into <head> and removes it again on
 * unmount or route change, so SPA navigation never leaves stale or duplicate
 * structured data behind. Site-wide entities (Person, WebSite) live in the
 * static index.html; this hook is for page-level entities that reference
 * them by @id.
 */
export function useJsonLd(id: string, data: Record<string, unknown> | null) {
  const json = useMemo(() => (data ? JSON.stringify(data) : null), [data])

  useEffect(() => {
    if (!json) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.seoId = id
    script.textContent = json
    document.head.appendChild(script)
    return () => {
      script.remove()
    }
  }, [id, json])
}
