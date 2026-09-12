<div align="center">

<a href="https://alifaniani.ir">
  <img src="docs/profile/banner.webp" alt="Ali Faniani — Software Developer Portfolio" width="100%" />
</a>

# Ali Faniani — Portfolio

### Software Developer · AI · Backend · Web · Automation

<p>
  <a href="https://alifaniani.ir">🌐 Live Website</a>
  &nbsp;·&nbsp;
  <a href="https://alifaniani.ir/room">🧊 3D Developer Room</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Greenhawk5/AliFaniani-Portfolio">💻 Repository</a>
</p>

<p>
  <img src="https://img.shields.io/badge/status-v2.0.0-39ff8b?style=for-the-badge&labelColor=05060a" alt="Version 2.0.0" />
  <img src="https://img.shields.io/badge/license-proprietary-9CA3AF?style=for-the-badge&labelColor=05060a" alt="Proprietary license" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Three.js-r185-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js r185" />
  <img src="https://img.shields.io/badge/Cloudflare_Pages-hosted-F38020?style=for-the-badge&logo=cloudflarepages&logoColor=white" alt="Cloudflare Pages" />
</p>

<img src="https://badges.pufler.dev/visits/Greenhawk5/AliFaniani-Portfolio" alt="Repository visit counter" />

</div>

---

## ✦ About

This repository contains my personal developer portfolio — a production-focused web experience designed to present my work, technical interests, and projects in two complementary ways:

- **A lightweight portfolio:** fast, content-first, SEO-oriented, accessible and intentionally isolated from the 3D engine.
- **An interactive 3D developer room:** a separate `/room` experience where projects and portfolio content can be explored inside a fully rendered environment.

> **Build a portfolio that feels like a real product, not just a collection of pages.**

---

## ✦ Highlights

| | |
|---|---|
| ⚡ **Performance-first** | The landing experience does not load Three.js, WebGL or GLB assets. |
| 🔎 **SEO-first** | Route-specific HTML shells, canonicals, sitemap generation and structured data. |
| 🧊 **Interactive 3D** | A dedicated developer room powered by React Three Fiber and Three.js. |
| 🧩 **Code splitting** | The heavy 3D experience is isolated from the lightweight landing page. |
| 🛡️ **Hardened** | Security headers, CSP, session-based admin auth, CSRF, Turnstile and layered rate limiting. |
| ♿ **Accessible** | Semantic structure, keyboard focus states, reduced motion and graceful fallbacks. |
| ☁️ **Edge deployed** | Cloudflare Pages + Pages Functions + D1 + KV + Wrangler. |
| 🎨 **Data-driven** | Content lives in D1 (CMS source of truth) and reaches the public site via a validated build-time snapshot. |

---

## ✦ Tech Stack

### Frontend

<p>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&logo=reactrouter&logoColor=white" alt="React Router 7" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
</p>

### 3D & Motion

<p>
  <img src="https://img.shields.io/badge/Three.js-r185-000000?style=flat-square&logo=threedotjs&logoColor=white" alt="Three.js r185" />
  <img src="https://img.shields.io/badge/React_Three_Fiber-9-20232A?style=flat-square&logo=react&logoColor=white" alt="React Three Fiber 9" />
  <img src="https://img.shields.io/badge/Drei-10-20232A?style=flat-square&logo=react&logoColor=white" alt="Drei 10" />
  <img src="https://img.shields.io/badge/GSAP-3-88CE02?style=flat-square&logo=greensock&logoColor=111111" alt="GSAP 3" />
  <img src="https://img.shields.io/badge/Framer_Motion-13-111111?style=flat-square&logo=framer&logoColor=white" alt="Framer Motion 13" />
</p>

### State & Platform

<p>
  <img src="https://img.shields.io/badge/Zustand-5-433D3D?style=flat-square&logo=zustand&logoColor=white" alt="Zustand 5" />
  <img src="https://img.shields.io/badge/Zod-4-3C3C3D?style=flat-square&logoColor=white" alt="Zod 4" />
  <img src="https://img.shields.io/badge/Cloudflare_Pages-F38020?style=flat-square&logo=cloudflarepages&logoColor=white" alt="Cloudflare Pages" />
  <img src="https://img.shields.io/badge/Cloudflare_Functions-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Pages Functions" />
  <img src="https://img.shields.io/badge/Cloudflare_D1-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare D1" />
  <img src="https://img.shields.io/badge/Cloudflare_KV-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare KV" />
</p>

---

## ✦ CMS (v2.0.0)

A private, single-owner CMS is built into the site at `/admin`. It is deliberately unlisted: the only intentional entry point is a subtle key icon inside the site's Settings panel, plus the direct URL. It does not appear in navigation, the footer, the sitemap, robots.txt or any public metadata, and it is served with `X-Robots-Tag: noindex` and `Cache-Control: no-store`.

### Content model

Cloudflare D1 is the source of truth for three content kinds — **projects**, **profile sections** and **links** — each with `draft`, `published` and `archived` states:

- **Drafts** (including edits to already-published content, stored as a draft overlay) never appear on the public site.
- **Archived** content is excluded from the public snapshot and disappears from routes and the sitemap at the next successful build.
- Hard deletion is only permitted for draft/archived records; published content must be archived first.
- Media references use a build-generated **static media manifest** with stable `/media/...` URLs. There are no uploads and no R2 in v2.0.0.

### Publish workflow

Publishing is an explicit, atomic operation:

```text
Edit in /admin → validated draft in D1
      → Publish (Zod + media-reference validation, atomic D1 batch)
      → GitHub snapshot sync dispatched (repository_dispatch, non-fatal)
      → GitHub Actions: D1 snapshot export → generated files → commit [CI Skip]
      → Cloudflare Pages Deploy Hook (triggered by the workflow, after main is updated)
      → Pages build: D1 snapshot export → validation → static build
      → route HTML + sitemap + _content_meta.json → verification
      → deployment
```

The public site is **fully static** — it never queries D1 at runtime. Deployments are asynchronous: the CMS reports a queued deployment honestly and never claims the site has updated until a build has actually completed. A failed build leaves the previous deployment live.

### Repository snapshot synchronization (v2.0.1)

The repository mirrors the published D1 state in two generated files — `src/data/generated/content.json` and `public/sitemap.xml`. After a successful publish, the endpoint dispatches a `repository_dispatch` event (secret: `GITHUB_SYNC_TOKEN`, a fine-grained personal access token limited to this repository with Contents: Read/Write). A GitHub Actions workflow then re-exports Production D1 with the same strict exporter the production build uses, regenerates both files, commits them only when they differ, and — only after the snapshot state is on main — triggers the Cloudflare Pages Deploy Hook (secret: `CLOUDFLARE_DEPLOY_HOOK_URL`). Publish itself never calls the deploy hook, so a Pages build can never start from a stale generated snapshot:

- **Loop prevention:** the workflow triggers only on `repository_dispatch` / `workflow_dispatch` — never on push — and sync commits carry `[CI Skip]` so Pages skips them. The only dispatcher is the publish endpoint; builds cannot re-trigger the workflow.
- **Idempotency:** the generators are deterministic per D1 state (`exportedAt` and `lastmod` derive from row timestamps), so unchanged content produces byte-identical files and no commit.
- **Consistency:** the workflow always reads D1 at execution time (never a payload copy), runs one at a time (`concurrency` group), and therefore can never overwrite newer content with stale state.
- **Failure behavior:** synchronization and deployment are secondary to production. Dispatch or workflow failure never blocks a publish, never rolls back D1, and never affects the live site. The workflow triggers the deploy hook only if every prior step succeeded; if the hook itself fails, the snapshot commit remains intact and the workflow can be re-run to retry the deployment.
- `public/media-manifest.json` is generated **from repository media** (`docs/`), not from D1 — it is updated by committing media files, exactly as before. The sync never touches media files or dist artifacts.

### Authentication

Password-only login for the single owner (no usernames, no registration):

- `ADMIN_PASSWORD` is stored only as a Cloudflare Pages secret.
- Sessions are opaque 256-bit tokens; D1 stores only their SHA-256 hashes.
- Session cookies are `HttpOnly`, `Secure`, `SameSite=Strict` with sliding 7-day expiry (30-day hard cap).
- All admin mutations require a per-session CSRF token; login is protected by always-on Cloudflare Turnstile plus a layered rate limiter (in-memory burst cap + KV per-IP failed-attempt lockout).

---

## ✦ Selected Projects

<table>
<tr>
<td width="33%" align="center">
<a href="https://alifaniani.ir/projects/greenhawk-ai">
<img src="docs/project/GreenHawk%20AI/banner-1280.webp" alt="GreenHawk AI" width="100%" />
</a>
<h3>GreenHawk AI</h3>
<sub>AI image colorization platform</sub>
</td>

<td width="33%" align="center">
<a href="https://alifaniani.ir/projects/hawkbucks">
<img src="docs/project/HawkBucks%20-%20Web/hawkbucks-header-1280.webp" alt="HawkBucks" width="100%" />
</a>
<h3>HawkBucks</h3>
<sub>Fortnite V-Bucks mission tracker</sub>
</td>

<td width="33%" align="center">
<a href="https://alifaniani.ir/projects/hawkbucks-bot">
<img src="docs/project/HawkBucks%20-%20Bot/banner-1280.webp" alt="HawkBucks Bot" width="100%" />
</a>
<h3>HawkBucks Bot</h3>
<sub>Telegram automation bot</sub>
</td>
</tr>
</table>

---

## ✦ Portfolio Gallery

A visual overview of the portfolio interface and its interactive 3D environment.

### General

<table>
<tr>
<td width="50%" align="center">
<a href="docs/profile/home.webp"><img src="docs/profile/home.webp" alt="Portfolio home page" width="100%" /></a>
<br /><sub><b>Home</b> · Main portfolio landing page</sub>
</td>
<td width="50%" align="center">
<a href="docs/profile/about.webp"><img src="docs/profile/about.webp" alt="About page" width="100%" /></a>
<br /><sub><b>About</b> · Profile, skills and background</sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<a href="docs/profile/projects.webp"><img src="docs/profile/projects.webp" alt="Projects page" width="100%" /></a>
<br /><sub><b>Projects</b> · Project index and showcase</sub>
</td>
<td width="50%" align="center">
<a href="docs/profile/contact.webp"><img src="docs/profile/contact.webp" alt="Contact page" width="100%" /></a>
<br /><sub><b>Contact</b> · Contact experience</sub>
</td>
</tr>
</table>

### 3D Developer Room

<table>
<tr>
<td width="33%" align="center">
<a href="docs/profile/3D-Room%20(1).webp"><img src="docs/profile/3D-Room%20(1).webp" alt="3D developer room view 1" width="100%" /></a>
<br /><sub><b>Room I</b></sub>
</td>
<td width="33%" align="center">
<a href="docs/profile/3D-Room%20(2).webp"><img src="docs/profile/3D-Room%20(2).webp" alt="3D developer room view 2" width="100%" /></a>
<br /><sub><b>Room II</b></sub>
</td>
<td width="33%" align="center">
<a href="docs/profile/3D-Room%20(3).webp"><img src="docs/profile/3D-Room%20(3).webp" alt="3D developer room view 3" width="100%" /></a>
<br /><sub><b>Room III</b></sub>
</td>
</tr>
</table>

> 🧊 **Explore the room live:** [`alifaniani.ir/room`](https://alifaniani.ir/room)

---

## ✦ Architecture

```text
                              ┌─────────────────────┐
                              │       Browser       │
                              └──────────┬──────────┘
                                         │
                                         ▼
                              ┌─────────────────────┐
                              │   Cloudflare Pages  │
                              ├─────────────────────┤
                              │ Route HTML shells   │
                              │ React application   │
                              │ Static assets       │
                              └──────────┬──────────┘
                                         │
                       ┌─────────────────┼─────────────────┐
                       ▼                 ▼                 ▼
              ┌──────────────────┐ ┌──────────────┐ ┌────────────────┐
              │  Lightweight `/` │ │  Lazy /room  │ │   /admin       │
              │  SEO-first       │ │  Three.js/R3F│ │  (unlisted,    │
              │  No WebGL        │ │  GLB assets  │ │  auth-gated)   │
              │  Fast entry      │ │  Lazy scene  │ │  Lazy chunk    │
              └────────┬─────────┘ └──────┬───────┘ └───────┬────────┘
                       │                  │                  │
                       └──────────────────┼──────────────────┘
                                          ▼
                              ┌─────────────────────────┐
                              │     Pages Functions     │
                              │ /api/contact (Turnstile)│
                              │ /api/admin/* (auth+CSRF)│
                              └──────────┬──────────────┘
                                         ▼
                    ┌────────────────────┴───────────────────┐
                    ▼                                        ▼
           Turnstile + Resend                     ┌─────────────────────┐
           (contact)                              │   D1 (content,      │
                                                  │   sessions, audit)  │
                                                  │   KV (login limits) │
                                                  └─────────────────────┘
```

### Content data flow

```text
D1 (source of truth)
        │  build-time snapshot export (REST, read-only token)
        ▼
src/data/generated/content.json   ← validated with Zod schemas
        │
        ├── src/data facades (projects / profile / links)
        ├── Projects index + detail pages
        ├── 3D showcase board
        ├── Sitemap generation
        ├── Route metadata / HTML shells
        └── _content_meta.json → Pages middleware routing
```

The public runtime consumes only the generated snapshot — there is no SSR and no runtime D1 access from public pages. Zod schemas live in build/API/admin code only and never ship to the public bundle.

---

## ✦ Interactive 3D Room

The `/room` route is the signature experience of the portfolio.

### Environment

- Continuous day/night interpolation driven by the visitor's real clock.
- Manual time-of-day simulation through the settings panel.
- Custom GLSL sky material and interpolated atmosphere.
- Dynamic sunlight, ambient lighting, stars, city lights and RGB lighting.

### Interactive elements

- Project showcase board linked to portfolio projects.
- Monitor with canvas-rendered animated scenes.
- Wall clock and other focusable room elements.
- Interactive PC/RGB state.
- Cinematic camera presets.
- Free Camera mode with mouse look and WASD/Q/E movement.

### Rendering

- React Three Fiber + Three.js scene graph.
- Bloom, vignette and ACES filmic tone mapping on high-quality settings.
- Canvas textures for dynamic screens.
- Dust particles and ambient effects.
- Quality presets for different hardware levels.

### Delivery

The 3D scene is lazy-loaded and code-split from the landing page. Optimized assets and self-hosted decoders are delivered only when the room is entered.

---

## ✦ SEO

SEO is treated as part of the application architecture.

- **Route-specific HTML shells** provide correct initial metadata for every public route.
- **Canonical URLs** are normalized to HTTPS, the apex domain, clean paths and no query strings.
- **Sitemap generation** derives project URLs from the published content snapshot — no hand-maintained slug lists anywhere.
- **Structured data** includes `Person`, `WebSite`, `ProfilePage`, `ItemList`, project `CreativeWork` and the `/room` `WebPage` schema where appropriate.
- **Open Graph + Twitter metadata** are included for share previews.
- **Crawler-friendly HTML** includes a static bootstrap shell with a real H1 and crawlable navigation.
- **404 handling** returns real HTTP 404 responses with `X-Robots-Tag: noindex`.
- URL normalization handles trailing slashes, letter case and `.html` variants.

---

## ✦ Performance

The portfolio intentionally separates content performance from 3D richness.

- Landing page ships without Three.js, GLB assets or decoders.
- Route-level code splitting isolates the 3D scene to `/room`.
- GLB assets are optimized with Meshopt/Draco where applicable.
- Textures are resized and converted to optimized WebP assets where appropriate.
- Inter and JetBrains Mono are self-hosted.
- Quality tiers adapt DPR, shadows, particles, effects and update rates.
- The room loading veil is tied to actual asset readiness rather than fake progress.
- Reduced-motion preferences disable unnecessary animation and parallax.

> No formal benchmark suite is included. Performance should be evaluated against the production build with Lighthouse and browser DevTools.

---

## ✦ Accessibility

Accessibility is built into both the document structure and the interactive experience:

- Semantic headings and landmarks.
- A single meaningful H1 per page state.
- Real links and buttons for interactive controls.
- `focus-visible` states.
- Accessible labels for navigation and icon controls.
- Reduced-motion support.
- No-JS landing shell.
- WebGL failure fallback with full navigation.
- Descriptive alt text for content images.

The project does not claim formal WCAG certification.

---

## ✦ Security

Implemented security measures include:

- HSTS.
- Content Security Policy.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- `frame-ancestors 'none'`.
- `Referrer-Policy`.
- Restrictive `Permissions-Policy`.
- Cloudflare Turnstile client + server verification (contact + admin login).
- Per-IP contact endpoint rate limiting and layered admin-login rate limiting.
- Admin session auth with HttpOnly/Secure/SameSite=Strict cookies and CSRF protection on every mutation.
- `GITHUB_SYNC_TOKEN` is server-side only (used solely to dispatch the snapshot-sync workflow); the sync workflow itself uses the repository's built-in `GITHUB_TOKEN` with `contents: write`.
- Zod validation of all content writes; only published content ever reaches the public snapshot.
- Bundle isolation: Zod runtime and server-only code never ship in public chunks (build-verified).
- Input validation and HTML escaping before email delivery.
- Separation between public `VITE_*` values and server-only secrets.
- Production secrets stored through Cloudflare Pages rather than source control.

See [`SECURITY.md`](SECURITY.md) for responsible vulnerability reporting.

---

## ✦ Routes

| Route | Purpose |
|---|---|
| `/` | Lightweight landing page |
| `/about` | Profile, skills, education and certificates |
| `/projects` | Project index |
| `/projects/{slug}` | Individual project pages (derived from published content) |
| `/contact` | Contact form |
| `/room` | Interactive 3D developer room |
| `/admin` | Private CMS (unlisted; noindex + no-store) |
| Unknown routes | Real `404` + `X-Robots-Tag: noindex` |

---

## ✦ Project Structure

```text
AliFaniani-Portfolio/
├── src/
│   ├── admin/           # /admin CMS application (lazy-loaded, isolated chunk)
│   ├── app/             # Router, providers and site configuration
│   ├── components/
│   │   ├── home/        # Landing-page components
│   │   ├── layout/      # Navigation, footer and settings
│   │   ├── room/        # 3D room overlay / loading UI
│   │   ├── three/       # Room scene components
│   │   └── ui/          # Reusable UI components
│   ├── data/            # Generated content facades + route metadata
│   │   └── generated/   # content.json snapshot (build input)
│   ├── hooks/           # Metadata, JSON-LD and utility hooks
│   ├── lib/             # Zod content schemas (canonical validation source)
│   ├── pages/           # Route-level pages
│   ├── stores/          # Zustand stores
│   ├── styles/          # Global styles and fonts
│   └── three/           # 3D engine, shaders and environment logic
├── functions/
│   ├── api/             # /api/contact + /api/admin/* endpoints
│   └── lib/             # Session auth, CSRF, rate limiting, publish, D1 store
├── migrations/           # D1 schema migrations only
├── seeds/                # Content seed files (explicit, never auto-applied)
├── public/               # Fonts, icons, GLB/decoder, OG assets, _routes.json
├── docs/                 # Portfolio, project and certificate assets
├── scripts/              # Build orchestration, snapshot export, SEO tooling
├── tests/                # Vitest suite (unit + credential-dependent SEO E2E)
├── .github/              # CI workflow + Dependabot
├── LICENSE
├── NOTICE.md
├── SECURITY.md
├── CHANGELOG.md
├── package.json
└── README.md
```

---

## ✦ Getting Started

### Requirements

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/Greenhawk5/AliFaniani-Portfolio.git
cd AliFaniani-Portfolio
npm install
```

### Development

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Production preview

```bash
npm run preview
```

### Cloudflare-compatible local runtime

```bash
npx wrangler pages dev dist
```

---

## ✦ Environment Variables & Secrets

Create a local `.env` from `.env.example` when needed. Secrets never live in source control or `VITE_*` variables.

| Variable | Scope | Purpose |
|---|---|---|
| `VITE_SITE_URL` | Client | Canonical production URL |
| `VITE_TURNSTILE_SITE_KEY` | Client | Public Cloudflare Turnstile site key |
| `TURNSTILE_SECRET` | Server secret | Turnstile server verification (contact + admin login) |
| `RESEND_API_KEY` | Server secret | Contact-form email delivery |
| `EMAIL_FROM` / `EMAIL_TO` | Server secret | Contact email routing |
| `SITE_URL` | Server | URL shown in contact emails (optional) |
| `ADMIN_PASSWORD` | Server secret | Single-owner CMS credential |
| `DEPLOY_HOOK_URL` | Server secret | Cloudflare Pages Deploy Hook (publish trigger) |
| `CLOUDFLARE_ACCOUNT_ID` | Build env (Production) | D1 snapshot export target account |
| `D1_DATABASE_ID` | Build env (Production) | D1 snapshot export target database |
| `CLOUDFLARE_D1_READ_TOKEN` | Build env secret (Production) | Read-only D1 REST token for snapshot export |
| `GITHUB_SYNC_TOKEN` | Server secret (Production) | Fine-grained PAT (this repository only, Contents: Read/Write) for the post-publish `repository_dispatch` |
| `CLOUDFLARE_DEPLOY_HOOK_URL` | GitHub Actions secret | The same value as the Cloudflare `DEPLOY_HOOK_URL` — lets the snapshot-sync workflow trigger the Pages build after the snapshot is on main |
| `CMS_SNAPSHOT_MODE` | Build env (Production) | Set to `strict` in production — build fails if the D1 snapshot cannot be exported/validated |

**Local development** needs none of the production credentials: builds use the committed content snapshot (fallback with a warning), and `wrangler pages dev` reads secrets from `.dev.vars` (gitignored).

**Production** requires the strict snapshot mode above so a failed D1 export always fails the build — the previous successful deployment stays live.

---

## ✦ Development Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Orchestrated build: version → media manifest → D1 snapshot → validation → sitemap → tsc → vite → media copy → route HTML → content meta → verification |
| `npm run preview` | Preview the production build |
| `npx wrangler pages dev dist` | Run the Cloudflare-compatible local runtime (with local D1/KV) |
| `npm test` | Full test suite (unit + credential-dependent SEO E2E) |
| `npm run test:ci` | Credential-free test subset (excludes SEO E2E) |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |
| `npm run typecheck` | Run TypeScript checks |
| `npm run check:functions` | Check Pages Functions TypeScript |
| `npm run sitemap` | Regenerate the sitemap from the snapshot |
| `npm run snapshot:local` | Export a snapshot from the local D1 |
| `npm run media` | Regenerate the media manifest |
| `npm run verify:build` | Re-run build-output verification |
| `npm run deploy` | Build and deploy to Cloudflare Pages |

---

## ✦ Validation

The repository ships a Vitest test suite plus build-time verification.

- **Unit/static tests** (`npm run test:ci`): content schema validation, D1 store behavior, admin API (auth boundary, CSRF, CRUD, publish atomicity, draft overlays, archive/delete rules), snapshot export modes, sitemap/content-meta generation, bundle isolation, session security.
- **SEO E2E** (`npm test` — requires local admin credentials in `.dev.vars`): full lifecycle against local D1 — draft isolation, publish visibility, archive → 404, sitemap/route-HTML/content-meta integrity, security headers, Room isolation. Excluded from CI because it drives real child processes with credentials.
- **Build verification** (`scripts/verify-build.mjs`): route/`_routes.json` presence, content-meta ↔ snapshot consistency, media completeness, bundle isolation (no Zod runtime, no secret markers in public chunks), sitemap coverage.
- **Runtime checks**: `scripts/verify-route-html.mjs` and `scripts/verify-headers.mjs` against a running `wrangler pages dev` server.

No Lighthouse benchmark suite is included; performance should be evaluated against the production build with browser tooling.

---

## ✦ Deployment

The production site is deployed to **Cloudflare Pages** (Wrangler or Git integration).

```bash
npm run deploy
```

Production secrets are configured through Cloudflare Pages (never in source control):

```bash
wrangler pages secret put ADMIN_PASSWORD
wrangler pages secret put DEPLOY_HOOK_URL
wrangler pages secret put TURNSTILE_SECRET
wrangler pages secret put RESEND_API_KEY
wrangler pages secret put EMAIL_FROM
wrangler pages secret put EMAIL_TO
```

Production build environment variables (set in the Pages dashboard, Production environment): `CLOUDFLARE_ACCOUNT_ID`, `D1_DATABASE_ID`, `CLOUDFLARE_D1_READ_TOKEN` (read-only), and `CMS_SNAPSHOT_MODE=strict`.

After cutover, production builds export published content from D1 and validate it before building — a failed snapshot/validation/build never replaces the live site. CMS publishes trigger the configured Deploy Hook; deployments are asynchronous and the admin UI reports queue/failure states honestly.

---

## ✦ Content Management

Portfolio content is managed through the private `/admin` console rather than source edits:

1. Sign in (password + Turnstile).
2. Create or edit projects, profile sections and links — saved as drafts (edits to published content are stored as draft overlays).
3. Publish: all validated drafts are promoted to D1 atomically and the Deploy Hook queues a fresh production build.
4. The static public site regenerates from the new snapshot — routes, route HTML, sitemap and metadata all derive from published content automatically.

Media (banners, screenshots, avatars) references a generated static manifest; adding new images is a git commit followed by a build. Uploads/R2 are intentionally out of scope for v2.0.0.

---

## ✦ Repository Documentation

| File | Purpose |
|---|---|
| [`CHANGELOG.md`](CHANGELOG.md) | Version history and release notes |
| [`LICENSE`](LICENSE) | Proprietary license for original project work |
| [`NOTICE.md`](NOTICE.md) | Third-party asset attribution and licensing notes |
| [`SECURITY.md`](SECURITY.md) | Responsible vulnerability reporting |
| [`.github/dependabot.yml`](.github/dependabot.yml) | Automated npm dependency update configuration |

Third-party assets are not relicensed by this repository. See [`NOTICE.md`](NOTICE.md) for attribution and applicable terms.

---

## ✦ License

The original source code, visual design and project materials in this repository are **proprietary** — Copyright © 2026 Ali Faniani. All rights reserved.

The repository is publicly viewable for inspection, learning and inspiration. Viewing the code does **not** grant permission to reproduce, redistribute, republish, modify, sublicense, sell or create derivative works from the original project without prior written permission.

Third-party assets remain under their respective licenses and terms.

See [`LICENSE`](LICENSE) and [`NOTICE.md`](NOTICE.md).

---

## ✦ Author

**Ali Faniani** — Software Developer

<p>
  <a href="https://alifaniani.ir">Website</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Greenhawk5">GitHub</a>
  &nbsp;·&nbsp;
  <a href="https://www.linkedin.com/in/ali-faniani">LinkedIn</a>
  &nbsp;·&nbsp;
  <a href="https://huggingface.co/Greenhawk5">Hugging Face</a>
</p>

---

<div align="center">

<sub>Built with React, TypeScript, Three.js and Cloudflare Pages.</sub>

</div>
