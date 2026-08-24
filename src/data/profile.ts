export const profile = {
  hero: {
    name: 'Ali Faniani',
    role: 'Full-Stack & Creative Developer',
    intro:
      'I design and build interactive digital products — from real-time 3D web experiences to AI-powered platforms. I care about the details users feel but never notice.',
    avatarInitials: 'AF',
  },
  about: [
    'I am a full-stack developer with a strong focus on frontend engineering, interactive interfaces and the WebGL ecosystem. I enjoy working at the intersection of engineering and design, where technical decisions directly shape how a product feels.',
    'My background spans building production web applications, training and deploying machine-learning models, and crafting real-time 3D experiences in the browser. I gravitate toward hard problems: performance budgets, animation systems, state synchronization and developer experience.',
    'Outside of client work I build tools I use daily, contribute to open source, and constantly explore new corners of the web platform. This portfolio — an interactive 3D room built entirely in code — is the best example of how I think about software.',
  ],
  education: {
    degree: 'BSc in Computer Engineering',
    school: 'University — Computer Engineering Department',
    period: 'Graduated',
    notes:
      'Focused on software engineering, computer graphics and machine learning. Final project explored real-time rendering techniques on the web.',
  },
  skillGroups: [
    {
      label: 'Frontend',
      skills: [
        { name: 'React', level: 95 },
        { name: 'TypeScript', level: 92 },
        { name: 'Three.js / WebGL', level: 85 },
        { name: 'TailwindCSS', level: 90 },
        { name: 'Next.js', level: 80 },
      ],
    },
    {
      label: 'Backend & Cloud',
      skills: [
        { name: 'Node.js', level: 85 },
        { name: 'REST & WebSocket APIs', level: 88 },
        { name: 'Cloudflare Workers', level: 82 },
        { name: 'PostgreSQL', level: 78 },
        { name: 'Docker', level: 75 },
      ],
    },
    {
      label: 'AI & Data',
      skills: [
        { name: 'Python', level: 85 },
        { name: 'PyTorch', level: 78 },
        { name: 'Machine Learning', level: 80 },
        { name: 'Computer Vision', level: 72 },
      ],
    },
  ],
  certificates: [
    {
      title: 'Meta Front-End Developer',
      provider: 'Meta · Coursera',
      date: '2024',
      href: '#',
    },
    {
      title: 'Three.js Journey',
      provider: 'Bruno Simon',
      date: '2024',
      href: '#',
    },
    {
      title: 'Machine Learning Specialization',
      provider: 'DeepLearning.AI',
      date: '2025',
      href: '#',
    },
  ],
  experience: [
    {
      role: 'Freelance Full-Stack Developer',
      org: 'Independent',
      period: '2023 — Present',
      summary:
        'Designing and shipping web products for clients: interactive marketing sites, dashboards and AI integrations. Own the full cycle from architecture to deployment.',
    },
    {
      role: 'Frontend Developer',
      org: 'Product Studio',
      period: '2022 — 2023',
      summary:
        'Built and maintained React applications used by thousands of daily users. Led the migration to TypeScript and introduced a component design system.',
    },
  ],
} as const

export type SkillGroup = (typeof profile.skillGroups)[number]
