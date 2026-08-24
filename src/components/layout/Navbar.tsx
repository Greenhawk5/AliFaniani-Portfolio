import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { NAV_LINKS, SITE } from '@/app/config'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/cn'
import { GearIcon, MenuIcon, CloseIcon } from '@/components/ui/icons'

export function Navbar() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [prevPath, setPrevPath] = useState(pathname)
  const toggleSettings = useUiStore((s) => s.toggleSettings)
  const settingsOpen = useUiStore((s) => s.settingsOpen)

  if (prevPath !== pathname) {
    setPrevPath(pathname)
    setScrolled(false)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!isHome) return
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  const solid = !isHome || scrolled

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        solid ? 'glass shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]' : 'bg-transparent'
      )}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="group flex items-center gap-2.5" aria-label="Home">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 font-mono text-sm font-bold text-accent shadow-[0_0_18px_-4px_rgba(57,255,139,0.5)] transition-shadow group-hover:shadow-[0_0_26px_-4px_rgba(57,255,139,0.8)]">
            {SITE.shortName}
          </span>
          <span className="hidden text-sm font-semibold tracking-wide text-frost sm:block">
            {SITE.name}
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'text-accent'
                    : 'text-mist hover:text-frost'
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            onClick={toggleSettings}
            aria-label="Open settings"
            className={cn(
              'ml-2 rounded-lg p-2 transition-all hover:bg-panel-2 hover:text-accent cursor-pointer',
              settingsOpen ? 'text-accent' : 'text-mist'
            )}
          >
            <GearIcon className={cn('h-5 w-5', settingsOpen && 'animate-[spin_6s_linear_infinite]')} />
          </button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={toggleSettings}
            aria-label="Open settings"
            className="rounded-lg p-2 text-mist transition-colors hover:bg-panel-2 hover:text-accent cursor-pointer"
          >
            <GearIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="rounded-lg p-2 text-mist transition-colors hover:bg-panel-2 hover:text-frost cursor-pointer"
          >
            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="min-h-[calc(100dvh-4rem)] overflow-hidden border-t border-edge bg-void/95 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3.5 py-2.5 text-sm transition-colors',
                      isActive ? 'bg-accent/10 text-accent' : 'text-mist hover:bg-panel-2 hover:text-frost'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
