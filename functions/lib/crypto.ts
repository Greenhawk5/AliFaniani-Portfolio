/**
 * Server-side crypto helpers (Workers Web Crypto).
 *
 * - Session tokens: 32 random bytes → base64url. Only SHA-256(token) is
 *   stored in D1; the raw token exists solely in the HttpOnly cookie.
 * - Timing-safe comparison: double-HMAC (SHA-256) then constant-time compare.
 *   HMAC keeps lengths fixed so the final compare cannot leak through length.
 */

const TOKEN_BYTES = 32

function base64urlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES)
  crypto.getRandomValues(bytes)
  return base64urlEncode(bytes)
}

export function generateCsrfToken(): string {
  return generateSessionToken()
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
}

async function hmacSign(secret: string, value: string): Promise<Uint8Array> {
  const key = await hmacKey(secret)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return new Uint8Array(signature)
}

/** Timing-safe equality: both sides are HMAC'd with per-call random keys
 * (forcing fixed length), then compared in constant time bytewise. */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const pepper = crypto.getRandomValues(new Uint8Array(16)).join('')
  const [aSig, bSig] = await Promise.all([hmacSign(pepper, a), hmacSign(pepper, b)])
  if (aSig.length !== bSig.length) return false
  let diff = 0
  for (let i = 0; i < aSig.length; i++) diff |= aSig[i] ^ bSig[i]
  return diff === 0
}
