import { Component, type ErrorInfo, type ReactNode } from 'react'
import { SITE } from '@/app/config'
import { BrandLogo } from '@/components/ui/BrandLogo'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      // Static, dependency-free fallback: if the interactive room fails
      // (e.g. WebGL unavailable), visitors still get identity, orientation
      // and real navigation instead of a dead end.
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-void p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center">
            <BrandLogo />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-frost">
              {SITE.name} — {SITE.shortRole}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-mist">{SITE.tagline}</p>
          </div>
          <p className="font-mono text-sm text-danger">
            Something went wrong while loading this page.
          </p>
          <nav aria-label="Site navigation" className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="/about"
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-void"
            >
              About
            </a>
            <a
              href="/projects"
              className="rounded-xl border border-edge-2 px-5 py-2.5 text-sm font-semibold text-frost transition-colors hover:border-accent/50 hover:text-accent"
            >
              Projects
            </a>
            <a
              href="/contact"
              className="rounded-xl border border-edge-2 px-5 py-2.5 text-sm font-semibold text-frost transition-colors hover:border-accent/50 hover:text-accent"
            >
              Contact
            </a>
          </nav>
          <button
            onClick={() => window.location.reload()}
            className="cursor-pointer text-xs text-mist underline underline-offset-4 transition-colors hover:text-frost"
          >
            Reload the experience
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
