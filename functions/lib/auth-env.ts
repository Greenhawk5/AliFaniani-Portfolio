/**
 * Admin authentication — shared types + environment contract.
 *
 * Server-only: never imported by public/bundle code (the functions/ tree is
 * excluded from the public Vite build; verify-build.mjs also scans chunks).
 *
 * Required Cloudflare configuration (all set via `wrangler pages secret put`
 * / dashboard Variables and Secrets — never in the repo):
 *   ADMIN_PASSWORD        — the single admin credential (high-entropy random)
 *   TURNSTILE_SECRET      — Turnstile server-side key (shared with contact)
 *   VITE_TURNSTILE_SITE_KEY — public site key (rendered for the login widget)
 */

export interface AdminEnv extends PagesEnv {
  ADMIN_PASSWORD?: string
  TURNSTILE_SECRET?: string
}

export interface PagesEnv {
  DB: D1Database
  RATE_LIMIT: KVNamespace
  ASSETS: Fetcher
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  EMAIL_TO?: string
  SITE_URL?: string
}
