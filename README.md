# Ali Faniani — Portfolio

A premium developer portfolio. The root route (`/`) is a lightweight, SEO-first
landing page presenting Ali's identity, focus areas and projects. The signature
interactive experience — a fully procedural 3D developer room rendered in real
time with React Three Fiber, featuring a continuous day/night cycle driven by
the visitor's real clock, animated monitor scenes, a project showcase board,
and discoverable easter eggs — lives at `/room` and is code-split so it never
loads on the landing page.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, React Router, TailwindCSS 4
- **3D:** Three.js, React Three Fiber, Drei, custom GLSL sky shader, canvas-texture rendering
- **Animation:** GSAP (camera cinematics), Framer Motion (UI)
- **State:** Zustand with localStorage persistence
- **Backend:** Cloudflare Pages Functions (contact API)
- **Hosting:** Cloudflare Pages

## Getting Started

```bash
npm install
npm run dev        # start dev server
npm run build      # typecheck + production build
npm run preview    # preview the production build
npm run lint       # eslint
npm run format     # prettier
```

## Architecture Overview

```
src/
├── app/            router, providers, site config
├── components/
│   ├── ui/         reusable design-system components
│   ├── layout/     navbar, footer, settings panel
│   ├── room/       3D room overlay UI (hints, time chip, slider), loading veil, room content layer
│   └── three/      3D scene components (room, desk, clock, board, …)
├── three/          engine code: time engine, env state, shaders, canvas screens
├── pages/          Home (landing), Room (3D experience), About, Projects, ProjectDetail, Contact, NotFound
├── stores/         zustand stores (settings, time, ui, projects)
├── hooks/          shared hooks
├── data/           data-driven content (projects, profile, links)
└── services/       API clients
functions/api/      Cloudflare Pages Function (contact endpoint)
```

### Routes

- `/` — lightweight landing page (no Three.js; fast first load, SEO-first)
- `/room` — the interactive 3D developer room (lazy-loaded, code-split)
- `/about`, `/projects`, `/projects/{slug}`, `/contact` — portfolio content pages

### Time System

A single normalized value (0–24h) is sampled per frame against a keyframed
environment model. Sun position, sky gradients, light intensities, RGB strength,
stars and city lights are all interpolated continuously — there are no discrete
day/night states. Live (local or UTC) and simulation modes share the same engine.

### Performance

Three quality tiers (High / Medium / Performance) control DPR, shadows, particles,
bloom and screen-update rates, with automatic device detection and a manual
override in the settings panel. Reduced-motion preferences disable camera parallax
and ambient animation.

## Adding a Project

Add an entry to `src/data/projects.ts` — the Projects page, detail pages and the 3D showcase board all derive from that single data source.

`npm run build` regenerates `public/sitemap.xml` from that same file (`scripts/generate-sitemap.mjs`), so the sitemap can never drift from the real routes.

One manual copy of the valid project slugs remains in `functions/_middleware.js` (`PROJECT_SLUGS`) — the Cloudflare Pages middleware uses it to serve real HTTP 404s for unknown routes and to redirect trailing slashes / uppercase paths. Update that list when adding, renaming or removing a project.
