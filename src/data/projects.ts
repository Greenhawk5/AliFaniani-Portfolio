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
    slug: 'greenhawk-ai',
    title: 'GreenHawk AI',
    tagline: 'AI-powered black-and-white image colorization',
    description: 'An AI-powered web application for black-and-white image colorization using CNN, GAN, and diffusion-based deep learning approaches through a FastAPI backend and web interface.',
    category: 'AI · Computer Vision',
    year: 2025,
    featured: true,
    accent: '#a06bff',
    accent2: '#ff5470',
    initial: 'AI',
    technologies: ['Python', 'FastAPI', 'PyTorch', 'OpenCV', 'Computer Vision', 'Deep Learning'],
    links: [{ label: 'GitHub', href: 'https://github.com/Greenhawk5/GreenHawk-AI' }],
    overview: 'GreenHawk AI combines deep learning approaches with a FastAPI backend and web interface for black-and-white image colorization.',
    goals: [], architecture: [], process: [], challenges: [], results: [],
  },
  {
    slug: 'hawkbucks',
    title: 'HawkBucks',
    tagline: 'Fortnite Save The World mission platform',
    description: 'A Fortnite Save The World mission platform with a React and TypeScript web application, Cloudflare serverless backend, data processing, API integration, persistent storage, and automated workflows.',
    category: 'Web · Cloud',
    year: 2025,
    featured: true,
    accent: '#39ff8b',
    accent2: '#37d5ff',
    initial: 'HB',
    technologies: ['React', 'TypeScript', 'Cloudflare Workers', 'D1', 'KV', 'REST APIs'],
    links: [{ label: 'GitHub', href: 'https://github.com/Greenhawk5/HawkBucks-Web' }],
    overview: 'HawkBucks brings mission data processing, API integration, persistent storage, and automated workflows together in a web platform.',
    goals: [], architecture: [], process: [], challenges: [], results: [],
  },
  {
    slug: 'hawkbucks-bot',
    title: 'HawkBucks Bot',
    tagline: 'Telegram automation for mission information',
    description: 'A Telegram automation system featuring scheduled jobs, mission data processing, image generation, reminders, webhooks, and persistent user and group management.',
    category: 'Automation · Telegram',
    year: 2025,
    featured: true,
    accent: '#37d5ff',
    accent2: '#39ff8b',
    initial: 'BOT',
    technologies: ['Python', 'Telegram Bot', 'Automation', 'Webhooks'],
    links: [{ label: 'GitHub', href: 'https://github.com/Greenhawk5/HawkBucks-Bot' }],
    overview: 'HawkBucks Bot provides Telegram automation with scheduled jobs, mission data processing, reminders, webhooks, and persistent management.',
    goals: [], architecture: [], process: [], challenges: [], results: [],
  },
]

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug)
}

export function getAdjacentProjects(slug: string) {
  const index = projects.findIndex((project) => project.slug === slug)
  if (index === -1) return { prev: undefined, next: undefined }
  return {
    prev: projects[(index - 1 + projects.length) % projects.length],
    next: projects[(index + 1) % projects.length],
  }
}
