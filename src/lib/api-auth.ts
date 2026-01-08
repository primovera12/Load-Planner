import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './prisma'
import { hashApiKey, isValidApiKeyFormat, hasScope, ApiScope } from './api-key'

export interface ApiAuthResult {
  success: true
  userId: string
  apiKeyId: string
  scopes: string[]
}

export interface ApiAuthError {
  success: false
  error: string
  status: number
}

/**
 * Authenticate a request using API key
 * Returns user info if valid, or error response if not
 */
export async function authenticateApiKey(
  request: NextRequest
): Promise<ApiAuthResult | ApiAuthError> {
  // Get API key from header
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return {
      success: false,
      error: 'Missing Authorization header. Use: Authorization: Bearer lp_live_xxx',
      status: 401,
    }
  }

  // Parse Bearer token
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return {
      success: false,
      error: 'Invalid Authorization format. Use: Authorization: Bearer lp_live_xxx',
      status: 401,
    }
  }

  const apiKey = parts[1]

  // Validate format
  if (!isValidApiKeyFormat(apiKey)) {
    return {
      success: false,
      error: 'Invalid API key format',
      status: 401,
    }
  }

  // Hash and lookup
  const keyHash = hashApiKey(apiKey)

  const dbKey = await prisma.apiKey.findUnique({
    where: { key: keyHash },
    include: { user: true },
  })

  if (!dbKey) {
    return {
      success: false,
      error: 'Invalid API key',
      status: 401,
    }
  }

  // Check if active
  if (!dbKey.isActive) {
    return {
      success: false,
      error: 'API key is disabled',
      status: 401,
    }
  }

  // Check expiration
  if (dbKey.expiresAt && new Date(dbKey.expiresAt) < new Date()) {
    return {
      success: false,
      error: 'API key has expired',
      status: 401,
    }
  }

  // Check rate limit
  const now = new Date()
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  // Reset counter if needed
  if (!dbKey.rateLimitReset || new Date(dbKey.rateLimitReset) < now) {
    await prisma.apiKey.update({
      where: { id: dbKey.id },
      data: {
        requestCount: 1,
        rateLimitReset: new Date(now.getTime() + 60 * 60 * 1000),
        lastUsedAt: now,
      },
    })
  } else if (dbKey.requestCount >= dbKey.rateLimit) {
    const resetTime = new Date(dbKey.rateLimitReset)
    return {
      success: false,
      error: `Rate limit exceeded. Resets at ${resetTime.toISOString()}`,
      status: 429,
    }
  } else {
    // Increment counter
    await prisma.apiKey.update({
      where: { id: dbKey.id },
      data: {
        requestCount: { increment: 1 },
        lastUsedAt: now,
      },
    })
  }

  return {
    success: true,
    userId: dbKey.userId,
    apiKeyId: dbKey.id,
    scopes: dbKey.scopes,
  }
}

/**
 * Require API authentication with specific scope
 */
export async function requireApiAuth(
  request: NextRequest,
  requiredScope?: ApiScope
): Promise<ApiAuthResult | NextResponse> {
  const result = await authenticateApiKey(request)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      {
        status: result.status,
        headers: {
          'WWW-Authenticate': 'Bearer realm="Load Planner API"',
        },
      }
    )
  }

  // Check scope if required
  if (requiredScope && !hasScope(result.scopes, requiredScope)) {
    return NextResponse.json(
      { error: `Missing required scope: ${requiredScope}` },
      { status: 403 }
    )
  }

  return result
}

/**
 * Helper to check if result is an error response
 */
export function isApiAuthError(
  result: ApiAuthResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}

/**
 * Create standard API error response
 */
export function apiError(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Create standard API success response
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Add standard API headers to response
 */
export function withApiHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-API-Version', 'v1')
  response.headers.set('Content-Type', 'application/json')
  return response
}
