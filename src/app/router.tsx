import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from './providers'
import { Spinner } from '@/components/ui/Spinner'

type PageModule = { default: React.ComponentType }

function isDynamicImportFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|importing a module script failed|mime type of ['"]text\/html/i.test(message)
}

function reloadFreshDocument() {
  const url = new URL(window.location.href)
  url.searchParams.set('_deploy_refresh', Date.now().toString())
  window.location.replace(url.href)
}

// A deployment can leave an already-open tab referring to an old hashed chunk.
// Reload once so the browser receives the current index.html and chunk names.
function lazyWithChunkRecovery(load: () => Promise<PageModule>) {
  return lazy(async () => {
    try {
      return await load()
    } catch (error) {
      if (!isDynamicImportFailure(error)) throw error
      const recoveryKey = 'portfolio:chunk-recovery'
      if (!sessionStorage.getItem(recoveryKey)) {
        sessionStorage.setItem(recoveryKey, '1')
        reloadFreshDocument()
        return new Promise<PageModule>(() => {})
      }
      sessionStorage.removeItem(recoveryKey)
      throw error
    }
  })
}

const HomePage = lazyWithChunkRecovery(() => import('@/pages/Home'))
const AboutPage = lazyWithChunkRecovery(() => import('@/pages/About'))
const ProjectsPage = lazyWithChunkRecovery(() => import('@/pages/Projects'))
const ProjectDetailPage = lazyWithChunkRecovery(() => import('@/pages/ProjectDetail'))
const ContactPage = lazyWithChunkRecovery(() => import('@/pages/Contact'))
const NotFoundPage = lazyWithChunkRecovery(() => import('@/pages/NotFound'))

function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="h-6 w-6 text-accent" />
      <span className="sr-only">{children}</span>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LazyPage>{null}</LazyPage>}>
            <HomePage />
          </Suspense>
        ),
      },
      {
        path: 'about',
        element: (
          <Suspense fallback={<LazyPage>{null}</LazyPage>}>
            <AboutPage />
          </Suspense>
        ),
      },
      {
        path: 'projects',
        element: (
          <Suspense fallback={<LazyPage>{null}</LazyPage>}>
            <ProjectsPage />
          </Suspense>
        ),
      },
      {
        path: 'projects/:slug',
        element: (
          <Suspense fallback={<LazyPage>{null}</LazyPage>}>
            <ProjectDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'contact',
        element: (
          <Suspense fallback={<LazyPage>{null}</LazyPage>}>
            <ContactPage />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<LazyPage>{null}</LazyPage>}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
])

export function Router() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}
