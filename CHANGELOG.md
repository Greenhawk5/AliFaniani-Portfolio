# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
