/**
 * Layered login rate limiting (single admin, Cloudflare Free).
 *
 * Layer A — per-isolate in-memory burst cap: free, absorbs obvious floods.
 *   Not globally authoritative (resets per isolate/deploy) — Layer B + always-on
 *   Turnstile remain the real gates.
 *
 * Layer B — KV per-IP lockout: written ONLY when an attempt passed Turnstile
 *   but failed the password check (bounded KV write volume by construction —
 *   a scripted guesser without a solved challenge never reaches the password
 *   check, so it never burns KV quota).
 *
 *   Limit: 5 password failures per IP per 15 minutes → locked out for the
 *   remainder of the window. No global counter (a global lockout would hand
 *   an attacker the ability to lock the single owner out).
 *
 * KV failures fail OPEN: if KV is unavailable the in-memory layer + Turnstile
 * still hold; a KV outage must not lock the owner out of their own site.
 * Eventual consistency is acceptable here — the lockout is a brake, not a wall.
 */

const BURST_WINDOW_MS = 60_000
const BURST_MAX = 10 // in-memory burst cap per IP per minute (any attempt)
const FAILURE_WINDOW_MS = 15 * 60_000
const FAILURE_MAX = 5 // KV: password failures per IP per 15 min
const LOCKOUT_RETRY_SECONDS = FAILURE_WINDOW_MS / 1000

const burstBuckets = new Map<string, number[]>()

export function isBurstLimited(ip: string, nowMs = Date.now()): boolean {
  const bucket = (burstBuckets.get(ip) ?? []).filter((t) => nowMs - t < BURST_WINDOW_MS)
  if (bucket.length >= BURST_MAX) {
    burstBuckets.set(ip, bucket)
    return true
  }
  bucket.push(nowMs)
  burstBuckets.set(ip, bucket)
  if (burstBuckets.size > 10_000) {
    const cutoff = nowMs - BURST_WINDOW_MS
    for (const [key, times] of burstBuckets) {
      if (times.every((t) => t < cutoff)) burstBuckets.delete(key)
    }
  }
  return false
}

export function burstRetryAfterSeconds(): number {
  return Math.ceil(BURST_WINDOW_MS / 1000)
}

/** Test-only: resets the in-process burst buckets between test runs. */
export function resetBurstLimiterForTests(): void {
  burstBuckets.clear()
}

const KV_KEY_PREFIX = 'login-fail:'
const KV_TTL_SECONDS = Math.ceil(FAILURE_WINDOW_MS / 1000)

function withinWindow(entry: { first: number; count: number }, nowMs: number): boolean {
  return nowMs - entry.first < FAILURE_WINDOW_MS
}

/** Returns remaining lockout seconds when the IP is locked out, else 0. */
export async function checkKvLockout(kv: KVNamespace, ip: string, nowMs = Date.now()): Promise<number> {
  try {
    const raw = await kv.get(KV_KEY_PREFIX + ip)
    if (!raw) return 0
    const entry = JSON.parse(raw) as { first: number; count: number }
    if (!withinWindow(entry, nowMs)) return 0
    if (entry.count >= FAILURE_MAX) {
      return Math.ceil((FAILURE_WINDOW_MS - (nowMs - entry.first)) / 1000)
    }
    return 0
  } catch {
    return 0 // fail open
  }
}


/** Records one Turnstile-passed/password-failed attempt. Best-effort: a KV
 * write failure must not surface as an auth error (Layer B is a brake). */
export async function recordKvLoginFailure(kv: KVNamespace, ip: string, nowMs = Date.now()): Promise<void> {
  try {
    const raw = await kv.get(KV_KEY_PREFIX + ip)
    let entry: { first: number; count: number }
    if (raw) {
      const parsed = JSON.parse(raw) as { first: number; count: number }
      entry = withinWindow(parsed, nowMs)
        ? { first: parsed.first, count: parsed.count + 1 }
        : { first: nowMs, count: 1 }
    } else {
      entry = { first: nowMs, count: 1 }
    }
    await kv.put(KV_KEY_PREFIX + ip, JSON.stringify(entry), { expirationTtl: KV_TTL_SECONDS })
  } catch {
    // fail open
  }
}

export const RATE_LIMITS_DOC = {
  burst: { max: BURST_MAX, windowMs: BURST_WINDOW_MS },
  kvFailureLockout: { max: FAILURE_MAX, windowMs: FAILURE_WINDOW_MS, retrySeconds: LOCKOUT_RETRY_SECONDS },
}
