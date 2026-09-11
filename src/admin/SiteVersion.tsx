import { APP_VERSION } from '@/version'

/** Minimal version chip shared by the admin shell and login card. */
export function SiteVersion() {
  return (
    <span className="rounded-md border border-edge bg-panel px-1.5 py-0.5 font-mono text-[10px] text-mist/80">
      v{APP_VERSION}
    </span>
  )
}
