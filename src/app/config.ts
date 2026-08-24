export const SITE = {
  name: 'Ali Faniani',
  shortName: 'AF',
  role: 'Computer Science Graduate | Software Developer | AI, Backend & Web Development',
  tagline: 'Building practical software systems with AI and modern web technologies.',
  url: 'https://alifaniani.ir',
  email: 'ali.faniani@gmail.com',
  location: 'Jahrom County, Fars Province, Iran',
  availability: 'Open to freelance and full-time opportunities · Remote / Worldwide',
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
