/**
 * Admin hash routing — the /admin surface is a single SPA page (middleware
 * PRIVATE_ROUTES, noindex). Sub-navigation lives in location.hash so no
 * public route, sitemap, or metadata ever changes. A tiny hook + nav model
 * keep the router dependency-free for this internal surface.
 */

import { useCallback, useEffect, useState } from 'react'

export type AdminView =
  | 'overview'
  | 'projects'
  | 'profile'
  | 'links'
  | 'media'
  | 'publishing'
  | 'seo'
  | 'activity'
  | 'integrations'
  | 'settings'

export const VIEWS: AdminView[] = [
  'overview',
  'projects',
  'profile',
  'links',
  'media',
  'publishing',
  'seo',
  'activity',
  'integrations',
  'settings',
]

function parseHash(hash: string): { view: AdminView; param: string | null } {
  const raw = hash.replace(/^#\/?/, '')
  const [first, second] = raw.split('/')
  if ((VIEWS as string[]).includes(first)) {
    return { view: first as AdminView, param: second ? decodeURIComponent(second) : null }
  }
  return { view: 'overview', param: null }
}

export function useAdminRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((view: AdminView, param?: string) => {
    window.location.hash = param ? `#/${view}/${encodeURIComponent(param)}` : `#/${view}`
  }, [])

  return { ...route, navigate }
}

/** Nav model: groups in display order. The shell renders this directly. */
export interface NavItem {
  view: AdminView
  label: string
  hint: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ view: 'overview', label: 'Dashboard', hint: 'Portfolio status at a glance' }],
  },
  {
    label: 'Content',
    items: [
      { view: 'projects', label: 'Projects', hint: 'Case studies and work' },
      { view: 'profile', label: 'Profile', hint: 'About page sections' },
      { view: 'links', label: 'Links', hint: 'Social and contact links' },
      { view: 'media', label: 'Media', hint: 'Library of built assets' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { view: 'publishing', label: 'Publishing', hint: 'Drafts, publish and deploy state' },
      { view: 'seo', label: 'SEO Center', hint: 'Indexing and metadata checks' },
      { view: 'activity', label: 'Activity', hint: 'Audit trail of admin events' },
      { view: 'integrations', label: 'Integrations', hint: 'Connected services' },
      { view: 'settings', label: 'Settings', hint: 'Session and build info' },
    ],
  },
]
