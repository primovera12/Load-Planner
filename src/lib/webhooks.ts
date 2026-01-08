import { prisma } from './prisma'
import { createHmac } from 'crypto'

/**
 * Available webhook events
 */
export const WEBHOOK_EVENTS = {
  // Quote events
  'quote.created': 'When a new quote is created',
  'quote.updated': 'When a quote is updated',
  'quote.sent': 'When a quote is sent to customer',
  'quote.accepted': 'When a customer accepts a quote',
  'quote.declined': 'When a customer declines a quote',

  // Load events
  'load.created': 'When a new load is created',
  'load.updated': 'When a load is updated',
  'load.status_changed': 'When a load status changes',

  // Customer events
  'customer.created': 'When a new customer is created',
  'customer.updated': 'When a customer is updated',

  // Share events
  'share.viewed': 'When a shared link is viewed',
  'share.feedback': 'When feedback is left on a share',
} as const

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS

/**
 * Generate webhook signature for payload verification
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

/**
 * Generate a random webhook secret
 */
export function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let secret = 'whsec_'
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return secret
}

/**
 * Trigger webhooks for an event
 */
export async function triggerWebhooks(
  userId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    // Find all active webhooks for this user that listen to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        isActive: true,
        events: { has: event },
      },
    })

    if (webhooks.length === 0) return

    // Create delivery records and trigger webhooks
    const deliveryPromises = webhooks.map(async (webhook) => {
      const deliveryPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      }

      const payloadString = JSON.stringify(deliveryPayload)
      const signature = generateWebhookSignature(payloadString, webhook.secret)

      // Create pending delivery record
      const delivery = await prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: JSON.parse(payloadString), // Cast to Prisma Json type
          status: 'pending',
        },
      })

      // Attempt delivery (fire and forget for now)
      deliverWebhook(webhook.url, payloadString, signature, delivery.id, webhook.id)
    })

    await Promise.all(deliveryPromises)
  } catch (error) {
    console.error('Error triggering webhooks:', error)
  }
}

/**
 * Actually deliver the webhook (async, doesn't block)
 */
async function deliverWebhook(
  url: string,
  payload: string,
  signature: string,
  deliveryId: string,
  webhookId: string
): Promise<void> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': new Date().toISOString(),
        'User-Agent': 'LoadPlanner-Webhooks/1.0',
      },
      body: payload,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const responseBody = await response.text().catch(() => '')

    if (response.ok) {
      // Success
      await prisma.$transaction([
        prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: 'success',
            statusCode: response.status,
            response: responseBody.substring(0, 1000),
            deliveredAt: new Date(),
            attempts: { increment: 1 },
          },
        }),
        prisma.webhook.update({
          where: { id: webhookId },
          data: {
            successCount: { increment: 1 },
            lastTriggeredAt: new Date(),
            lastSuccessAt: new Date(),
          },
        }),
      ])
    } else {
      // Failed
      await prisma.$transaction([
        prisma.webhookDelivery.update({
          where: { id: deliveryId },
          data: {
            status: 'failed',
            statusCode: response.status,
            response: responseBody.substring(0, 1000),
            error: `HTTP ${response.status}: ${response.statusText}`,
            attempts: { increment: 1 },
            nextRetryAt: new Date(Date.now() + 60000), // Retry in 1 minute
          },
        }),
        prisma.webhook.update({
          where: { id: webhookId },
          data: {
            failureCount: { increment: 1 },
            lastTriggeredAt: new Date(),
            lastFailureAt: new Date(),
          },
        }),
      ])
    }
  } catch (error) {
    // Network error or timeout
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await prisma.$transaction([
      prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'failed',
          error: errorMessage,
          attempts: { increment: 1 },
          nextRetryAt: new Date(Date.now() + 60000),
        },
      }),
      prisma.webhook.update({
        where: { id: webhookId },
        data: {
          failureCount: { increment: 1 },
          lastTriggeredAt: new Date(),
          lastFailureAt: new Date(),
        },
      }),
    ])
  }
}

/**
 * Validate webhook URL
 */
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost'
  } catch {
    return false
  }
}
