import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import { checkRateLimit } from '@/lib/rate-limiter'

// POST /api/share/[token]/comment - Submit a comment on a shared quote (PUBLIC)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { message, authorName, authorEmail } = body

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message is too long (max 2000 characters)' }, { status: 400 })
    }

    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Rate limit (10 comments per hour per IP)
    const rateLimitResult = checkRateLimit(`comment:${ip}`, 10, 3600000)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many comments. Please try again later.' },
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

    // Only quotes can have comments
    if (share.entityType !== 'QUOTE') {
      return NextResponse.json({ error: 'Comments are only available for quotes' }, { status: 400 })
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

    // Create the comment
    const userAgent = request.headers.get('user-agent') || undefined
    const comment = await prisma.quoteComment.create({
      data: {
        quoteId: quote.id,
        message: message.trim(),
        authorName: authorName?.trim() || undefined,
        authorEmail: authorEmail?.trim() || undefined,
        shareTokenId: share.id,
        ipAddress: ip !== 'unknown' ? ip : undefined,
        userAgent: userAgent?.substring(0, 500),
      },
    })

    // Log the action
    await prisma.shareAccessLog.create({
      data: {
        shareTokenId: share.id,
        action: 'comment',
        ipAddress: ip !== 'unknown' ? ip : undefined,
        userAgent: userAgent?.substring(0, 500),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Comment submitted successfully',
      commentId: comment.id,
    }, { status: 201 })
  } catch (error) {
    console.error('Error submitting comment:', error)
    return NextResponse.json({ error: 'Failed to submit comment' }, { status: 500 })
  }
}
