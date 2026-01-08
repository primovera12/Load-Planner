import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit } from '@/lib/rate-limiter'

// POST /api/share/[token]/action - Track download/print action (PUBLIC)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { action } = body

    // Validate action
    if (!['download', 'print'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get client IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Rate limit (more strict for actions - 10 per minute)
    const rateLimitResult = checkRateLimit(`action:${ip}`, 10, 60000)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Find the share token
    const share = await prisma.shareToken.findUnique({
      where: { token },
    })

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    // Check if action is allowed
    if (action === 'download' && !share.allowDownload) {
      return NextResponse.json({ error: 'Download not allowed' }, { status: 403 })
    }
    if (action === 'print' && !share.allowPrint) {
      return NextResponse.json({ error: 'Print not allowed' }, { status: 403 })
    }

    // Log the action
    const userAgent = request.headers.get('user-agent') || undefined
    await prisma.shareAccessLog.create({
      data: {
        shareTokenId: share.id,
        action,
        ipAddress: ip !== 'unknown' ? ip : undefined,
        userAgent: userAgent?.substring(0, 500),
      },
    })

    // Update counts
    await prisma.shareToken.update({
      where: { id: share.id },
      data: {
        ...(action === 'download' && { downloadCount: { increment: 1 } }),
        ...(action === 'print' && { printCount: { increment: 1 } }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking action:', error)
    return NextResponse.json({ error: 'Failed to track action' }, { status: 500 })
  }
}
