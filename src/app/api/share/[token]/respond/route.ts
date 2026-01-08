import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { checkRateLimit } from '@/lib/rate-limiter'

// POST /api/share/[token]/respond - Accept or decline a shared quote (PUBLIC)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { response, respondentName, respondentEmail, message } = body

    // Validate response
    if (!['accept', 'decline'].includes(response)) {
      return NextResponse.json({ error: 'Invalid response. Must be accept or decline' }, { status: 400 })
    }

    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Rate limit (5 responses per minute per IP)
    const rateLimitResult = checkRateLimit(`respond:${ip}`, 5, 60000)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
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

    // Only quotes can be accepted/declined
    if (share.entityType !== 'QUOTE') {
      return NextResponse.json({ error: 'Only quotes can be accepted or declined' }, { status: 400 })
    }

    // Check password if required
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

    // Find the quote
    const quote = await prisma.quote.findUnique({
      where: { id: share.entityId },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Check if quote can still be responded to
    if (['ACCEPTED', 'DECLINED', 'EXPIRED'].includes(quote.status)) {
      return NextResponse.json({
        error: `Quote has already been ${quote.status.toLowerCase()}`
      }, { status: 400 })
    }

    // Update quote status
    const newStatus = response === 'accept' ? 'ACCEPTED' : 'DECLINED'
    const updateField = response === 'accept' ? 'acceptedAt' : 'declinedAt'

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: newStatus,
        [updateField]: new Date(),
      },
    })

    // Log the response action
    const userAgent = request.headers.get('user-agent') || undefined
    await prisma.shareAccessLog.create({
      data: {
        shareTokenId: share.id,
        action: response,
        ipAddress: ip !== 'unknown' ? ip : undefined,
        userAgent: userAgent?.substring(0, 500),
      },
    })

    // Create activity log
    await prisma.activityLog.create({
      data: {
        action: response === 'accept' ? 'accepted' : 'declined',
        entityType: 'quote',
        entityId: quote.id,
        details: {
          respondentName,
          respondentEmail,
          message,
          shareToken: token,
          via: 'share_link',
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: response === 'accept'
        ? 'Quote accepted successfully'
        : 'Quote declined',
      newStatus,
    })
  } catch (error) {
    console.error('Error responding to quote:', error)
    return NextResponse.json({ error: 'Failed to process response' }, { status: 500 })
  }
}
