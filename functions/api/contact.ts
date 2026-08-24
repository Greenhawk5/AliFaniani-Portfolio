interface ContactBody {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  message?: string
  company?: string
}

interface Env {
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  EMAIL_TO?: string
  TURNSTILE_SECRET?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_WINDOW_MS = 10 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 5

const rateBuckets = new Map<string, number[]>()

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fail(error: string, status = 400) {
  return json({ ok: false, error }, status)
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = (rateBuckets.get(ip) ?? []).filter((t) => now - t < MAX_WINDOW_MS)
  if (bucket.length >= MAX_REQUESTS_PER_WINDOW) {
    rateBuckets.set(ip, bucket)
    return true
  }
  bucket.push(now)
  rateBuckets.set(ip, bucket)
  if (rateBuckets.size > 10_000) {
    const cutoff = now - MAX_WINDOW_MS
    for (const [key, times] of rateBuckets) {
      if (times.every((t) => t < cutoff)) rateBuckets.delete(key)
    }
  }
  return false
}

async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: token, secret, remoteip: ip }),
  })
  const result = (await response.json()) as { success: boolean }
  return result.success === true
}

async function sendEmail(env: Env, body: ContactBody, ip: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_TO) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM ?? 'Portfolio <onboarding@resend.dev>',
      to: env.EMAIL_TO,
      reply_to: body.email,
      subject: `Portfolio contact — ${body.firstName} ${body.lastName}`,
      text: [
        `Name: ${body.firstName} ${body.lastName}`,
        `Email: ${body.email}`,
        body.phone ? `Phone: ${body.phone}` : null,
        `IP: ${ip}`,
        '',
        body.message,
      ]
        .filter(Boolean)
        .join('\n'),
    }),
  })

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM ?? 'Portfolio <onboarding@resend.dev>',
        to: body.email,
        reply_to: env.EMAIL_TO,
        subject: 'Thanks for contacting Ali Faniani',
        html: `
          <p>Hi ${body.firstName},</p>
          <p>Thanks for reaching out. I received your message and will review it shortly.</p>
          <p>I usually reply within a day.</p>
          <p>You can also visit <a href="https://alifaniani.ir">alifaniani.ir</a>.</p>
          <p>Best regards,<br />Ali Faniani</p>
        `,
      }),
    })
  } catch (error) {
    console.error('Visitor confirmation email failed:', error)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const contentType = request.headers.get('Content-Type') ?? ''

  if (!contentType.includes('application/json')) {
    return fail('Invalid content type.', 415)
  }

  let body: ContactBody
  try {
    body = (await request.json()) as ContactBody
  } catch {
    return fail('Invalid JSON body.')
  }

  if (body.company) {
    return json({ ok: true })
  }

  if (isRateLimited(ip)) {
    return fail('Too many messages sent. Please try again later.', 429)
  }

  const firstName = (body.firstName ?? '').trim()
  const lastName = (body.lastName ?? '').trim()
  const email = (body.email ?? '').trim()
  const phone = (body.phone ?? '').trim()
  const message = (body.message ?? '').trim()

  if (!firstName || !lastName) return fail('Please provide your first and last name.')
  if (firstName.length > 80 || lastName.length > 80) return fail('Name is too long.')
  if (!EMAIL_RE.test(email) || email.length > 254) return fail('Please provide a valid email address.')
  if (phone.length > 40) return fail('Phone number is too long.')
  if (message.length < 10) return fail('Message is too short (min 10 characters).')
  if (message.length > 4000) return fail('Message is too long (max 4000 characters).')

  const turnstileToken = request.headers.get('X-Turnstile-Token')
  if (env.TURNSTILE_SECRET) {
    if (!turnstileToken) return fail('Captcha verification missing.', 403)
    const valid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, ip)
    if (!valid) return fail('Captcha verification failed.', 403)
  }

  try {
    await sendEmail(env, { firstName, lastName, email, phone, message }, ip)
  } catch {
    return fail('Unable to deliver your message right now. Please try again later.', 502)
  }

  return json({ ok: true })
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  })
