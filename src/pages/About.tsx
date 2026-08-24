import { useCallback, useEffect, useRef, useState } from 'react'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/ui/PageTransition'
import { Section, PageContainer } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ExternalLinkIcon, ArrowRightIcon } from '@/components/ui/icons'
import { profile, skillLevels, profileImageConfig, type SkillItem } from '@/data/profile'
import { socialLinks } from '@/data/links'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

const levelBarColor: Record<string, string> = {
  Advanced: 'bg-accent shadow-[0_0_10px_rgba(57,255,139,0.6)]',
  Strong: 'bg-accent/70',
  Familiar: 'bg-accent/40',
}

function SkillBar({ skill, index }: { skill: SkillItem; index: number }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const width = skillLevels[skill.level]

  return (
    <li ref={ref} className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-frost/90">{skill.name}</span>
        <span className="font-mono text-[10px] tracking-wider text-mist uppercase">
          {skill.level}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-edge/60">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-1000 ease-out',
            levelBarColor[skill.level]
          )}
          style={{
            width: visible ? `${width}%` : '0%',
            transitionDelay: `${index * 60}ms`,
          }}
        />
      </div>
    </li>
  )
}

function ProjectCarousel() {
  const projects = profile.projects
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => (i + dir + projects.length) % projects.length)
    },
    [projects.length]
  )

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => go(1), 5000)
    return () => clearInterval(id)
  }, [paused, go])

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
        setPaused(true)
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current !== null) {
          const dx = e.changedTouches[0].clientX - touchStartX.current
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          touchStartX.current = null
        }
      }}
      className="relative"
    >
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {projects.map((p, i) => (
            <article key={p.title} className="w-full shrink-0">
              <Card className="relative overflow-hidden p-7 md:p-10">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
                />
                <div className="relative">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-xs tracking-[0.25em] text-accent uppercase">
                      {String(i + 1).padStart(2, '0')} /{' '}
                      {String(projects.length).padStart(2, '0')}
                    </span>
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-accent transition-opacity hover:opacity-75"
                    >
                      Repository <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <h3 className="mt-4 text-2xl font-bold tracking-tight md:text-3xl">
                    {p.title}
                  </h3>
                  <p className="mt-4 max-w-2xl leading-relaxed text-frost/75">
                    {p.description}
                  </p>
                </div>
              </Card>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2">
          {projects.map((p, i) => (
            <button
              key={p.title}
              onClick={() => setIndex(i)}
              aria-label={`Go to ${p.title}`}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 cursor-pointer',
                i === index
                  ? 'w-8 bg-accent shadow-[0_0_8px_rgba(57,255,139,0.6)]'
                  : 'w-3 bg-edge hover:bg-accent/50'
              )}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" aria-label="Previous project" onClick={() => go(-1)}>
            ←
          </Button>
          <Button variant="outline" size="sm" aria-label="Next project" onClick={() => go(1)}>
            →
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function About() {
  useDocumentMeta({
    title: 'About',
    description:
      'About Ali Faniani — software developer focused on AI, backend engineering and modern web technologies. Skills, education, certificates and projects.',
  })

  return (
    <PageTransition>
      <PageContainer className="pt-28">
        {/* Hero */}
        <section className="grid items-center gap-10 py-14 md:grid-cols-[1fr_auto] md:py-20">
          <div>
            <p className="mb-3 font-mono text-xs tracking-[0.25em] text-accent uppercase">
              About me
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              {profile.hero.name}
            </h1>
            <p className="mt-2 text-lg text-mist">{profile.hero.role}</p>
            <p className="mt-6 max-w-xl leading-relaxed text-frost/85">
              {profile.hero.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/contact">
                <Button size="lg">
                  Get in touch <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/projects">
                <Button variant="outline" size="lg">
                  View projects
                </Button>
              </Link>
            </div>
          </div>
          <div className="justify-self-center p-3 md:justify-self-end md:p-0">
            <div className="relative flex h-48 w-48 items-center justify-center rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/15 via-panel to-violet/15 shadow-[0_0_60px_-18px_rgba(57,255,139,0.5)] md:h-56 md:w-56">
              <img
                src={profile.hero.avatarSrc}
                alt={`${profile.hero.name} profile`}
                className="h-full w-full rounded-3xl object-cover max-md:scale-[0.92]"
                style={{
                  transform: `scale(${profileImageConfig.scale})`,
                  objectPosition: `${profileImageConfig.positionX} ${profileImageConfig.positionY}`,
                }}
                loading="eager"
              />
              <span className="absolute -top-2.5 -right-2.5 h-3 w-3 animate-pulse-soft rounded-full bg-accent shadow-[0_0_12px_rgba(57,255,139,0.9)] max-md:-top-1.5 max-md:-right-1.5" />
            </div>
          </div>
        </section>

        {/* Background */}
        <Section title="Background" subtitle="Who I am">
          <div className="space-y-4">
            <p className="max-w-3xl leading-relaxed text-frost/80">
              I'm Ali Faniani, a Computer Science graduate and software
              developer focused on building practical software systems that
              combine Artificial Intelligence, backend engineering, and modern
              web technologies.
            </p>
            <p className="max-w-3xl leading-relaxed text-frost/80">
              My work spans AI and computer vision, backend development with
              Python and FastAPI, and full web applications built with React,
              TypeScript, and Tailwind CSS. I also work with cloud and
              serverless systems — including Cloudflare Workers, D1, and KV —
              and I enjoy building automation that removes repetitive work.
            </p>
            <p className="max-w-3xl leading-relaxed text-frost/80">
              I care about shipping software that works end to end: from data
              and models, through APIs and infrastructure, to clean and usable
              interfaces.
            </p>
          </div>
        </Section>

        {/* Skills */}
        <Section title="Skills" subtitle="What I work with">
          <div className="grid gap-5 md:grid-cols-3">
            {profile.skillGroups.map((group) => (
              <Card key={group.label} hover className="p-6">
                <h3 className="mb-5 font-mono text-xs tracking-[0.2em] text-accent uppercase">
                  {group.label}
                </h3>
                <ul className="space-y-4">
                  {group.skills.map((skill, i) => (
                    <SkillBar key={skill.name} skill={skill} index={i} />
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Section>

        {/* Focus */}
        <Section title="Focus" subtitle="Areas of focus">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {profile.focus.map((item, i) => (
              <div
                key={item}
                className="group relative overflow-hidden rounded-2xl border border-edge bg-panel/60 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_0_30px_-10px_rgba(57,255,139,0.4)]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-3 bottom-3.5 select-none font-mono text-[4.5rem] leading-none font-bold tracking-tighter text-accent/[0.06] transition-colors duration-300 group-hover:text-accent/[0.12] md:right-3 md:-bottom-4 md:text-[6.5rem]"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="relative mb-3 block h-px w-8 bg-accent/60 transition-all duration-300 group-hover:w-14" />
                <p className="relative text-sm font-medium text-frost/90">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Projects carousel */}
        <Section title="Projects" subtitle="Selected work">
          <ProjectCarousel />
        </Section>

        {/* Education */}
        <Section title="Education" subtitle="Foundation">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">
                  {profile.education.degree}
                </h3>
                <p className="mt-1 text-sm text-mist">
                  {profile.education.school}
                </p>
              </div>
              <Badge tone="accent">{profile.education.period}</Badge>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-frost/75">
              Focus: Software Development, Artificial Intelligence, Practical
              Software Systems
            </p>
          </Card>
        </Section>

        {/* Experience */}
        <Section title="Experience" subtitle="Where I have worked">
          {profile.experience.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 font-mono text-lg text-accent">
                {'</>'}
              </span>
              <h3 className="text-base font-semibold text-frost">
                No professional employment history added yet.
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-frost/60">
                My experience so far comes from academic projects, personal
                products, and open-source work — some of which you can explore
                in the projects above.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {profile.experience.map((job) => (
                <Card key={job.role} className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{job.role}</h3>
                      <p className="mt-1 text-sm text-mist">{job.org}</p>
                    </div>
                    <Badge>{job.period}</Badge>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-frost/75">
                    {job.summary}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Section>

        {/* Certificates */}
        <Section title="Certificates" subtitle="Continuous learning">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {profile.certificates.map((cert) => (
              <Card key={cert.title} hover className="flex flex-col overflow-hidden">
                <a
                  href={cert.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative block overflow-hidden border-b border-edge"
                >
                  <img
                    src={cert.image}
                    alt={`${cert.title} certificate`}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-void/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </a>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-sm leading-snug font-semibold text-frost">
                    {cert.title}
                  </h3>
                  <p className="mt-1 text-sm text-mist">{cert.provider}</p>
                  <div className="mt-auto flex items-center justify-between pt-5">
                    <Badge tone="cyan">{cert.date}</Badge>
                    <a
                      href={cert.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent transition-opacity hover:opacity-75"
                    >
                      Verify <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* Elsewhere */}
        <Section title="Elsewhere" subtitle="Find me online" className="pb-20">
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  {s.label} <ExternalLinkIcon className="h-3.5 w-3.5" />
                </Button>
              </a>
            ))}
          </div>
        </Section>
      </PageContainer>
    </PageTransition>
  )
}
