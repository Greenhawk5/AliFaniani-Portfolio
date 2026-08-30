import { Suspense } from 'react'
import { ErrorBoundary as RBErrorBoundary } from 'react-error-boundary'
import { Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { useJsonLd } from '@/hooks/useJsonLd'
import { SITE } from '@/app/config'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { projects } from '@/data/projects'
import { ROOM_META } from '@/data/route-meta'
import { LoadingVeil } from '@/components/room/LoadingVeil'
import { RoomOverlay } from '@/components/room/RoomOverlay'
import { RoomContentLayer } from '@/components/room/RoomContentLayer'
import { ArrowRightIcon } from '@/components/ui/icons'
import { lazyWithChunkRecovery } from '@/app/lazyWithRecovery'

const Scene = lazyWithChunkRecovery(() => import('@/components/three/Scene'))

/**
 * Fallback shown when the Three.js scene fails to load or render (e.g. WebGL
 * unavailable, GPU blocked). The room must never be a dead end: visitors get
 * identity, an explanation and real navigation instead of a bare error.
 */
function RoomErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 overflow-y-auto bg-void p-8 text-center">
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
        Interactive 3D portfolio experience unavailable.
      </p>
      <p className="max-w-md text-sm leading-relaxed text-mist">
        Your browser or device could not render the 3D room — but the full
        portfolio works without it.
      </p>
      <nav aria-label="Site navigation" className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/about"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-void"
        >
          About
        </Link>
        <Link
          to="/projects"
          className="rounded-xl border border-edge-2 px-5 py-2.5 text-sm font-semibold text-frost transition-colors hover:border-accent/50 hover:text-accent"
        >
          Projects
        </Link>
        <Link
          to="/contact"
          className="rounded-xl border border-edge-2 px-5 py-2.5 text-sm font-semibold text-frost transition-colors hover:border-accent/50 hover:text-accent"
        >
          Contact
        </Link>
      </nav>
      <nav aria-label="Featured projects" className="flex flex-wrap items-center justify-center gap-2">
        {projects.map((project) => (
          <Link
            key={project.slug}
            to={`/projects/${project.slug}`}
            className="flex items-center gap-1.5 rounded-full border border-edge-2 px-3.5 py-1.5 text-xs text-mist transition-colors hover:border-accent/50 hover:text-accent"
          >
            {project.title}
            <ArrowRightIcon className="h-3 w-3 text-accent/70" />
          </Link>
        ))}
      </nav>
      <button
        onClick={resetErrorBoundary}
        className="cursor-pointer text-xs text-mist underline underline-offset-4 transition-colors hover:text-frost"
      >
        Try the 3D room again
      </button>
    </div>
  )
}

export default function Room() {
  useDocumentMeta(ROOM_META)

  // WebPage schema for the room experience — references the site-wide
  // Person/WebSite entities by @id instead of duplicating them.
  useJsonLd('room-webpage', {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE.url}/room#webpage`,
    url: `${SITE.url}/room`,
    name: ROOM_META.title,
    description: ROOM_META.description,
    isPartOf: { '@id': `${SITE.url}/#website` },
    about: { '@id': `${SITE.url}/#person` },
  })

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <RBErrorBoundary FallbackComponent={RoomErrorFallback} onReset={() => window.location.reload()}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
        <RoomContentLayer />
        <RoomOverlay />
        <LoadingVeil />
      </RBErrorBoundary>
    </div>
  )
}
