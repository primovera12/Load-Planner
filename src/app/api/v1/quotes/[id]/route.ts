import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth, isApiAuthError, apiError, apiSuccess, withApiHeaders } from '@/lib/api-auth'

// GET /api/v1/quotes/[id] - Get a specific quote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, 'quotes:read')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { id } = await params

    const quote = await prisma.quote.findFirst({
      where: { id, userId: auth.userId },
      include: {
        customer: true,
        load: {
          include: { items: true },
        },
        lineItems: true,
        comments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!quote) {
      return withApiHeaders(apiError('Quote not found', 404))
    }

    return withApiHeaders(apiSuccess(quote))
  } catch (error) {
    console.error('API v1 quotes GET [id] error:', error)
    return withApiHeaders(apiError('Failed to fetch quote', 500))
  }
}

// PATCH /api/v1/quotes/[id] - Update a quote
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, 'quotes:write')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.quote.findFirst({
      where: { id, userId: auth.userId },
    })

    if (!existing) {
      return withApiHeaders(apiError('Quote not found', 404))
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    const allowedFields = [
      'status', 'validUntil', 'notes', 'terms', 'taxRate',
      'customerId', 'loadId',
    ]

    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'validUntil') {
          updates[field] = body[field] ? new Date(body[field]) : null
        } else {
          updates[field] = body[field]
        }
      }
    }

    // Handle status changes
    if (body.status === 'SENT' && existing.status !== 'SENT') {
      updates.sentAt = new Date()
    }
    if (body.status === 'ACCEPTED' && existing.status !== 'ACCEPTED') {
      updates.acceptedAt = new Date()
    }
    if (body.status === 'DECLINED' && existing.status !== 'DECLINED') {
      updates.declinedAt = new Date()
    }

    // Recalculate totals if taxRate changed
    if ('taxRate' in body) {
      const taxRate = body.taxRate || 0
      updates.taxAmount = existing.subtotal * (taxRate / 100)
      updates.total = existing.subtotal + (updates.taxAmount as number)
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updates,
      include: {
        customer: { select: { id: true, name: true } },
        load: { select: { id: true, loadNumber: true } },
        lineItems: true,
      },
    })

    return withApiHeaders(apiSuccess(quote))
  } catch (error) {
    console.error('API v1 quotes PATCH error:', error)
    return withApiHeaders(apiError('Failed to update quote', 500))
  }
}

// DELETE /api/v1/quotes/[id] - Delete a quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, 'quotes:delete')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { id } = await params

    // Verify ownership
    const existing = await prisma.quote.findFirst({
      where: { id, userId: auth.userId },
    })

    if (!existing) {
      return withApiHeaders(apiError('Quote not found', 404))
    }

    await prisma.quote.delete({ where: { id } })

    return withApiHeaders(apiSuccess({ success: true, id }))
  } catch (error) {
    console.error('API v1 quotes DELETE error:', error)
    return withApiHeaders(apiError('Failed to delete quote', 500))
  }
}
