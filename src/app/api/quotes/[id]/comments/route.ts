import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/quotes/[id]/comments - Get all comments for a quote (requires auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify ownership
    const quote = await prisma.quote.findFirst({
      where: { id, userId: user.id },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Fetch comments
    const comments = await prisma.quoteComment.findMany({
      where: { quoteId: id },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to mask IP addresses
    const transformedComments = comments.map(comment => ({
      id: comment.id,
      message: comment.message,
      authorName: comment.authorName,
      authorEmail: comment.authorEmail,
      isRead: comment.isRead,
      createdAt: comment.createdAt,
    }))

    // Get unread count
    const unreadCount = comments.filter(c => !c.isRead).length

    return NextResponse.json({
      comments: transformedComments,
      total: comments.length,
      unreadCount,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// PATCH /api/quotes/[id]/comments - Mark comments as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { commentIds } = body

    // Verify ownership
    const quote = await prisma.quote.findFirst({
      where: { id, userId: user.id },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Mark comments as read
    if (commentIds && Array.isArray(commentIds)) {
      await prisma.quoteComment.updateMany({
        where: {
          id: { in: commentIds },
          quoteId: id,
        },
        data: { isRead: true },
      })
    } else {
      // Mark all as read
      await prisma.quoteComment.updateMany({
        where: { quoteId: id },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error marking comments as read:', error)
    return NextResponse.json({ error: 'Failed to update comments' }, { status: 500 })
  }
}
