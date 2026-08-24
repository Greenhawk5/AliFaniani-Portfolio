import bannerGreenhawk from '../../docs/project/GreenHawk AI/banner.png'
import shotGreenhawkHome from '../../docs/project/GreenHawk AI/home.png'
import shotGreenhawkModels from '../../docs/project/GreenHawk AI/models.png'
import shotGreenhawkComparison from '../../docs/project/GreenHawk AI/comparison.png'
import shotGreenhawkResults from '../../docs/project/GreenHawk AI/results.png'

import bannerHawkbucksWeb from '../../docs/project/HawkBucks - Web/hawkbucks-header.png'
import shotWebHome from '../../docs/project/HawkBucks - Web/home.png'
import shotWebMissions from '../../docs/project/HawkBucks - Web/v-bucks-missions.png'
import shotWebAbout from '../../docs/project/HawkBucks - Web/about.png'

import bannerHawkbucksBot from '../../docs/project/HawkBucks - Bot/banner.png'
import shotBotInChat from '../../docs/project/HawkBucks - Bot/in chat.png'
import shotBotMultiple from '../../docs/project/HawkBucks - Bot/multiple missions available.jpg'
import shotBotNone from '../../docs/project/HawkBucks - Bot/no mission.jpg'

export interface ProjectLink {
  label: string
  href: string
}

export interface TechGroup {
  label: string
  items: string[]
}

/** Optional per-project banner crop configuration. */
export interface BannerConfig {
  /** CSS object-position, e.g. '50% 30%'. Defaults to center. */
  objectPosition?: string
  /** Zoom level, 1 = no zoom. Defaults to 1. */
  scale?: number
}

export interface Project {
  slug: string
  title: string
  subtitle: string
  description: string
  category: string
  year: number
  banner: string
  bannerConfig?: BannerConfig
  screenshots: { src: string; caption: string }[]
  technologies: string[]
  techGroups: TechGroup[]
  features: string[]
  architecture: string[]
  repository: string
  demo?: string
  documentation?: string
}

export const projects: Project[] = [
  {
    slug: 'greenhawk-ai',
    title: 'GreenHawk AI',
    subtitle: 'AI-powered black & white image colorization platform',
    description:
      'An AI-powered web application for black-and-white image colorization using CNN, GAN, and diffusion-based deep learning approaches through a FastAPI backend.',
    category: 'AI · Computer Vision',
    year: 2025,
    banner: bannerGreenhawk,
    bannerConfig: { objectPosition: '50% 35%', scale: 1.05 },
    screenshots: [
      { src: shotGreenhawkHome, caption: 'Home interface' },
      { src: shotGreenhawkModels, caption: 'AI models overview' },
      { src: shotGreenhawkComparison, caption: 'Comparison studio' },
      { src: shotGreenhawkResults, caption: 'Generated results' },
    ],
    technologies: ['Python', 'FastAPI', 'PyTorch', 'OpenCV', 'Computer Vision', 'Deep Learning'],
    techGroups: [
      { label: 'Backend', items: ['Python', 'FastAPI', 'OpenCV'] },
      { label: 'AI', items: ['PyTorch', 'CNN', 'GAN', 'Diffusion'] },
      { label: 'Web', items: ['REST API', 'Responsive UI'] },
    ],
    features: [
      'Multiple colorization models: Zhang CNN, DeOldify GAN, and FLUX diffusion enhancement',
      'Comparison studio to process one grayscale image through several AI pipelines',
      'Side-by-side result comparison with downloadable outputs',
      'FastAPI backend with REST API architecture and background job management',
      'Image preprocessing, result management, and storage handling',
    ],
    architecture: [
      'User uploads a grayscale image through the web interface',
      'FastAPI backend receives the request and orchestrates AI services',
      'Colorization pipeline runs the selected models (Zhang / DeOldify / FLUX)',
      'Storage manager persists generated outputs',
      'Results are returned to the user for comparison and download',
    ],
    repository: 'https://github.com/Greenhawk5/GreenHawk-AI',
  },
  {
    slug: 'hawkbucks',
    title: 'HawkBucks',
    subtitle: 'Fortnite Save The World V-Bucks mission tracker',
    description:
      'A Fortnite Save The World mission tracking platform using React, TypeScript, Cloudflare serverless technologies, APIs, and automation.',
    category: 'Web · Cloud',
    year: 2025,
    banner: bannerHawkbucksWeb,
    screenshots: [
      { src: shotWebHome, caption: 'Mission dashboard' },
      { src: shotWebMissions, caption: 'V-Bucks missions history' },
      { src: shotWebAbout, caption: 'About page' },
    ],
    technologies: ['React', 'TypeScript', 'Cloudflare Workers', 'D1', 'KV', 'REST APIs'],
    techGroups: [
      { label: 'Frontend', items: ['React', 'TypeScript', 'Tailwind CSS'] },
      { label: 'Backend', items: ['Cloudflare Workers', 'REST APIs'] },
      { label: 'Data', items: ['Cloudflare KV', 'Cloudflare D1'] },
    ],
    features: [
      'Automatic detection of V-Bucks reward missions from Fortnite mission data',
      'Mission type, area, zone, and Power Level resolution into player-facing information',
      'Fast mission dashboard prioritizing reward, area, mission, and Power Level',
      'Persistent daily mission history stored in Cloudflare D1',
      'Historical summaries with previous-period comparisons',
      'Current mission response cached in Cloudflare KV',
    ],
    architecture: [
      'A Cloudflare Worker retrieves Fortnite mission world data on a schedule',
      'Mission alerts are filtered to detect V-Bucks rewards',
      'Mission types, Power Levels, and zones are resolved into readable results',
      'The current response is cached in KV and daily snapshots persist in D1',
      'The React frontend reads normalized mission and history data through the Worker API',
    ],
    repository: 'https://github.com/Greenhawk5/HawkBucks-Web',
    demo: 'https://hawkbucks.pages.dev',
  },
  {
    slug: 'hawkbucks-bot',
    title: 'HawkBucks Bot',
    subtitle: 'Telegram V-Bucks mission assistant',
    description:
      'A Telegram automation bot with scheduled jobs, mission data processing, reminders, image generation, and persistent user management.',
    category: 'Automation · Telegram',
    year: 2025,
    banner: bannerHawkbucksBot,
    screenshots: [
      { src: shotBotInChat, caption: 'Daily mission message in chat' },
      { src: shotBotMultiple, caption: 'Multiple missions available' },
      { src: shotBotNone, caption: 'No missions available today' },
    ],
    technologies: ['Python', 'Telegram Bot', 'Cloudflare Workers', 'D1', 'Automation'],
    techGroups: [
      { label: 'Backend', items: ['Python', 'Cloudflare Workers'] },
      { label: 'Automation', items: ['Scheduled jobs', 'Reminders', 'Webhooks'] },
      { label: 'Data', items: ['Cloudflare D1', 'Mission data pipeline'] },
    ],
    features: [
      'Telegram automation system for Fortnite Save The World V-Bucks missions',
      'Scheduled jobs that process mission data and deliver daily updates',
      'Reminder system for mission resets and availability',
      'Generated mission summary images sent directly to Telegram',
      'Persistent user, group, and channel management',
      'Cloudflare Workers architecture with D1 persistence',
    ],
    architecture: [
      'Scheduled jobs fetch and process Fortnite mission data',
      'The mission data pipeline detects V-Bucks rewards and resolves mission details',
      'Summary images are generated from the processed mission data',
      'Messages and reminders are delivered through the Telegram Bot API',
      'Users, groups, and channels are persisted for reliable delivery',
    ],
    repository: 'https://github.com/Greenhawk5/HawkBucks-Bot',
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
