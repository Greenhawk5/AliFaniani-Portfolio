import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/ui/PageTransition'
import { Section, PageContainer } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ExternalLinkIcon, ArrowRightIcon } from '@/components/ui/icons'
import { profile } from '@/data/profile'
import { socialLinks } from '@/data/links'
import { Link } from 'react-router-dom'

export default function About() {
  useDocumentMeta({
    title: 'About',
    description:
      'About Ali Faniani — full-stack and creative developer. Skills, education, certificates and experience.',
  })

  return (
    <PageTransition>
      <PageContainer className="pt-28">
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
              <Link to="/projects">
                <Button>
                  View projects <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
              <a href={socialLinks[3].href}>
                <Button variant="outline">Get in touch</Button>
              </a>
            </div>
          </div>
          <div className="justify-self-center md:justify-self-end">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/15 via-panel to-violet/15 shadow-[0_0_60px_-18px_rgba(57,255,139,0.5)] md:h-56 md:w-56">
              <span className="font-mono text-6xl font-bold text-accent text-glow">
                {profile.hero.avatarInitials}
              </span>
              <span className="absolute -top-2 -right-2 h-3 w-3 animate-pulse-soft rounded-full bg-accent shadow-[0_0_12px_rgba(57,255,139,0.9)]" />
            </div>
          </div>
        </section>

        <Section title="Background" subtitle="Who I am">
          <div className="space-y-4">
            {profile.about.map((paragraph, i) => (
              <p key={i} className="max-w-3xl leading-relaxed text-frost/80">
                {paragraph}
              </p>
            ))}
          </div>
        </Section>

        <Section title="Skills" subtitle="What I work with">
          <div className="grid gap-5 md:grid-cols-3">
            {profile.skillGroups.map((group) => (
              <Card key={group.label} className="p-5">
                <h3 className="mb-4 font-mono text-xs tracking-[0.2em] text-accent uppercase">
                  {group.label}
                </h3>
                <ul className="space-y-3.5">
                  {group.skills.map((skill) => (
                    <li key={skill.name}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="text-frost/90">{skill.name}</span>
                        <span className="font-mono text-[11px] text-mist">{skill.level}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-edge">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent-dim to-accent shadow-[0_0_10px_rgba(57,255,139,0.4)]"
                          style={{ width: `${skill.level}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Education" subtitle="Foundation">
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{profile.education.degree}</h3>
                <p className="mt-1 text-sm text-mist">{profile.education.school}</p>
              </div>
              <Badge tone="accent">{profile.education.period}</Badge>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-frost/75">
              {profile.education.notes}
            </p>
          </Card>
        </Section>

        <Section title="Experience" subtitle="Where I have worked">
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
                <p className="mt-4 text-sm leading-relaxed text-frost/75">{job.summary}</p>
              </Card>
            ))}
          </div>
        </Section>

        <Section title="Certificates" subtitle="Continuous learning">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profile.certificates.map((cert) => (
              <Card key={cert.title} hover className="flex flex-col p-5">
                <h3 className="font-semibold text-frost">{cert.title}</h3>
                <p className="mt-1 text-sm text-mist">{cert.provider}</p>
                <div className="mt-auto flex items-center justify-between pt-5">
                  <Badge tone="cyan">{cert.date}</Badge>
                  <a
                    href={cert.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-accent transition-opacity hover:opacity-75"
                  >
                    View <ExternalLinkIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </Section>

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
