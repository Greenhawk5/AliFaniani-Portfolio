import avatarImg from '../../docs/profile/pic2.webp'
import telegramCertImg from '../../docs/certificates/telegram-bot-certificate.webp'

export const assets = {
  avatar: avatarImg,
  telegramCertificate: telegramCertImg,
}

/**
 * Manual crop controls for the profile image.
 * - scale: zoom level (1 = no zoom, 1.2 = 20% zoom in)
 * - positionX / positionY: object-position, e.g. '50%' centers horizontally/vertically.
 *   Lower % moves the visible crop toward the top/left, higher % toward bottom/right.
 */
export const profileImageConfig = {
  scale: 1,
  positionX: '50%',
  positionY: '70%',
}

export type SkillLevel = 'Advanced' | 'Strong' | 'Familiar'

export interface SkillItem {
  name: string
  level: SkillLevel
}

export const skillLevels: Record<SkillLevel, number> = {
  Advanced: 90,
  Strong: 72,
  Familiar: 50,
}

export const profile = {
  hero: {
    name: 'Ali Faniani',
    role: 'Computer Science Graduate | Software Developer | AI, Backend & Web Development',
    intro: 'I build practical software systems at the intersection of Artificial Intelligence, backend engineering, web technologies, and automation.',
    avatarInitials: 'AF',
    avatarSrc: avatarImg,
  },
  about: [
    'I am a Computer Science graduate and software developer interested in building practical software systems at the intersection of Artificial Intelligence, backend engineering, web technologies, and automation.',
    'My development experience includes Python, FastAPI, REST APIs, React, TypeScript, JavaScript, Tailwind CSS, and cloud/serverless technologies including Cloudflare Workers, D1, and KV.',
  ],
  focus: ['Artificial Intelligence', 'Deep Learning', 'Computer Vision', 'Backend Engineering', 'Web Applications', 'Automation', 'Cloud Technologies'],
  education: {
    degree: 'B.Sc. in Computer Science',
    school: 'Shahid Chamran University of Ahvaz',
    period: 'Graduated',
    notes: 'Focused on software development, Artificial Intelligence, and practical software systems.',
  },
  skillGroups: [
    {
      label: 'AI & Computer Vision',
      skills: [
        { name: 'Python', level: 'Advanced' },
        { name: 'PyTorch', level: 'Strong' },
        { name: 'OpenCV', level: 'Strong' },
        { name: 'Computer Vision', level: 'Strong' },
        { name: 'Deep Learning', level: 'Strong' },
      ] as SkillItem[],
    },
    {
      label: 'Backend & Cloud',
      skills: [
        { name: 'FastAPI', level: 'Strong' },
        { name: 'REST APIs', level: 'Strong' },
        { name: 'Cloudflare Workers', level: 'Strong' },
        { name: 'D1', level: 'Familiar' },
        { name: 'KV', level: 'Familiar' },
        { name: 'SQL', level: 'Familiar' },
      ] as SkillItem[],
    },
    {
      label: 'Frontend & Tools',
      skills: [
        { name: 'React', level: 'Strong' },
        { name: 'TypeScript', level: 'Strong' },
        { name: 'JavaScript', level: 'Strong' },
        { name: 'Tailwind CSS', level: 'Strong' },
        { name: 'Git', level: 'Advanced' },
        { name: 'GitHub', level: 'Advanced' },
      ] as SkillItem[],
    },
  ],
  projects: [
    { slug: 'greenhawk-ai', title: 'GreenHawk AI', description: 'An AI-powered web application for black-and-white image colorization using CNN, GAN, and diffusion-based deep learning approaches through a FastAPI backend and web interface.', href: 'https://github.com/Greenhawk5/GreenHawk-AI' },
    { slug: 'hawkbucks', title: 'HawkBucks', description: 'A Fortnite Save The World mission platform with a React and TypeScript web application, Cloudflare serverless backend, data processing, API integration, persistent storage, and automated workflows.', href: 'https://github.com/Greenhawk5/HawkBucks-Web' },
    { slug: 'hawkbucks-bot', title: 'HawkBucks Bot', description: 'A Telegram automation system featuring scheduled jobs, mission data processing, image generation, reminders, webhooks, and persistent user and group management.', href: 'https://github.com/Greenhawk5/HawkBucks-Bot' },
  ],
  technologies: ['Python', 'FastAPI', 'PyTorch', 'OpenCV', 'Computer Vision', 'Deep Learning', 'React', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Cloudflare Workers', 'D1', 'KV', 'Git', 'GitHub', 'REST APIs', 'SQL'],
  certificates: [
    {
      title: 'Project-Oriented Course In Creating Telegram Bot Using Python',
      provider: 'Quera',
      date: 'March 2024',
      href: 'https://quera.org/certificate/QvyE6bky/',
      image: telegramCertImg,
    },
  ] as { title: string; provider: string; date: string; href: string; image: string }[],
  experience: [] as { role: string; org: string; period: string; summary: string }[],
} as const

export type SkillGroup = (typeof profile.skillGroups)[number]
