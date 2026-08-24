export interface ProjectLink {
  label: string
  href: string
}

export interface ProjectSection {
  challenge: string
  solution: string
}

export interface Project {
  slug: string
  title: string
  tagline: string
  description: string
  category: string
  year: number
  featured: boolean
  accent: string
  accent2: string
  initial: string
  technologies: string[]
  links: ProjectLink[]
  overview: string
  goals: string[]
  architecture: string[]
  process: ProjectSection[]
  challenges: string[]
  results: string[]
}

export const projects: Project[] = [
  {
    slug: 'interactive-3d-portfolio',
    title: 'Interactive 3D Portfolio',
    tagline: 'A living developer room in the browser',
    description:
      'A cinematic WebGL portfolio where visitors explore an interactive 3D developer room with a continuous day/night cycle, animated monitor scenes and discoverable interactions.',
    category: 'WebGL · Frontend',
    year: 2026,
    featured: true,
    accent: '#39ff8b',
    accent2: '#37d5ff',
    initial: '3D',
    technologies: [
      'React',
      'TypeScript',
      'Three.js',
      'React Three Fiber',
      'GSAP',
      'Zustand',
      'TailwindCSS',
      'Cloudflare Pages',
    ],
    links: [{ label: 'GitHub', href: 'https://github.com/alifaniani' }],
    overview:
      'Most portfolios are lists of cards. This project turns the portfolio itself into the flagship product: a fully interactive 3D room rendered in real time, driven by a continuous time engine that mirrors the visitor’s real clock. Every object — the project board, the monitor, the wall clock — is both a piece of atmosphere and a functional navigation surface.',
    goals: [
      'Create an unforgettable first impression within the first three seconds',
      'Prove advanced WebGL and React Three Fiber engineering skills',
      'Keep full accessibility through a persistent conventional navbar',
      'Run smoothly on mid-range laptops and mobile devices',
    ],
    architecture: [
      'React 19 + TypeScript + Vite application shell with React Router',
      'React Three Fiber scene graph composed from independent room components',
      'Pure TypeScript time engine: keyframed day/night states with smooth interpolation',
      'Canvas-texture rendering pipeline for animated screens (monitor, board, clock)',
      'Zustand stores for settings, time mode and interaction state with persistence',
      'Quality tier system (high / medium / performance) with device auto-detection',
    ],
    process: [
      {
        challenge:
          'The day/night cycle must never snap between states — lighting, sky and mood have to flow continuously.',
        solution:
          'A normalized 0–24h value drives a keyframe interpolator that blends sun intensity, sky gradients, RGB strength and shadow direction every frame, so any two moments of the day are connected by a smooth gradient.',
      },
      {
        challenge:
          'Animated screens (VS Code, terminal, GitHub, fake update) needed to look alive without video assets.',
        solution:
          'A canvas-texture pipeline draws procedural UI animations — typing effects, contribution grids, progress bars — and uploads them as emissive screen textures at a throttled frame rate.',
      },
    ],
    challenges: [
      'Balancing visual richness against a strict frame budget on integrated GPUs',
      'Making 3D interactions discoverable without breaking the calm atmosphere',
      'Keeping the bundle lean by building the entire room procedurally instead of shipping heavy GLB assets',
    ],
    results: [
      'Stable 60 FPS on mid-range hardware at high quality, with a graceful performance tier for weaker devices',
      'Zero external 3D assets — the full scene is generated in code',
      'A portfolio that doubles as the strongest technical case study in the portfolio',
    ],
  },
  {
    slug: 'ai-photo-colorization',
    title: 'AI Photo Colorization',
    tagline: 'Bringing black-and-white memories back to life',
    description:
      'A deep-learning service that colorizes grayscale photos through a web interface, with a training pipeline, REST API and a polished upload-and-compare experience.',
    category: 'AI · Full-Stack',
    year: 2025,
    featured: true,
    accent: '#a06bff',
    accent2: '#ff5470',
    initial: 'AI',
    technologies: ['Python', 'PyTorch', 'FastAPI', 'React', 'Docker', 'Cloudflare'],
    links: [
      { label: 'GitHub', href: 'https://github.com/alifaniani' },
      { label: 'Demo', href: '#' },
    ],
    overview:
      'A photo colorization platform that turns grayscale images into realistic color using a convolutional neural network trained in the Lab color space. The product wraps the model in a fast API and a clean web UI where users drag in a photo, watch the inference progress and compare before/after with an interactive slider.',
    goals: [
      'Train a colorization network that produces believable skin tones and skies',
      'Serve inference with sub-second latency for typical photos',
      'Design an interface that makes the AI feel magical, not technical',
    ],
    architecture: [
      'U-Net style generator trained on ImageNet subsets in the Lab color space',
      'FastAPI inference service with ONNX-optimized model export',
      'React front end with drag-and-drop upload and a before/after comparison slider',
      'Dockerized deployment with queue-based batching for burst traffic',
    ],
    process: [
      {
        challenge:
          'Early models produced desaturated, brownish results on landscapes.',
        solution:
          'Switched to a perceptual loss combining classification loss over quantized ab bins with a colorfulness regularizer, which dramatically improved vibrancy.',
      },
      {
        challenge: 'Cold-start inference on the server was too slow for a demo.',
        solution:
          'Exported the trained weights to ONNX and warmed worker processes at startup, cutting first-token latency from 4s to under 900ms.',
      },
    ],
    challenges: [
      'Handling high-resolution uploads without exhausting worker memory',
      'Communicating model confidence honestly in the UI',
    ],
    results: [
      'Under one second colorization for 1024px images on a single CPU worker',
      'Thousands of test colorizations with consistent skin and sky quality',
    ],
  },
  {
    slug: 'realtime-chat-platform',
    title: 'Realtime Chat Platform',
    tagline: 'Presence, messaging and rooms at scale',
    description:
      'A realtime messaging platform with rooms, typing indicators, presence and message history, built on WebSockets with a resilient offline-first client.',
    category: 'Full-Stack · Realtime',
    year: 2025,
    featured: true,
    accent: '#37d5ff',
    accent2: '#39ff8b',
    initial: 'RC',
    technologies: ['React', 'TypeScript', 'Node.js', 'WebSocket', 'Redis', 'PostgreSQL'],
    links: [{ label: 'GitHub', href: 'https://github.com/alifaniani' }],
    overview:
      'A production-grade chat system exploring the hard parts of realtime software: delivery guarantees, presence synchronization, reconnection storms and optimistic UI. The client keeps working through flaky networks with an offline queue, while the server fans out messages through a Redis pub/sub layer.',
    goals: [
      'Deliver messages with at-least-once semantics and client-side deduplication',
      'Keep the UI responsive and optimistic during network loss',
      'Support thousands of concurrent connections per node',
    ],
    architecture: [
      'WebSocket gateway with heartbeats and automatic resubscription',
      'Redis pub/sub fan-out across horizontally scalable gateway instances',
      'PostgreSQL message store with cursor-based history pagination',
      'React client with optimistic sends, retry queue and conflict-free merges',
    ],
    process: [
      {
        challenge:
          'Reconnect storms after server restarts briefly overwhelmed the database with history requests.',
        solution:
          'Introduced request coalescing and a short jittered backoff per client, flattening the spike by roughly 90%.',
      },
      {
        challenge: 'Typing indicators generated excessive event traffic in busy rooms.',
        solution:
          'Throttled indicator events to one per client per two seconds with auto-expiry, cutting chatter without perceptible UX loss.',
      },
    ],
    challenges: [
      'Guaranteeing ordering across multiple gateway nodes',
      'Designing read-state sync that survives device switches',
    ],
    results: [
      'Sustained 5k concurrent connections per node in load tests',
      'Message delivery latency under 80ms at the 95th percentile',
    ],
  },
  {
    slug: 'devboard-task-dashboard',
    title: 'DevBoard',
    tagline: 'A keyboard-first task dashboard for developers',
    description:
      'A fast, keyboard-driven task board with command palette, filters and analytics views, designed to feel like a native editor rather than a web app.',
    category: 'Frontend · Productivity',
    year: 2024,
    featured: false,
    accent: '#ffb454',
    accent2: '#a06bff',
    initial: 'DB',
    technologies: ['React', 'TypeScript', 'Zustand', 'TailwindCSS', 'Vite'],
    links: [
      { label: 'GitHub', href: 'https://github.com/alifaniani' },
      { label: 'Demo', href: '#' },
    ],
    overview:
      'DevBoard is a personal productivity tool built around one belief: developers think in keyboards, not mouse clicks. Every action — creating tasks, switching filters, jumping between views — is reachable through a command palette with fuzzy search, and the board state persists locally with instant startup.',
    goals: [
      'Every core action under two keystrokes via the command palette',
      'Instant startup with zero backend dependency',
      'A visual design that stays out of the way during deep work',
    ],
    architecture: [
      'Zustand store with localStorage persistence and schema migration',
      'Command registry pattern connecting palette entries to typed actions',
      'Virtualized lists for smooth performance with thousands of tasks',
      'Analytics view computing streaks and completion trends locally',
    ],
    process: [
      {
        challenge:
          'The palette needed to feel instant while filtering hundreds of commands.',
        solution:
          'Precomputed a lightweight fuzzy-match index and memoized scoring, keeping keystroke-to-render under one frame.',
      },
    ],
    challenges: ['Designing undo semantics that span multiple store slices'],
    results: [
      'Sub-100ms interaction latency across all core flows',
      'Adopted as a daily driver with a streak of 200+ days of use',
    ],
  },
]

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}

export function getAdjacentProjects(slug: string) {
  const index = projects.findIndex((p) => p.slug === slug)
  if (index === -1) return { prev: undefined, next: undefined }
  return {
    prev: projects[(index - 1 + projects.length) % projects.length],
    next: projects[(index + 1) % projects.length],
  }
}
