import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { generateWebhookSecret, isValidWebhookUrl, WEBHOOK_EVENTS, WebhookEvent } from '@/lib/webhooks'

// GET /api/webhooks - List all webhooks for current user
export async function GET() {
  try {
    const user = await requireAuth()

    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
    })

    // Don't expose full secret, just first/last few chars
    const maskedWebhooks = webhooks.map((webhook) => ({
      ...webhook,
      secret: `${webhook.secret.substring(0, 10)}...${webhook.secret.slice(-4)}`,
    }))

    return NextResponse.json(maskedWebhooks)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching webhooks:', error)
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 })
  }
}

// POST /api/webhooks - Create a new webhook
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const { name, url, events } = body

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // Validate URL
    if (!url || !isValidWebhookUrl(url)) {
      return NextResponse.json(
        { error: 'Valid HTTPS URL is required' },
        { status: 400 }
      )
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'At least one event is required' },
        { status: 400 }
      )
    }

    const validEvents = Object.keys(WEBHOOK_EVENTS)
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e))
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate secret
    const secret = generateWebhookSecret()

    const webhook = await prisma.webhook.create({
      data: {
        name: name.trim(),
        url,
        secret,
        events,
        userId: user.id,
      },
    })

    // Return with full secret (only shown once)
    return NextResponse.json(
      {
        ...webhook,
        message: 'Webhook created. Save the secret securely - it will not be shown in full again.',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating webhook:', error)
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 })
  }
}

// DELETE /api/webhooks?id=xxx - Delete a webhook
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 })
    }

    // Verify ownership
    const webhook = await prisma.webhook.findFirst({
      where: { id, userId: user.id },
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    await prisma.webhook.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting webhook:', error)
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 })
  }
}

// PATCH /api/webhooks?id=xxx - Update a webhook
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Webhook ID required' }, { status: 400 })
    }

    // Verify ownership
    const webhook = await prisma.webhook.findFirst({
      where: { id, userId: user.id },
    })

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    if ('name' in body && typeof body.name === 'string') {
      updates.name = body.name.trim()
    }

    if ('url' in body) {
      if (!isValidWebhookUrl(body.url)) {
        return NextResponse.json(
          { error: 'Valid HTTPS URL is required' },
          { status: 400 }
        )
      }
      updates.url = body.url
    }

    if ('events' in body && Array.isArray(body.events)) {
      const validEvents = Object.keys(WEBHOOK_EVENTS)
      const invalidEvents = body.events.filter((e: string) => !validEvents.includes(e))
      if (invalidEvents.length > 0) {
        return NextResponse.json(
          { error: `Invalid events: ${invalidEvents.join(', ')}` },
          { status: 400 }
        )
      }
      updates.events = body.events
    }

    if ('isActive' in body && typeof body.isActive === 'boolean') {
      updates.isActive = body.isActive
    }

    const updated = await prisma.webhook.update({
      where: { id },
      data: updates,
    })

    // Mask secret
    return NextResponse.json({
      ...updated,
      secret: `${updated.secret.substring(0, 10)}...${updated.secret.slice(-4)}`,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating webhook:', error)
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 })
  }
}
