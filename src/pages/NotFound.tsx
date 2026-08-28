import { Link } from 'react-router-dom'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/ui/PageTransition'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  useDocumentMeta({
    title: 'Page Not Found — Ali Faniani',
    description: 'The page you are looking for does not exist.',
    noindex: true,
  })

  return (
    <PageTransition>
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
        <p className="font-mono text-7xl font-bold text-accent text-glow md:text-9xl">404</p>
        <h1 className="text-xl font-semibold md:text-2xl">This page does not exist</h1>
        <p className="max-w-md text-sm leading-relaxed text-mist">
          The page you are looking for was moved, renamed or never built. Let&apos;s get you
          back to the portfolio.
        </p>
        <Link to="/">
          <Button>
            Back to home <span aria-hidden="true">→</span>
          </Button>
        </Link>
      </div>
    </PageTransition>
  )
}
