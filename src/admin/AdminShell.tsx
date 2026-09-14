/**
 * Admin shell — grouped sidebar navigation, topbar with session expiry and
 * global actions, mobile drawer. Renders the active view passed by AdminApp.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { Button } from '@/components/ui/Button'
import {
  ExternalLinkIcon,
  CloseIcon,
  MenuIcon,
} from '@/components/ui/icons'
import {
  LayoutIcon,
  FolderIcon,
  UserIcon,
  LinkIcon,
  ImageIcon,
  RocketIcon,
  SearchIcon,
  ActivityIcon,
  PlugIcon,
  PanelLeftIcon,
} from './ui/icons'
import { GearIcon } from '@/components/ui/icons'
import { NAV_GROUPS, type AdminView } from './routes'
import { StatusDot } from './ui/primitives'
import { SiteVersion } from './SiteVersion'

const VIEW_ICONS: Record<AdminView, (props: { className?: string }) => ReactNode> = {
  overview: LayoutIcon,
  projects: FolderIcon,
  profile: UserIcon,
  links: LinkIcon,
  media: ImageIcon,
  publishing: RocketIcon,
  seo: SearchIcon,
  activity: ActivityIcon,
  integrations: PlugIcon,
  settings: GearIcon,
}

export function AdminShell({
  view,
  onNavigate,
  onLogout,
  sessionExpiresAt,
  sidebarOpen,
  setSidebarOpen,
  children,
}: {
  view: AdminView
  onNavigate: (view: AdminView) => void
  onLogout: () => void
  sessionExpiresAt?: string
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('af-admin-rail') === '1'
    } catch {
      return false
    }
  })

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false)
  }, [view, setSidebarOpen])

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen, setSidebarOpen])

  const expiryLabel = formatExpiry(sessionExpiresAt)

  const nav = (
    <nav aria-label="Admin sections" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="mb-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-mist/60">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = VIEW_ICONS[item.view]
              const active = view === item.view
              return (
                <li key={item.view}>
                  <button
                    onClick={() => onNavigate(item.view)}
                    aria-current={active ? 'page' : undefined}
                    title={collapsed ? `${item.label} — ${item.hint}` : undefined}
                    className={cn(
                      'group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                      active
                        ? 'bg-accent/12 font-medium text-accent shadow-[inset_2px_0_0_0_var(--color-accent)]'
                        : 'text-mist hover:bg-panel-2 hover:text-frost'
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem('af-admin-rail', c ? '0' : '1')
      } catch {
        // private mode — collapse simply won't persist
      }
      return !c
    })
  }

  const rail = (
    <div
      className={cn(
        'flex h-dvh flex-col border-r border-edge bg-abyss transition-[width] duration-200',
        collapsed ? 'w-[76px]' : 'w-60'
      )}
    >
      {/* Brand = the collapse toggle (ChatGPT-style): one generous hit area,
          hover swaps the logo for the panel glyph + tooltip, icon size stays
          constant between states so nothing visually shrinks. */}
      <div className="border-b border-edge px-3 py-3">
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="group flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-panel-2 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"
        >
          <span className="relative grid h-10 w-10 shrink-0 place-items-center">
            <BrandLogo className="h-9 w-9 object-contain transition-opacity duration-150 group-hover:opacity-0 group-focus-visible:opacity-0" />
            <PanelLeftIcon className="absolute h-6 w-6 text-mist opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight text-frost">Ali Faniani</span>
              <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-mist/70">
                Control Center
              </span>
            </span>
          )}
        </button>
      </div>

      {nav}

      <div className={cn('space-y-1.5 border-t border-edge px-3 py-3', collapsed && 'px-2')}>
        {!collapsed && expiryLabel && (
          <p className="px-1 text-[10px] leading-relaxed text-mist/60">Session valid until {expiryLabel}</p>
        )}
        {!collapsed && (
          <p className="px-1 pt-0.5">
            <SiteVersion />
          </p>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-void text-frost">
      {/* Desktop rail — full viewport height; the nav region scrolls internally.
          h-dvh on both wrapper and rail keeps the rail visually complete on
          long pages; the page column owns the only page scrollbar. */}
      <aside className="hidden h-dvh shrink-0 lg:block" aria-label="Sidebar">{rail}</aside>

      {/* Mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-void/75 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-64 shadow-2xl">{rail}</div>
        </div>
      )}

      <div className="flex h-dvh min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-edge bg-void/85 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="cursor-pointer rounded-lg p-2 text-mist transition-colors hover:bg-panel-2 hover:text-frost lg:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <p className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-mist">
            <StatusDot tone="ok" />
            <span className="truncate sr-only sm:not-sr-only">Portfolio Control Center</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/', '_blank', 'noopener')}
          >
            <span className="hidden sm:inline">View site</span>
            <ExternalLinkIcon className="h-3.5 w-3.5 sm:ml-1.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

        <footer className="border-t border-edge px-4 py-3 text-center sm:px-6">
          <p className="font-mono text-[10px] text-mist/50">
            Build a better tomorrow. — private admin surface, never indexed.
          </p>
        </footer>
      </div>

      {/* Visually-hidden close affordance for keyboard users in the drawer */}
      {sidebarOpen && (
        <button
          autoFocus
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed left-60 top-2 z-[85] hidden rounded-lg bg-panel p-2 text-mist lg:hidden"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function formatExpiry(iso?: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
