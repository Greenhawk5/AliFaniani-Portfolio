# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] — 2026-11-22

Major milestone delivering full CMS selective publishing, complete Admin Panel modernization (SEO Center, Integrations Center, Settings Center), live zero-trust system health diagnostics, responsive 3D developer-room camera architecture with mobile touch controls, fluid mobile responsive engineering, adaptive selected work typography, and Google Search Site Name branding.

### Added

- **CMS Selective Publishing System** — Implemented granular multi-item draft promotion in `src/admin/views/PublishingView.tsx`, `functions/api/admin/publish.ts`, and `functions/lib/publish.ts`. Administrators can select individual drafts to publish rather than promoting all pending edits at once.
- **Snapshot Sync Retry Mechanism** — Added manual retry trigger in `src/admin/publishApi.ts` allowing immediate dispatch of the GitHub Actions snapshot-sync workflow if previous synchronizations were interrupted.
- **Live System Health Diagnostics** — Built `functions/api/admin/system/health.ts` and `src/admin/systemApi.ts` providing real-time, zero-trust server health probes covering D1 latency (ms), table record counts, KV binding status, R2 media bucket accessibility, and Cloudflare edge runtime context.
- **Advanced Admin Notification Center** — Developed `src/admin/views/NotificationCenterView.tsx` with severity filtering, priority management, search, multi-selection bulk actions, expiration handling, and dedicated creation modal.
- **Mobile 3D Room Controls** — Added two-finger pinch-to-zoom, touch orbit controls with momentum damping, and an ergonomic virtual joystick for free-camera mode on touch devices in `src/three/CameraRig.tsx` and `src/components/ui/RoomCameraControls.tsx`.
- **Diagnostic Jump-to-Remedy Links** — Integrated one-click navigation links in `src/admin/views/SeoView.tsx` directing administrators straight to relevant editing tools or publishing screens to remediate diagnostic warnings.
- **Copyable System Tokens** — Added one-click copy buttons for application version (`v2.5.0`) and canonical origin in Admin Settings.

### Improved

- **Admin SEO Center Overhaul** — Completely redesigned `src/admin/views/SeoView.tsx` into an actionable dashboard with indexing posture indicators, canonical origin audits, diagnostic severity checks, route-by-route metadata inspection table, and project coverage cards.
- **Admin Integrations & Infrastructure Center** — Modernized `src/admin/views/IntegrationsView.tsx` into an infrastructure registry with a visual 6-stage publishing pipeline diagram and honest observational status across 10 distinct cloud services.
- **Admin Settings Center Overhaul** — Restructured `src/admin/views/SettingsView.tsx` into five organized domains (*Account & Session*, *Application & Build*, *Content & Publishing*, *Infrastructure & Bindings*, and *Security & Secrets*).
- **Selected Work Responsive Typography** — Re-engineered `src/components/ui/ProjectCarousel.tsx` to allow natural multi-line wrapping for project titles, subtitles, and category badges without clipping or awkward ellipses.
- **Homepage Mobile Layout & Fluid Typography** — Re-engineered `src/pages/Home.tsx` hero typography with CSS `clamp(2.5rem, 8vw, 4.25rem)` and eliminated horizontal layout overflow across all mobile viewports.
- **3D Room Camera Viewport Framing** — Implemented bounding-box geometry calculations (`box.getSize()`) in `src/three/CameraRig.tsx` to automatically adapt camera distance, focal length, and vertical look offset based on viewport aspect ratio.
- **3D Room Controls Drawer** — Separated camera preset navigation from scene interactions for ergonomic one-thumb mobile access.

### Fixed

- **Google Search Site Name & Structured Data** — Updated OpenGraph `og:site_name` and JSON-LD `@graph` `WebSite` entity to `"Ali Faniani"` with `alternateName: ["AliFaniani", "Ali Faniani Portfolio"]` in `index.html`.
- **Mobile Horizontal Layout Overflow** — Resolved clipping and horizontal scrolling on mobile viewports across Homepage hero, selected work carousel, and 3D room CTA cards.
- **3D Room Vertical Pitch Inversion** — Enforced strict pitch clamping in camera orbit controls, preventing the camera from flipping upside down or clipping through floor geometry.
- **Admin Notification Form Focus Loss** — Fixed component re-render loops in notification creation form to maintain input focus during typing.
- **Custom Cyber Switch Thumb Alignment** — Corrected CSS alignment of switch toggles in admin dialogs and settings.

### Security

- **Session Lifetime Governance** — Enforced 15-minute idle inactivity timeout and 24-hour absolute session ceiling on the server via `functions/lib/sessions.ts` with opportunistic expired session purging.
- **Session Probe Mode** — Added `isProbe: true` flag in `functions/lib/session-auth.ts` so diagnostic health checks and monitoring probes validate authentication without artificially postponing idle session expiration.
- **Zero-Trust Secrets Architecture** — Configured server secrets (`ADMIN_PASSWORD`, `TURNSTILE_SECRET`, `GITHUB_SYNC_TOKEN`, `RESEND_API_KEY`, etc.) strictly in Cloudflare Pages Secrets; verified through automated build checks that no secret keys or values are bundled in public client chunks.
- **Cloudflare Turnstile Verification** — Server-enforced, fail-closed Turnstile challenge validation on both admin login and public contact form submissions.
- **Edge Security Headers & Defense-in-Depth** — Cloudflare Pages edge middleware enforces lowercase canonicals, trailing-slash stripping, and injects `X-Robots-Tag: noindex, nofollow, noarchive` on `/admin` before execution reaches client code.

### Performance

- **Bundle Isolation** — Maintained strict separation: heavy 3D engine components are lazy-loaded exclusively on `/room`; public landing bundles contain zero Three.js, WebGL, or Zod dependencies.
- **3D Showcase Board Dirty-Flag Rendering** — Pre-rendered 52 background grid lines and gradient canvases offscreen, keeping idle GPU texture memory overhead at 0% and enabling crisp 350ms slide transitions.
- **Throttled Session Updates** — Throttled `last_used_at` session timestamps to once per 2 minutes, reducing D1 database write operations by over 85%.
- **Binary Magic-Byte Inspection** — Fast, non-allocating binary signature sniffing for WebP, PNG, JPEG, and AVIF uploads in R2 Media Library.

### Architecture

- **Deterministic Publishing State Machine** — Decoupled atomic D1 draft promotion from GitHub repository synchronization and Cloudflare Pages deployment via Cloudflare KV (`deploy:state`).
- **Dynamic D1 Edge Fallback** — In `functions/_middleware.js`, projects published after the latest build are dynamically served via D1 edge rendering with full canonicals and SEO metadata (`X-Content-Source: d1-edge-shell`).
- **Privacy-Preserving First-Party Analytics** — Salted daily rotating SHA-256 session hashes (`functions/api/analytics/track.ts`) with automated bot exclusion and cached public statistics (`/api/analytics/stats`).

### Administration

- **Unified Cyberpunk Design System** — Standardized dark-theme cyberpunk controls across all admin views (`AdminInput`, `AdminSelect`, `AdminSwitch`, `AdminCard`, `StatusPill`).
- **Comprehensive Media Library** — Browse, upload, categorize, inspect, and safely delete R2 media assets with pre-deletion reference checking.
- **EvilCharts Analytics Visualizations** — Embedded SVG donut distributions and 14-day activity pulse charts in Admin Overview and Activity feeds.

### Developer Experience

- **Expanded Test Coverage** — Test suite scaled to 247 automated tests across 21 test files (100% pass rate in CI).
- **Dedicated Diagnostic Tests** — Added `tests/admin-system-health.test.ts` verifying latency measurements, KV/R2 bindings, secrets posture, and SEO static contracts.
- **Build Output Verification** — Automated checks enforce `_routes.json`, `_content_meta.json`, media completeness, bundle isolation, and sitemap synchronization.

## [2.3.0] — 2026-11-21

Major upgrade delivering intelligent homepage selected work rotation, first-party privacy-preserving analytics, 3D developer-room performance optimization, responsive projects grid refinement, actionable admin notifications, and EvilCharts visual design system.

### 3D Room & Performance Architecture

- **Project Board Lag Elimination** — Diagnosed and resolved critical clock domain mismatch in `src/three/screens/boardScreen.ts` and `src/components/three/ProjectBoard.tsx` where mixing `env.time` with `performance.now() / 1000` caused permanent transition lockouts and continuous 60/120 Hz texture uploads.
- **Dirty-Flag Rendering & Pre-rendered Buffers** — Pre-rendered the 52 background grid lines and gradient canvases offscreen; canvas re-draws and GPU texture uploads (`texture.needsUpdate = true`) now occur strictly during active slide transitions (0% GPU texture overhead during idle states).
- **Instant Slide Navigation** — Optimized slide transition to a crisp 350ms duration with zero dropped clicks, allowing responsive next/prev navigation without lockout delays.
- **Real Visitor Counter Sign in 3D Room** — Upgraded the branded board beneath the digital clock in `src/components/three/ShelfDecor.tsx` to display real verified visitor counts fetched from `/api/analytics/stats`, rendered once onto canvas without continuous per-frame re-allocations.

### Homepage Experience & Selected Work Carousel

- **Intelligent Selected Work Carousel** — Replaced static badge pills in `src/pages/Home.tsx` with `src/components/ui/ProjectCarousel.tsx`, featuring 5-second auto-rotation, manual next/prev arrows, clickable slide progress dots, and keyboard navigation.
- **Popularity & CMS Priority Ranking** — Implemented `computeFeaturedProjects` in `src/stores/projectStore.ts` combining manual CMS `featured: true` overrides (ordered by `featuredOrder`) with 30-day analytics popularity ranking, capped at exactly 5 projects.
- **Accessibility & Motion Preferences** — Added full ARIA carousel semantics (`aria-roledescription="carousel"`, `aria-live="polite"`), auto-pause on hover/focus, and native support for `prefers-reduced-motion`.
- **Refined 3D Room CTA** — Redesigned the 3D developer room launch card on the Homepage with a restrained cyber border, live indicator pill, smooth hover lighting, and directional arrow micro-animations without gaudy button styling.
- **Homepage Visitor Badge** — Displayed verified visitor analytics chip in header and footer.

### Hybrid Website Analytics & D1 Schema

- **Database Migration 0006** — Added `migrations/0006_analytics_and_notifications.sql` introducing `page_view_events`, `analytics_daily`, `project_analytics_daily`, and `admin_notifications` tables with covering indexes.
- **Privacy-Preserving Tracking Endpoint** — Implemented `functions/api/analytics/track.ts` using daily rotating salted SHA-256 session hashes (`sha256Hex(ip::ua::date::salt)`). Raw IP addresses are never persisted.
- **Automated Bot & Crawler Filtering** — Comprehensive User-Agent regex checks filter out Googlebot, Bingbot, Lighthouse, crawlers, and headless browsers from public metrics.
- **Rate-Limiting & Write Mitigation** — In-memory deduplication cache prevents rapid page refresh spam from burdening D1 writes.
- **Public Cacheable Stats API** — Implemented `GET /api/analytics/stats` with `Cache-Control: public, max-age=60, s-maxage=300`.
- **Authenticated Admin Analytics API** — Implemented `GET /api/admin/analytics` returning daily traffic trends, top pages, device distributions, and 30-day project rankings.
- **Client Page Tracker Hook** — Built `src/hooks/useAnalyticsTracker.ts` using non-blocking `navigator.sendBeacon` for zero-overhead background analytics delivery.

### Responsive Projects Page Refinement

- **Adaptive Viewport Layout** — Refined `src/pages/Projects.tsx` grid from 320px mobile through 1920px ultrawide viewports (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
- **Normalized Action Alignment** — Structured project cards with `flex flex-col h-full` and `mt-auto` action bars to ensure uniform button alignment regardless of title length or tag wrapping.
- **Anti-Clipping Typography** — Prevented title and description clipping with responsive font sizes and line-clamp safety boundaries.

### Actionable Admin Notifications & EvilCharts Design System

- **D1 Notifications Lifecycle** — Implemented `functions/api/admin/notifications.ts` and `src/admin/notificationsApi.ts` managing real alerts across `active`, `acknowledged`, `resolved`, and `expired` states.
- **One-Click Alert Management** — Added direct "Acknowledge" and "Resolve" actions in `src/admin/views/OverviewView.tsx` with live synchronization to D1.
- **Admin Navigation Badges** — Integrated live notification counter pill into the `AdminShell` topbar and sidebar navigation rail.
- **EvilCharts Integration** — Built lightweight, dark-cyberpunk SVG charts in `src/admin/ui/EvilCharts.tsx`:
  - `DonutDistributionChart`: Interactive SVG donut with center percentage readout and hover slice inspection.
  - `AreaTrendChart`: Smooth Bézier curves with interactive hover crosshairs, floating tooltips, and data-truthful auto-scaling.
- **Visual Activity Analytics** — Embedded category donut distribution and 14-day activity pulse into `src/admin/views/ActivityView.tsx` and `src/admin/views/OverviewView.tsx`.
- **Unified Form Controls** — Created accessible cyberpunk controls in `src/admin/ui/form-controls.tsx` (`AdminSelect`, `AdminInput`, `AdminSwitch`), replacing all native `<select>` elements in `ActivityView` and `MediaView`.
- **CMS Featured Project Controls** — Added Homepage Featured switch and priority order inputs to `src/admin/ProjectForm.tsx`.

## [2.2.0] — 2026-11-21

Production-quality CMS upgrade featuring Cloudflare R2 media storage, professional Admin Media Library, server-authoritative 15-minute session security, decoupled SEO-preserving publishing, and self-healing audit history.

### Cloudflare R2 Media Storage

- **Native R2 Storage Integration** — Integrated Cloudflare R2 bucket `ali-faniani-portfolio-media` via `MEDIA_BUCKET` binding, serving public media via `https://media.alifaniani.ir`.
- **Magic-Byte MIME Validation** — Enforced strict binary signature sniffing for WebP, PNG, JPEG, and AVIF. Rejects SVGs, executables, scripts, and spoofed extensions.
- **Automatic Dimension Sniffing** — High-performance binary parser extracts width and height for WebP, PNG, JPEG, and AVIF files at upload time.
- **Atomic Upload Compensation** — Automatically purges uploaded R2 objects if subsequent D1 database registration encounters any failure.
- **Reference Integrity Protection** — Pre-deletion check scans D1 published and draft content for media references; safely blocks deletion with HTTP 409 Conflict detailing referencing records.
- **Content Security Policy** — Updated CSP headers in `public/_headers` to allow `https://media.alifaniani.ir` in `img-src` and `connect-src`.
- **Media Fallback Proxy** — Added `functions/media/[[path]].ts` proxy route to stream from R2 with immutable caching headers as local/preview fallback.

### Admin Media Library & Picker

- **Modern Media Library UI** — Completely redesigned `src/admin/views/MediaView.tsx` with drag-and-drop file upload zone, category selector, multi-file support, and progress indicators.
- **Category Tabs & Search** — Filter media by category (`All`, `Projects`, `Profile`, `Certificates`, `Misc`) with real-time text search and live item counters.
- **Asset Inspector Sidebar** — Detailed inspection panel featuring large preview, technical metadata (dimensions, size, format, key), one-click public URL copy, editable display name, category reassignment, and safe deletion.
- **Upgraded MediaPicker** — Enhanced `src/admin/MediaPicker.tsx` to merge live R2 media assets with legacy build assets, support inline instant uploads, and eliminate false-positive publish warnings for R2 URLs.

### Decoupled Publishing & SEO Preservation

- **Zod Content Schema Alignment** — Updated `mediaRefSchema` in `src/lib/content-schema.ts` to allow both root-relative paths and full `https://media.alifaniani.ir/*` URLs.
- **Publish Pipeline Validation** — Updated `functions/lib/publish.ts` to validate R2 media references alongside static manifest assets.
- **Dynamic Edge Shell Fallback** — In `functions/_middleware.js`, newly published projects missing from build-time static HTML shells are dynamically served via D1 edge rendering with full SEO `<title>`, `<meta name="description">`, OpenGraph, Twitter cards, and `<link rel="canonical">` tags (HTTP 200 with `X-Content-Source: d1-edge-shell`).
- **Strict 404 & Crawl Protection** — Nonexistent, archived, or draft-only projects strictly return HTTP 404 with `X-Robots-Tag: noindex`.
- **Dynamic Sitemap Route** — Added `functions/sitemap.xml.ts` edge route to merge newly published D1 projects into the sitemap dynamically.

### Session Security & Audit History

- **Strict Inactivity & Ceiling Policy** — Enforced 15-minute idle timeout and 12-hour absolute session ceiling on the server via `functions/lib/sessions.ts`.
- **Write Throttling** — Throttled `last_used_at` updates to at most once per 2 minutes, reducing D1 writes by >85% while bounding the effective inactivity window to 13–15 minutes.
- **Client Inactivity Modal** — Implemented `src/admin/useSessionTimeout.ts` with user activity detection, warning modal at 13 minutes, live 2-minute countdown, and one-click session renewal.
- **Explicit Keepalive Route** — Implemented `POST /api/admin/session` with mutation authentication.
- **Settings Activity Display Fix** — Replaced misleading static build timestamp with actual `session.lastUsedAt` and `session.expiresAt` in `SettingsView`.
- **Self-Healing Audit Logging** — Added resilient 2-phase insert in `functions/lib/auth-log.ts` to prevent silent write failures regardless of table column state.
- **Missing Audit Events** — Emitted `session_expired`, `session_rejected`, `media_uploaded`, `media_upload_failed`, `media_deleted`, and `media_delete_rejected`.
- **Immediate Activity UI Synchronization** — Synchronized `PublishingView`, `ProjectsView`, `ProfileView`, and `LinksView` mutations with the activity feed.

### Migrations & Release Tooling

- **Database Migrations** — Added `migrations/0004_auth_log_indexing.sql` (index on `auth_log(ts DESC)`) and `migrations/0005_media_assets.sql` (`media_assets` table).
- **Legacy Media Migration Tool** — Created `scripts/migrate-media-to-r2.mjs` with `--dry-run`, `--generate-sql`, and `--upload --remote`. Migrated and verified all 39 legacy assets (5.80 MB) to Cloudflare R2 with SHA-256 checksums.
- **Test Suite Expansion** — Added 13 new integration and unit tests across session security, auth logging, R2 media management, and edge publishing (135 tests passing).

## [2.0.0] — 2026-09-14

Stable release: the private D1-backed CMS and the Portfolio Control Center
admin console, with atomic publishing, deterministic generated artifacts,
and the ordered snapshot-sync deployment chain.

### Control Center

- **Portfolio Control Center** — hash-routed admin console (`#/overview`,
  `#/projects`, `#/profile`, `#/links`, `#/media`, `#/publishing`, `#/seo`,
  `#/activity`, `#/integrations`, `#/settings`) over a shared data provider
  (content + deploy state + activity loaded in parallel, session loss returns
  to login). Grouped sidebar with collapsible rail and mobile drawer.
- **Overview dashboard** — content counts, unpublished-change attention items,
  deploy status line, recent activity and a 14-day event pulse, all derived
  from live D1/KV/audit-log state. No fabricated analytics.
- **Content management** — project/profile/link editors with draft overlays,
  optimistic concurrency, archive/delete confirmations, and a discard path
  that returns records to their last published state without touching live
  content. Percent-encoded keys (e.g. "Hugging Face") resolve correctly.
- **Publishing view** — draft queue with per-record discard, publish
  confirmation, honest `pending_sync` deployment reporting with deploy-state
  polling, and plain-English recovery pointers.
- **SEO Center** — deterministic checks against the real `/robots.txt`,
  `/sitemap.xml` (lastmod vs content freshness) and `/_content_meta.json`
  artifacts; no invented scores.
- **Activity audit log** — paginated, filterable timeline over the `auth_log`
  table with masked IPs by default, explicit per-session full-IP reveal, and
  authoritative edge country (`CF-IPCountry`, `NULL` for older rows).
- **Integrations** — observed-truth service statuses; unconfigured services
  render "Not connected" instead of invented connectivity.
- **Media library** — browsable view of the build-generated media manifest
  (read-only; new assets arrive via the git → build pipeline).

### Pipeline & reliability

- **Ordered deployment** — publish promotes D1, then dispatches a
  `repository_dispatch` event (`GITHUB_SYNC_TOKEN`); the snapshot-sync
  workflow re-exports Production D1 in strict mode, regenerates
  `src/data/generated/content.json` and `public/sitemap.xml` only when they
  differ, commits with `[CI Skip]`, and only then triggers the Cloudflare
  Deploy Hook. Publish itself never calls the deploy hook, so a Pages build
  can never start from a stale snapshot. Failures are reported honestly and
  never block a publish or affect the live site.
- **Deterministic generators** — snapshot `exportedAt` derives from row
  timestamps and sitemap `lastmod` from the snapshot, so unchanged D1 state
  reproduces byte-identical files and the sync creates no empty commits.
- **MorseMate restoration** — the E2E reset path seeds from the committed
  snapshot via the canonical migrate script (the frozen `seeds/*.sql` export
  predates MorseMate and must never be used as a reset source).
- **Hugging Face routing fix** — admin API decodes percent-encoded route
  params once, guarded, so link keys containing spaces resolve in every
  Pages runtime.

### Security

- Login audit events carry the authoritative edge country code.
- Dev-only Turnstile fallback marker is asserted absent from production
  bundles by `verify-build`.

### Changed

- Version is sourced from `package.json` (2.0.0) at build time.

## [2.0.0-beta] — 2026-09-12 (superseded)

Development milestone on the road to 2.0.0: automatic repository
synchronization of generated CMS snapshot files after a publish, and
ordered deployment via the snapshot-sync workflow. Folded into the 2.0.0
stable release above; retained here as history.

## [2.0.0-draft] — Unreleased during development

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
