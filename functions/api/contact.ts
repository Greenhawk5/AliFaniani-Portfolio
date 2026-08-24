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

function escapeHtml(value: string | undefined): string {
  return (value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
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
  const firstName = escapeHtml(body.firstName)
  const lastName = escapeHtml(body.lastName)
  const email = escapeHtml(body.email)
  const phone = escapeHtml(body.phone)
  const message = escapeHtml(body.message).replaceAll('\n', '<br />')
  const websiteUrl = 'https://alifaniani.ir'
  const submittedAt = new Date().toISOString()
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
      html: `
        <div style="margin:0;background:#0b0f19;padding:32px 16px;font-family:Arial,sans-serif;color:#e8eef5">
          <div style="max-width:600px;margin:0 auto;background:#121922;border:1px solid #263342;border-radius:16px;overflow:hidden">
            <div style="padding:24px 28px;border-bottom:1px solid #263342;color:#39ff8b;font-size:20px;font-weight:700">AF <span style="color:#e8eef5;font-weight:400">New contact message</span></div>
            <div style="padding:28px">
              <p style="margin:0 0 20px;color:#aab8c7;font-size:13px;text-transform:uppercase;letter-spacing:2px">Portfolio contact</p>
              <div style="padding:16px;background:#0b0f14;border-radius:10px;font-size:14px;line-height:1.7">
                <strong style="color:#39ff8b">${firstName} ${lastName}</strong><br />
                <a href="mailto:${email}" style="color:#e8eef5">${email}</a>${phone ? `<br />${phone}` : ''}
              </div>
              <h2 style="margin:28px 0 12px;font-size:16px;color:#e8eef5">Message</h2>
              <div style="padding:18px;background:#18222d;border-radius:10px;color:#c8d3de;font-size:15px;line-height:1.7">${message}</div>
                <p style="margin:20px 0 0;color:#8292a3;font-size:13px">IP: ${escapeHtml(ip)}<br />Submitted: ${submittedAt}</p>
                <a href="mailto:${email}" style="display:inline-block;margin-top:24px;padding:12px 18px;background:#00ff88;color:#06130d;text-decoration:none;border-radius:8px;font-weight:700">Reply to ${firstName}</a>
            </div>
          </div>
        </div>
      `,
    }),
  })

  try {
    const response = await fetch('https://api.resend.com/emails', {
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
        text: `Hi ${body.firstName},\n\nThanks for reaching out. I received your message and usually reply within a day.\n\nVisit ${websiteUrl}\n\nBest regards,\nAli Faniani`,
        html: `
          <div style="margin:0;background:#0b0f19;padding:32px 16px;font-family:Arial,sans-serif;color:#e8eef5">
            <div style="max-width:600px;margin:0 auto;background:#121922;border:1px solid #263342;border-radius:16px;overflow:hidden">
              <div style="padding:24px 28px;border-bottom:1px solid #263342;color:#00ff88;font-size:24px;font-weight:700">AF <span style="color:#e8eef5;font-size:14px;font-weight:400">Ali Faniani · Software Developer</span></div>
              <div style="padding:32px 28px;line-height:1.7;font-size:15px">
                <p style="margin:0 0 18px">Hi ${firstName},</p>
                <p style="margin:0 0 16px;color:#c8d3de">Thanks for reaching out. I received your message and will review it shortly.</p>
                <p style="margin:0 0 24px;color:#c8d3de">I usually reply within a day.</p>
                <a href="${websiteUrl}" style="display:inline-block;padding:12px 20px;background:#00ff88;color:#06130d;text-decoration:none;border-radius:10px;font-weight:700">Visit alifaniani.ir</a>
              </div>
              <div style="padding:20px 28px;border-top:1px solid #263342;color:#8292a3;font-size:12px">Best regards,<br /><strong style="color:#e8eef5">Ali Faniani</strong><br /><a href="${websiteUrl}" style="color:#00ff88">alifaniani.ir</a></div>
            </div>
          </div>
        `,
      }),
    })
    if (!response.ok) throw new Error(`Resend confirmation request failed (${response.status})`)
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
