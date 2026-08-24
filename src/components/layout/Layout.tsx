import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { SettingsPanel } from './SettingsPanel'
import { useUiStore } from '@/stores/uiStore'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

function EscapeHandler() {
  const focus = useUiStore((s) => s.focus)
  const setFocus = useUiStore((s) => s.setFocus)
  const settingsOpen = useUiStore((s) => s.settingsOpen)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (settingsOpen) setSettingsOpen(false)
      else if (focus) setFocus(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, setFocus, settingsOpen, setSettingsOpen])
  return null
}

export function Layout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const setFocus = useUiStore((s) => s.setFocus)

  useEffect(() => {
    setFocus(null)
  }, [pathname, setFocus])

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <EscapeHandler />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      {!isHome && <Footer />}
      <SettingsPanel />
    </div>
  )
}
