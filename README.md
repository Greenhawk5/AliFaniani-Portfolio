# Ali Faniani — Interactive 3D Portfolio

A premium interactive developer portfolio. The Home page is a fully procedural 3D
developer room rendered in real time with React Three Fiber, featuring a continuous
day/night cycle driven by the visitor's real clock, animated monitor scenes, a project
showcase board, and discoverable easter eggs.

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
│   ├── home/       3D overlay UI (hints, time chip, slider)
│   └── three/      3D scene components (room, desk, clock, board, …)
├── three/          engine code: time engine, env state, shaders, canvas screens
├── pages/          Home, About, Projects, ProjectDetail, Contact, NotFound
├── stores/         zustand stores (settings, time, ui, projects)
├── hooks/          shared hooks
├── data/           data-driven content (projects, profile, links)
└── services/       API clients
functions/api/      Cloudflare Pages Function (contact endpoint)
```

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

Add an entry to `src/data/projects.ts` — the Projects page, detail pages, sitemap
entries and the 3D showcase board all derive from that single data source.
