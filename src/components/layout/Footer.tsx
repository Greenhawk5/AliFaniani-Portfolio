import { Link } from 'react-router-dom'
import { NAV_LINKS, SITE } from '@/app/config'
import { socialLinks } from '@/data/links'
import { GitHubIcon, LinkedInIcon, XTwitterIcon, MailIcon } from '@/components/ui/icons'

function SocialIcon({ label }: { label: string }) {
  if (label === 'GitHub') return <GitHubIcon className="h-4.5 w-4.5" />
  if (label === 'LinkedIn') return <LinkedInIcon className="h-4.5 w-4.5" />
  if (label === 'X / Twitter') return <XTwitterIcon className="h-4.5 w-4.5" />
  return <MailIcon className="h-4.5 w-4.5" />
}

export function Footer() {
  return (
    <footer className="border-t border-edge bg-abyss/60">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 md:grid-cols-3 md:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 font-mono text-sm font-bold text-accent">
              {SITE.shortName}
            </span>
            <span className="text-sm font-semibold text-frost">{SITE.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist">{SITE.tagline}</p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="w-fit text-sm text-mist transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="rounded-lg border border-edge bg-panel p-2 text-mist transition-all hover:border-accent/40 hover:text-accent"
              >
                <SocialIcon label={s.label} />
              </a>
            ))}
          </div>
          <a
            href={`mailto:${SITE.email}`}
            className="w-fit font-mono text-xs text-mist transition-colors hover:text-accent"
          >
            {SITE.email}
          </a>
        </div>
      </div>
      <div className="border-t border-edge/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-4 text-xs text-mist/70 sm:flex-row md:px-8">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p className="font-mono">Designed & built with React Three Fiber</p>
        </div>
      </div>
    </footer>
  )
}
