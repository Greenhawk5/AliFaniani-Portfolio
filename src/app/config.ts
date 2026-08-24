export const SITE = {
  name: 'Ali Faniani',
  shortName: 'AF',
  role: 'Full-Stack & Creative Developer',
  tagline: 'I build interactive digital experiences.',
  url: 'https://alifaniani.dev',
  email: 'hello@alifaniani.dev',
  location: 'Available worldwide · Remote',
  availability: 'Open to freelance & full-time opportunities',
} as const

export const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Projects', to: '/projects' },
  { label: 'Contact', to: '/contact' },
] as const

export const STORAGE_KEYS = {
  settings: 'af-settings',
  time: 'af-time',
} as const
