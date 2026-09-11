# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities privately via
[GitHub security advisories](https://github.com/Greenhawk5/AliFaniani-Portfolio/security/advisories/new)
on this repository.

Please include a description of the issue, the steps to reproduce it, and the
affected route or file if known. Do not open a public issue for security
reports.

## Supported versions

Only the latest version deployed to production (`main` branch) is supported.

## Scope notes

- This is a personal portfolio hosted on Cloudflare Pages. The public site is
  fully static — public pages never query D1 at runtime. The interactive
  endpoints are the contact form and the private, single-owner admin surface
  at `/admin` (unlisted, `noindex`, `no-store`).
- There are no multi-user accounts, registrations, roles, or third-party user
  data. The only persisted records are CMS content, the single administrator's
  session records, and a security audit log.
- Do not test against the production contact or admin endpoints in ways that
  send email, consume quotas, or attempt logins. Validate against a local
  runtime instead (`npx wrangler pages dev dist` with a local `.dev.vars`).

## Security model (v2.0.0)

### Authentication

- Single-owner, password-only admin login. No usernames, registration, or
  password reset flows.
- `ADMIN_PASSWORD` exists only as a Cloudflare Pages secret — never in source
  control, D1, or client code.
- Comparison is timing-safe. Sessions are opaque 256-bit random tokens; D1
  stores only their SHA-256 hashes, so a database leak cannot be replayed as
  a session.
- Sessions expire after 7 days (sliding refresh, 30-day hard cap); expired
  sessions are rejected and purged opportunistically.
- Logout deletes the server-side session record and clears cookies.

### Cookies

- Session cookie: `HttpOnly; Secure; SameSite=Strict; Path=/` with explicit
  `Max-Age`. No `Domain` attribute. The token is never exposed to client
  JavaScript and never stored in `localStorage`/`sessionStorage`.

### CSRF

- Every state-changing admin request requires a per-session CSRF token
  (`X-CSRF-Token`), validated timing-safe against the hash stored on the
  server-side session. `SameSite=Strict` is the first layer; the token check
  is defense-in-depth.

### Login protection

- Cloudflare Turnstile is always required on the login endpoint
  (server-verified, fail-closed).
- Layered rate limiting: an in-memory per-isolate burst cap plus a KV-backed
  per-IP lockout that counts only Turnstile-passed password failures
  (5 per 15 minutes). KV failures fail open — Turnstile and the burst cap
  remain active. No global counter exists, so third-party traffic cannot lock
  the owner out.

### Audit logging

- Login, failed-login, logout, content and publish/deploy events are recorded
  in a D1 `auth_log` table. Credentials, session tokens, CSRF tokens and
  secret values are never logged.

### Secrets

- `ADMIN_PASSWORD`, `DEPLOY_HOOK_URL`, `CLOUDFLARE_D1_READ_TOKEN` (read-only,
  used exclusively by the build's snapshot export) and `TURNSTILE_SECRET` are
  server-side only: never bundled, never returned by any endpoint, never
  logged. The deploy hook URL is requested solely from server-side publish
  code.

### Content security

- D1 is not publicly exposed. The public site consumes a build-time snapshot
  of published content only — drafts and archived records can never reach the
  public snapshot, routes, sitemap, or metadata.
- Publishing validates every record against canonical Zod schemas and the
  media manifest before any write, and applies all promotions in a single
  atomic D1 batch.

### Transport and headers

- HSTS (with `includeSubDomains`), a restrictive Content Security Policy,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `frame-ancestors 'none'`, `Referrer-Policy`, and a restrictive
  `Permissions-Policy`. Admin responses are `Cache-Control: no-store`.

### Bundle isolation

- The admin application is a lazy-loaded, isolated chunk. Public chunks never
  contain Zod runtime, admin server modules, or secret material — enforced by
  automated build verification.

Implemented hardening is also summarized in the
[Security section of the README](README.md#security).
