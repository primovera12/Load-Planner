import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/webhooks/[id]/deliveries - Get delivery history for a webhook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const offset = parseInt(searchParams.get('offset') || '0')

    // Verify webhook ownership
    const webhook = await prisma.webhook.findFirst({
      where: { id, userId: user.id },
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const where: Record<string, unknown> = { webhookId: id }
    if (status) where.status = status

    const [deliveries, total] = await Promise.all([
      prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.webhookDelivery.count({ where }),
    ])

    return NextResponse.json({
      data: deliveries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + deliveries.length < total,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching webhook deliveries:', error)
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 })
  }
}
