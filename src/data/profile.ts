export const profile = {
  hero: {
    name: 'Ali Faniani',
    role: 'Computer Science Graduate | Software Developer | AI, Backend & Web Development',
    intro: 'I build practical software systems at the intersection of Artificial Intelligence, backend engineering, web technologies, and automation.',
    avatarInitials: 'AF',
    avatarSrc: '/docs/profile/pic2.jpg',
  },
  about: [
    'I am a Computer Science graduate and software developer interested in building practical software systems at the intersection of Artificial Intelligence, backend engineering, web technologies, and automation.',
    'My development experience includes Python, FastAPI, REST APIs, React, TypeScript, JavaScript, Tailwind CSS, and cloud/serverless technologies including Cloudflare Workers, D1, and KV.',
  ],
  focus: ['Artificial Intelligence', 'Deep Learning', 'Computer Vision', 'Backend Development', 'Web Applications', 'Automation'],
  education: {
    degree: 'B.Sc. in Computer Science',
    school: 'Shahid Chamran University of Ahvaz',
    period: 'Graduated',
    notes: 'Focused on software development, Artificial Intelligence, and practical software systems.',
  },
  skillGroups: [
    { label: 'AI & Data', skills: ['Python', 'PyTorch', 'OpenCV', 'Computer Vision', 'Deep Learning'] },
    { label: 'Backend & Cloud', skills: ['FastAPI', 'REST APIs', 'Cloudflare Workers', 'D1', 'KV', 'SQL'] },
    { label: 'Web & Tools', skills: ['React', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Git', 'GitHub'] },
  ],
  projects: [
    { title: 'GreenHawk AI', description: 'An AI-powered web application for black-and-white image colorization using CNN, GAN, and diffusion-based deep learning approaches through a FastAPI backend and web interface.', href: 'https://github.com/Greenhawk5/GreenHawk-AI' },
    { title: 'HawkBucks', description: 'A Fortnite Save The World mission platform with a React and TypeScript web application, Cloudflare serverless backend, data processing, API integration, persistent storage, and automated workflows.', href: 'https://github.com/Greenhawk5/HawkBucks-Web' },
    { title: 'HawkBucks Bot', description: 'A Telegram automation system featuring scheduled jobs, mission data processing, image generation, reminders, webhooks, and persistent user and group management.', href: 'https://github.com/Greenhawk5/HawkBucks-Bot' },
  ],
  technologies: ['Python', 'FastAPI', 'PyTorch', 'OpenCV', 'Computer Vision', 'Deep Learning', 'React', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Cloudflare Workers', 'D1', 'KV', 'Git', 'GitHub', 'REST APIs', 'SQL'],
  certificates: [] as { title: string; provider: string; date: string; href: string }[],
  experience: [] as { role: string; org: string; period: string; summary: string }[],
} as const

export type SkillGroup = (typeof profile.skillGroups)[number]
