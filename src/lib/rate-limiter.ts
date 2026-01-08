// Simple in-memory rate limiter
// For production at scale, consider using Redis or a dedicated rate limiting service

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter: number // milliseconds until reset
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowMs: number = 60 * 1000 // 1 minute
): RateLimitResult {
  const now = Date.now()
  const key = `rate:${identifier}`

  let entry = rateLimitStore.get(key)

  // If no entry or window has passed, create new entry
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    }
    rateLimitStore.set(key, entry)

    return {
      allowed: true,
      remaining: maxRequests - 1,
      retryAfter: 0,
    }
  }

  // Increment count
  entry.count++

  // Check if over limit
  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: entry.resetAt - now,
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    retryAfter: 0,
  }
}

// Utility to manually reset rate limit for an identifier (useful for testing)
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(`rate:${identifier}`)
}
