import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { checkRateLimit } from '@/lib/rate-limiter'

// GET /api/share/[token] - Get shared entity (PUBLIC - no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Get client IP for rate limiting and logging
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Check rate limit (60 requests per minute per IP)
    const rateLimitResult = checkRateLimit(ip)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimitResult.retryAfter / 1000)),
          }
        }
      )
    }

    // Find the share token
    const share = await prisma.shareToken.findUnique({
      where: { token },
    })

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 })
    }

    // Check if expired
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 })
    }

    // Check if max access count exceeded
    if (share.maxAccessCount !== null && share.viewCount >= share.maxAccessCount) {
      return NextResponse.json({ error: 'Share link has reached its access limit' }, { status: 410 })
    }

    // Check password protection - return requiresPassword if password is set but not provided
    const providedPassword = request.headers.get('x-share-password')
    if (share.password) {
      if (!providedPassword) {
        return NextResponse.json({
          requiresPassword: true,
          error: 'Password required'
        }, { status: 401 })
      }

      const isValidPassword = await verifyPassword(providedPassword, share.password)
      if (!isValidPassword) {
        return NextResponse.json({
          requiresPassword: true,
          error: 'Invalid password'
        }, { status: 401 })
      }
    }

    // Log access
    const userAgent = request.headers.get('user-agent') || undefined
    await prisma.shareAccessLog.create({
      data: {
        shareTokenId: share.id,
        action: 'view',
        ipAddress: ip !== 'unknown' ? ip : undefined,
        userAgent: userAgent?.substring(0, 500), // Limit length
      }
    })

    // Update view count and last viewed
    await prisma.shareToken.update({
      where: { id: share.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    })

    // Fetch the entity based on type
    let entity = null
    let ownerInfo = null

    if (share.entityType === 'QUOTE') {
      const quote = await prisma.quote.findUnique({
        where: { id: share.entityId },
        include: {
          customer: {
            select: {
              name: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
          load: {
            select: {
              loadNumber: true,
              origin: true,
              destination: true,
              description: true,
              length: true,
              width: true,
              height: true,
              weight: true,
              trailerType: true,
            },
          },
          lineItems: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
              email: true,
              phone: true,
            },
          },
        },
      })

      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }

      ownerInfo = quote.user
      entity = {
        ...quote,
        user: undefined, // Don't expose full user object
      }
    } else if (share.entityType === 'LOAD') {
      const load = await prisma.load.findUnique({
        where: { id: share.entityId },
        include: {
          customer: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
          items: true,
          user: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
              email: true,
              phone: true,
            },
          },
        },
      })

      if (!load) {
        return NextResponse.json({ error: 'Load not found' }, { status: 404 })
      }

      ownerInfo = load.user
      entity = {
        ...load,
        user: undefined,
      }
    }

    return NextResponse.json({
      entityType: share.entityType,
      entity,
      owner: ownerInfo,
      permissions: {
        allowDownload: share.allowDownload,
        allowPrint: share.allowPrint,
      },
      expiresAt: share.expiresAt,
    })
  } catch (error) {
    console.error('Error fetching shared entity:', error)
    return NextResponse.json({ error: 'Failed to fetch shared content' }, { status: 500 })
  }
}
