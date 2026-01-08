import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

// GET /api/share - Get all share tokens for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    const shares = await prisma.shareToken.findMany({
      where: {
        createdById: user.id,
        ...(entityType && { entityType: entityType as any }),
        ...(entityId && { entityId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { accessLogs: true }
        }
      }
    })

    // Transform to include hasPassword flag and not expose actual password
    const transformedShares = shares.map(share => ({
      ...share,
      hasPassword: !!share.password,
      password: undefined, // Never expose password hash
      isOneTimeLink: share.maxAccessCount === 1,
      autoExtend: share.autoExtend,
      extendDays: share.extendDays,
      recipientName: share.recipientName,
      recipientEmail: share.recipientEmail,
    }))

    return NextResponse.json(transformedShares)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching shares:', error)
    return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 })
  }
}

// POST /api/share - Create a new share link
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const {
      entityType,
      entityId,
      allowDownload = true,
      allowPrint = true,
      expiresInDays,
      password,
      isOneTimeLink = false,
      maxAccessCount,
      autoExtend = false,
      extendDays = 7,
      recipientName,
      recipientEmail,
    } = body

    // Validate entity type
    if (!['QUOTE', 'LOAD'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type. Must be QUOTE or LOAD' },
        { status: 400 }
      )
    }

    // Verify the entity exists and belongs to user
    if (entityType === 'QUOTE') {
      const quote = await prisma.quote.findFirst({
        where: { id: entityId, userId: user.id },
      })
      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
      }
    } else if (entityType === 'LOAD') {
      const load = await prisma.load.findFirst({
        where: { id: entityId, userId: user.id },
      })
      if (!load) {
        return NextResponse.json({ error: 'Load not found' }, { status: 404 })
      }
    }

    // Calculate expiration date
    let expiresAt: Date | null = null
    if (expiresInDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays))
    }

    // Hash password if provided
    let hashedPassword: string | null = null
    if (password && password.trim()) {
      hashedPassword = await hashPassword(password)
    }

    // Determine max access count
    let finalMaxAccessCount: number | null = null
    if (isOneTimeLink) {
      finalMaxAccessCount = 1
    } else if (maxAccessCount && maxAccessCount > 0) {
      finalMaxAccessCount = maxAccessCount
    }

    const share = await prisma.shareToken.create({
      data: {
        entityType,
        entityId,
        allowDownload,
        allowPrint,
        expiresAt,
        password: hashedPassword,
        maxAccessCount: finalMaxAccessCount,
        autoExtend: expiresAt ? autoExtend : false, // Only enable if there's an expiration
        extendDays: extendDays > 0 ? extendDays : 7,
        recipientName: recipientName?.trim() || undefined,
        recipientEmail: recipientEmail?.trim() || undefined,
        createdById: user.id,
      },
    })

    // Generate the full share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || ''
    const shareUrl = `${baseUrl}/share/${share.token}`

    return NextResponse.json({
      ...share,
      shareUrl,
      hasPassword: !!hashedPassword,
      password: undefined, // Never expose password hash
      isOneTimeLink: finalMaxAccessCount === 1,
      autoExtend: share.autoExtend,
      extendDays: share.extendDays,
      recipientName: share.recipientName,
      recipientEmail: share.recipientEmail,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating share:', error)
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }
}

// DELETE /api/share - Delete a share link
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Share ID required' }, { status: 400 })
    }

    // Verify ownership
    const share = await prisma.shareToken.findFirst({
      where: { id, createdById: user.id },
    })

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    await prisma.shareToken.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting share:', error)
    return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 })
  }
}
