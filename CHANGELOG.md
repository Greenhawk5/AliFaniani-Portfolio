# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] — 2026-09-12

Maintenance release: automatic repository synchronization of generated CMS
snapshot files after a publish.

### Added

- **GitHub snapshot sync** — after a successful publish, the endpoint
  dispatches a `repository_dispatch` event (`GITHUB_SYNC_TOKEN` secret,
  failure reported honestly and non-fatal). A dedicated GitHub Actions
  workflow re-exports the published Production D1 snapshot in strict mode,
  regenerates `src/data/generated/content.json` and `public/sitemap.xml`,
  and commits them only when they actually differ. Triggered solely by
  dispatch (never on push) — no GitHub ↔ Cloudflare build loop is possible.
  Sync commits carry `[CI Skip]` so Cloudflare Pages skips rebuilding them;
  regular commits deploy normally and carry the sync implementation with
  them. Synchronization is secondary to production: failures never block a
  publish or affect the live site, and the workflow can be re-run manually.
- **Deterministic generators** — the snapshot `exportedAt` derives from the
  exported rows (`MAX(updated_at)`) and the sitemap `lastmod` from the
  snapshot, so re-exporting unchanged D1 state is byte-identical and the
  sync creates no empty commits.

### Changed

- Version is now sourced from `package.json` (2.0.1) at build time.

## [2.0.0] — Unreleased

Major architecture upgrade: a private, D1-backed CMS with secure
single-owner authentication and publish-triggered production rebuilds.
The public website remains fully static and is served from a validated
build-time content snapshot — no SSR, no runtime D1 reads, no R2.

### Added

- **D1-backed CMS** — Cloudflare D1 is the source of truth for projects,
  profile sections and links (`draft` / `published` / `archived` states,
  draft overlays for edits to published content, Zod-validated writes,
  optimistic concurrency via `ifUnmodifiedSince`).
- **Admin application** (`/admin`) — unlisted, lazy-loaded and bundle-
  isolated: dashboard with content/deployment state, project list with a
  structured editor covering the full project schema, profile-section and
  link editors, static MediaPicker over a generated media manifest,
  create/archive/delete (with confirmation) workflows, and a subtle 🔑
  entry inside the Settings panel.
- **Admin authentication** — password-only single-owner login against the
  `ADMIN_PASSWORD` secret (timing-safe compare), opaque 256-bit session
  tokens with SHA-256-at-rest in D1, `HttpOnly`/`Secure`/`SameSite=Strict`
  cookies, 7-day sliding sessions (30-day hard cap), session revocation
  and Cloudflare Turnstile verification.
- **CSRF protection** — per-session tokens required on every admin
  mutation, validated timing-safe against server-side hashes.
- **Login rate limiting** — layered: in-memory burst cap plus KV-backed
  per-IP lockout counting only Turnstile-passed password failures
  (5 per 15 minutes, fail-open, no global counter).
- **Atomic publishing** — `POST /api/admin/publish` validates all drafts
  (schemas + media manifest) before any write, promotes overlays and
  draft-only records in a single atomic D1 batch, then triggers the
  Cloudflare Pages Deploy Hook from server-side code; hook failures are
  reported honestly (`trigger_failed`) without rolling back D1.
- **Build-time snapshot pipeline** — orchestrated build order: media
  manifest → D1 snapshot export (REST, read-only token) → snapshot
  validation (Zod + media references) → sitemap → TypeScript/Vite →
  route HTML → `_content_meta.json` → verification. Production runs in
  strict mode (export/validation failure fails the build; the previous
  deployment stays live); local builds fall back to the committed
  snapshot without credentials.
- **SEO integration** — sitemap, route HTML shells, `_content_meta.json`
  middleware metadata and JSON-LD all derive from the published snapshot;
  drafts and archived content never become publicly routable (unknown
  routes keep real 404 + `noindex` behavior).
- **Static media pipeline** — deterministic media manifest with stable
  `/media/...` URLs; publish and build validation reject broken media
  references. No uploads or R2 in v2.0.0.
- **Testing** — 73-test Vitest suite (schema, store, admin API, auth,
  CSRF, publish, snapshot, bundle isolation) plus a 10-test SEO E2E
  suite driving the real build pipeline against local D1 (draft
  isolation, publish visibility, archive → 404, sitemap/route-HTML/
  content-meta integrity, security headers, Room isolation).
- **CI** — GitHub Actions workflow: npm ci, typecheck, lint, functions
  check, credential-free tests, build and build verification.
- **Functions routing** — `public/_routes.json` excludes static assets
  from Function invocation.

### Changed

- **Content source** — `src/data/projects.ts` / `profile.ts` / `links.ts`
  are now generated facades over the validated content snapshot; hand-
  edited content in source files is no longer the authority.
- **Media URLs** — content images moved from Vite-hashed bundle paths to
  stable, versionable `/media/...` paths copied at build time.
- **Sitemap** — generated from the published snapshot (previously regex-
  scraped from source text).
- **Middleware** — route and project-slug validation now reads a build-
  generated `_content_meta.json` (replacing hand-maintained lists).
- **Contact API** — owner-notification delivery is verified and surfaces
  as a 502 on failure; the email URL is configurable via `SITE_URL`.
- **Versioning** — package.json is the single authoritative version
  source; `src/version.ts` is generated at build time.

### Security

- Admin authentication, session security and CSRF as described above.
- Server-side secrets only: `ADMIN_PASSWORD`, `DEPLOY_HOOK_URL`,
  `CLOUDFLARE_D1_READ_TOKEN` (read-only) and `TURNSTILE_SECRET` never
  appear in client bundles, API responses, or logs (build-verified).
- Bundle isolation: Zod runtime and admin/server modules are excluded
  from public chunks by automated verification.
- HSTS now includes `includeSubDomains`; `/room` and `/admin` responses
  are `no-store`; `/admin` is served with `X-Robots-Tag: noindex`.
- Content writes are Zod-validated; only published content can reach the
  public snapshot; published records cannot be hard-deleted (archive
  first).

## [1.0.2] — 2026-09-07

### Changed

- Updated the favicon and improved search-result branding.

## [1.0.1] — 2026-08-30

### Changed

- Refined portfolio branding and logo alignment; regenerated OG image
  and favicon assets; updated the social link board.

## [1.0.2] — 2026-09-07

### Changed

- Updated the favicon and improved search-result branding.

## [1.0.1] — 2026-08-30

### Changed

- Refined portfolio branding and logo alignment; regenerated OG image
  and favicon assets; updated the social link board.

## [1.0.0] — 2026-08-30

First official release of the portfolio.

### Added

- **Architecture** — separation between a lightweight, SEO-first landing page
  (`/`) and the interactive 3D developer room (`/room`), strictly code-split
  so the 3D experience never loads on the landing page.
- **Interactive 3D developer room** (`/room`) — fully procedural workspace
  built with Three.js / React Three Fiber: a continuous day/night cycle
  driven by the visitor's real clock, custom GLSL sky shader, canvas-textured
  screens (project showcase board, monitor, social board, digital clock),
  interactive objects, cinematic and free camera modes, dust particles, neon
  signage, and post-processing.
- **Portfolio pages** — About, Projects index, project detail case studies,
  and a Turnstile-protected Contact form with a hardened Cloudflare Pages
  Function (server-side verification, per-IP rate limiting, input escaping,
  email delivery).
- **SEO** — route-aware metadata and canonical URLs, build-time
  route-specific HTML shells, sitemap generated from project data, structured
  data (Person, WebSite, ProfilePage, ItemList, CreativeWork, WebPage),
  Open Graph / Twitter metadata, crawlable homepage `<h1>`, real `404`
  responses with `X-Robots-Tag: noindex`, and URL normalization middleware.
- **Performance** — 3D asset optimization (Meshopt/Draco geometry, WebP
  textures), self-hosted fonts, optimized responsive images, an honest
  asset-driven loading veil, quality tiers with device detection, and
  reduced-motion support.
- **Security** — enforced Content-Security-Policy, HSTS, hardened security
  headers, and strict environment-variable separation (public `VITE_*`
  configuration vs. Cloudflare server secrets).
- **Repository documentation** — README, SECURITY.md, NOTICE.md
  (third-party asset attribution), and this changelog.
