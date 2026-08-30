const envSiteUrl = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, '')

export const SITE = {
  name: 'Ali Faniani',
  shortName: 'AF',
  role: 'Computer Science Graduate | Software Developer | AI, Backend & Web Development',
  shortRole: 'Software Developer',
  tagline: 'Building practical software systems with AI and modern web technologies.',
  // Production URL, overridable via VITE_SITE_URL (see .env.example).
  url: envSiteUrl || 'https://alifaniani.ir',
  // Default Open Graph / Twitter share image (lives in public/).
  ogImageUrl: '/og-image.webp',
  email: 'ali.faniani@gmail.com',
  location: 'Jahrom County, Fars Province, Iran',
  availability: 'Freelance & full-time work · Remote / Worldwide',
} as const


export const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Projects', to: '/projects' },
  { label: 'Room', to: '/room' },
  { label: 'Contact', to: '/contact' },
] as const

export const STORAGE_KEYS = {
  settings: 'af-settings',
  time: 'af-time',
} as const
