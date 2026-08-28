import { Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { ErrorBoundary } from './providers'
import { Spinner } from '@/components/ui/Spinner'
import { lazyWithChunkRecovery } from './lazyWithRecovery'

const HomePage = lazyWithChunkRecovery(() => import('@/pages/Home'))
const RoomPage = lazyWithChunkRecovery(() => import('@/pages/Room'))
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
        path: 'room',
        element: (
          <Suspense fallback={<LazyPage>{null}</LazyPage>}>
            <RoomPage />
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
