import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { BackToTop } from './BackToTop'
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
  // The landing page (/) uses its own minimal composition — no global navbar.
  // The room (/room) is a full-screen 3D experience — no footer/back-to-top.
  const isLanding = pathname === '/'
  const isRoom = pathname === '/room'
  const setFocus = useUiStore((s) => s.setFocus)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)

  useEffect(() => {
    setFocus(null)
    // Never carry an open settings dialog across a route change — the
    // settings trigger only exists on /room.
    setSettingsOpen(false)
  }, [pathname, setFocus, setSettingsOpen])

  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollToTop />
      <EscapeHandler />
      {!isLanding && <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!isLanding && !isRoom && <Footer />}
      {!isLanding && !isRoom && <BackToTop />}
      <SettingsPanel />
    </div>
  )
}
