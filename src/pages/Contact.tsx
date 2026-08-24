import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'
import { PageTransition } from '@/components/ui/PageTransition'
import { PageContainer } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { AlertIcon, CheckIcon, MailIcon } from '@/components/ui/icons'
import { socialLinks } from '@/data/links'
import { SITE } from '@/app/config'
import { sendContactMessage, type ContactFormData } from '@/services/contactService'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
    }
  }
}

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

type FormErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'message', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function validate(data: ContactFormData): FormErrors {
  const errors: FormErrors = {}
  if (!data.firstName.trim()) errors.firstName = 'First name is required.'
  else if (data.firstName.length > 80) errors.firstName = 'Too long (max 80 characters).'
  if (!data.lastName.trim()) errors.lastName = 'Last name is required.'
  else if (data.lastName.length > 80) errors.lastName = 'Too long (max 80 characters).'
  if (!data.email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_RE.test(data.email)) errors.email = 'Enter a valid email address.'
  if (!data.message.trim()) errors.message = 'Message is required.'
  else if (data.message.trim().length < 10) errors.message = 'Message is too short (min 10 characters).'
  else if (data.message.length > 4000) errors.message = 'Message is too long (max 4000 characters).'
  return errors
}

export default function Contact() {
  useDocumentMeta({
    title: 'Contact',
    description: `Contact Ali Faniani — ${SITE.availability}.`,
  })

  const [form, setForm] = useState<ContactFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
    company: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [serverError, setServerError] = useState<string>('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || status === 'success') return
    let cancelled = false
    const renderTurnstile = () => {
      if (
        cancelled ||
        !turnstileContainerRef.current ||
        !window.turnstile ||
        turnstileWidgetIdRef.current
      ) {
        return
      }
      turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        action: 'contact',
        theme: 'dark',
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      })
    }

    const script = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]') ?? (() => {
      const newScript = document.createElement('script')
      newScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      newScript.async = true
      newScript.defer = true
      newScript.dataset.turnstile = 'true'
      document.head.appendChild(newScript)
      return newScript
    })()
    script.addEventListener('load', renderTurnstile)
    if (window.turnstile) {
      renderTurnstile()
    }
    return () => {
      cancelled = true
      script.removeEventListener('load', renderTurnstile)
      if (turnstileWidgetIdRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetIdRef.current)
      }
      turnstileWidgetIdRef.current = null
    }
  }, [status === 'success'])

  const resetTurnstile = () => {
    if (turnstileWidgetIdRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetIdRef.current)
    }
    setTurnstileToken('')
  }

  const update = (field: keyof ContactFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    if (errors[field as keyof FormErrors]) {
      setErrors((er) => ({ ...er, [field]: undefined }))
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const validation = validate(form)
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setStatus('error')
      setServerError('Please complete the captcha verification.')
      return
    }
    setStatus('sending')
    setServerError('')
    try {
      await sendContactMessage(form, turnstileToken || undefined)
      setTurnstileToken('')
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setServerError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
      resetTurnstile()
    }
  }

  return (
    <PageTransition>
      <PageContainer className="pt-28 pb-20">
        <header className="mb-10">
          <p className="mb-3 font-mono text-xs tracking-[0.25em] text-accent uppercase">
            Contact
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Let&apos;s talk</h1>
          <p className="mt-4 max-w-xl leading-relaxed text-mist">
            Have a project in mind, a question, or just want to say hi? My inbox is open —
            I usually reply within a day.
          </p>
        </header>

        <div className="grid min-w-0 gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div className="min-w-0 space-y-4">
            <Card className="p-6">
              <h2 className="font-mono text-xs tracking-[0.2em] text-mist uppercase">
                Direct
              </h2>
              <a
                href={`mailto:${SITE.email}`}
                className="mt-3 inline-flex items-center gap-2 text-frost transition-colors hover:text-accent"
              >
                <MailIcon className="h-4 w-4 text-accent" />
                <span className="font-mono text-sm">{SITE.email}</span>
              </a>
              <p className="mt-5 font-mono text-xs tracking-[0.2em] text-mist uppercase">
                Availability
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-frost/85">
                <span className="h-2 w-2 animate-pulse-soft rounded-full bg-accent shadow-[0_0_10px_rgba(57,255,139,0.9)]" />
                {SITE.availability}
              </p>
              <p className="mt-1 text-sm text-mist">{SITE.location}</p>
            </Card>

            <Card className="p-6">
              <h2 className="font-mono text-xs tracking-[0.2em] text-mist uppercase">
                Elsewhere
              </h2>
              <ul className="mt-3 space-y-2">
                {socialLinks.map((s) => (
                  <li key={s.label}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-frost/85 transition-colors hover:text-accent"
                    >
                      {s.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="min-w-0 p-6 md:p-8">
            {status === 'success' ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 py-14 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent shadow-[0_0_30px_-8px_rgba(57,255,139,0.7)]">
                  <CheckIcon className="h-6 w-6" />
                </span>
                <h2 className="text-xl font-semibold">Message sent</h2>
                <p className="max-w-sm text-sm text-mist">
                  Thanks for reaching out — I will get back to you shortly.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setForm({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      message: '',
                      company: '',
                    })
                    setErrors({})
                    setServerError('')
                    resetTurnstile()
                    setStatus('idle')
                  }}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="First name"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={update('firstName')}
                    error={errors.firstName}
                    maxLength={80}
                  />
                  <Input
                    label="Last name"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={update('lastName')}
                    error={errors.lastName}
                    maxLength={80}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="Email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={update('email')}
                    error={errors.email}
                    maxLength={254}
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    autoComplete="tel"
                    optional
                    value={form.phone}
                    onChange={update('phone')}
                    maxLength={40}
                  />
                </div>

                <div className="hidden" aria-hidden="true">
                  <label htmlFor="company">Company</label>
                  <input
                    id="company"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.company}
                    onChange={update('company')}
                  />
                </div>

                <Textarea
                  label="Message"
                  value={form.message}
                  onChange={update('message')}
                  error={errors.message}
                  maxLength={4000}
                  placeholder="Tell me about your project, timeline and goals…"
                />

                {TURNSTILE_SITE_KEY && (
                  <div
                    ref={turnstileContainerRef}
                    className="turnstile-container"
                    aria-label="Security verification"
                  />
                )}

                {status === 'error' && (
                  <p className="flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    {serverError}
                  </p>
                )}

                <Button type="submit" size="lg" disabled={status === 'sending'} className="w-full sm:w-auto">
                  {status === 'sending' ? (
                    <>
                      <Spinner /> Sending…
                    </>
                  ) : (
                    'Send message'
                  )}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </PageContainer>
    </PageTransition>
  )
}

