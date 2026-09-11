/**
 * Cloudflare Turnstile server-side verification.
 * Extracted from functions/api/contact.ts so the admin login endpoint
 * reuses the exact same verification pattern (single implementation).
 */

export async function verifyTurnstileToken(
  token: string,
  secret: string,
  ip: string,
  expectedAction?: string
): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: token, secret, remoteip: ip }),
    })
    if (!response.ok) return false
    const result = (await response.json()) as {
      success: boolean
      action?: string
    }
    if (result.success !== true) return false
    if (expectedAction && result.action && result.action !== expectedAction) return false
    return true
  } catch {
    // Network/verification failure → deny (fail closed for auth).
    return false
  }
}
