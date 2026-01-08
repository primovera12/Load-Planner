import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth, isApiAuthError, apiError, apiSuccess, withApiHeaders } from '@/lib/api-auth'

// GET /api/v1/loads/[id] - Get a specific load
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, 'loads:read')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { id } = await params

    const load = await prisma.load.findFirst({
      where: { id, userId: auth.userId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items: true,
        quotes: { select: { id: true, quoteNumber: true, status: true, total: true } },
      },
    })

    if (!load) {
      return withApiHeaders(apiError('Load not found', 404))
    }

    return withApiHeaders(apiSuccess(load))
  } catch (error) {
    console.error('API v1 loads GET [id] error:', error)
    return withApiHeaders(apiError('Failed to fetch load', 500))
  }
}

// PATCH /api/v1/loads/[id] - Update a load
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, 'loads:write')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.load.findFirst({
      where: { id, userId: auth.userId },
    })

    if (!existing) {
      return withApiHeaders(apiError('Load not found', 404))
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    const allowedFields = [
      'status', 'origin', 'destination', 'originCity', 'originState',
      'destCity', 'destState', 'description', 'cargoType', 'trailerType',
      'length', 'width', 'height', 'weight', 'statesTraversed',
      'totalDistance', 'totalDuration', 'permitCost', 'escortCost',
      'fuelCost', 'tollCost', 'lineHaulRate', 'totalCost',
      'pickupDate', 'deliveryDate', 'customerId',
    ]

    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'pickupDate' || field === 'deliveryDate') {
          updates[field] = body[field] ? new Date(body[field]) : null
        } else {
          updates[field] = body[field]
        }
      }
    }

    // Verify customer ownership if updating customerId
    if (body.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: body.customerId, userId: auth.userId },
      })
      if (!customer) {
        return withApiHeaders(apiError('Customer not found', 404))
      }
    }

    const load = await prisma.load.update({
      where: { id },
      data: updates,
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
      },
    })

    return withApiHeaders(apiSuccess(load))
  } catch (error) {
    console.error('API v1 loads PATCH error:', error)
    return withApiHeaders(apiError('Failed to update load', 500))
  }
}

// DELETE /api/v1/loads/[id] - Delete a load
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, 'loads:delete')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { id } = await params

    // Verify ownership
    const existing = await prisma.load.findFirst({
      where: { id, userId: auth.userId },
    })

    if (!existing) {
      return withApiHeaders(apiError('Load not found', 404))
    }

    await prisma.load.delete({ where: { id } })

    return withApiHeaders(apiSuccess({ success: true, id }))
  } catch (error) {
    console.error('API v1 loads DELETE error:', error)
    return withApiHeaders(apiError('Failed to delete load', 500))
  }
}
