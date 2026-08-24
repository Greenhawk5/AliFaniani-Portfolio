import { Link } from 'react-router-dom'
import { NAV_LINKS, SITE } from '@/app/config'
import { socialLinks } from '@/data/links'
import {
  GitHubIcon,
  LinkedInIcon,
  TelegramIcon,
  HuggingFaceIcon,
  MailIcon,
} from '@/components/ui/icons'

const SITE_VERSION = 'v1.0.0'

function SocialIcon({ label }: { label: string }) {
  if (label === 'GitHub') return <GitHubIcon className="h-4.5 w-4.5" />
  if (label === 'LinkedIn') return <LinkedInIcon className="h-4.5 w-4.5" />
  if (label === 'Telegram') return <TelegramIcon className="h-4.5 w-4.5" />
  if (label === 'Hugging Face') return <HuggingFaceIcon className="h-4.5 w-4.5" />
  return <MailIcon className="h-4.5 w-4.5" />
}

export function Footer() {
  return (
    <footer className="border-t border-edge bg-abyss/60">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 font-mono text-sm font-bold text-accent">
              {SITE.shortName}
            </span>
            <span className="text-sm font-semibold text-frost">{SITE.name}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist">
            {SITE.tagline}
          </p>
        </div>

        {/* Navigation */}
        <nav aria-label="Footer" className="flex flex-col gap-2.5">
          <p className="font-mono text-[10px] tracking-[0.25em] text-mist/60 uppercase">
            Navigate
          </p>
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

        {/* Social */}
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[10px] tracking-[0.25em] text-mist/60 uppercase">
            Connect
          </p>
          <div className="flex flex-wrap gap-2">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                title={s.label}
                className="rounded-lg border border-edge bg-panel p-2 text-mist transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent hover:shadow-[0_0_18px_-6px_rgba(57,255,139,0.5)]"
              >
                <SocialIcon label={s.label} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-edge/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-5 py-4 text-xs text-mist/70 sm:flex-row md:px-8">
          <div className="flex items-center gap-3">
            <p>
              © {new Date().getFullYear()} {SITE.name}. All rights reserved.
            </p>
            <span
              className="rounded-md border border-edge bg-panel px-1.5 py-0.5 font-mono text-[10px] text-mist/80"
              title={`Version ${SITE_VERSION}`}
            >
              {SITE_VERSION}
            </span>
          </div>
          <p className="font-mono">Designed & built with React Three Fiber</p>
        </div>
      </div>
    </footer>
  )
}
