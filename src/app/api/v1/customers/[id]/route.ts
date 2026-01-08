import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth, isApiAuthError, apiError, apiSuccess, withApiHeaders } from '@/lib/api-auth'

// GET /api/v1/customers/[id] - Get a specific customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, 'customers:read')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { id } = await params

    const customer = await prisma.customer.findFirst({
      where: { id, userId: auth.userId },
      include: {
        loads: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            loadNumber: true,
            status: true,
            origin: true,
            destination: true,
            createdAt: true,
          },
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            quoteNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
        _count: {
          select: { loads: true, quotes: true },
        },
      },
    })

    if (!customer) {
      return withApiHeaders(apiError('Customer not found', 404))
    }

    return withApiHeaders(apiSuccess(customer))
  } catch (error) {
    console.error('API v1 customers GET [id] error:', error)
    return withApiHeaders(apiError('Failed to fetch customer', 500))
  }
}

// PATCH /api/v1/customers/[id] - Update a customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, 'customers:write')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.customer.findFirst({
      where: { id, userId: auth.userId },
    })

    if (!existing) {
      return withApiHeaders(apiError('Customer not found', 404))
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    const allowedFields = [
      'name', 'contactName', 'email', 'phone',
      'address', 'city', 'state', 'zipCode',
      'notes', 'isActive',
    ]

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updates,
    })

    return withApiHeaders(apiSuccess(customer))
  } catch (error) {
    console.error('API v1 customers PATCH error:', error)
    return withApiHeaders(apiError('Failed to update customer', 500))
  }
}

// DELETE /api/v1/customers/[id] - Delete a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request, 'customers:delete')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { id } = await params

    // Verify ownership
    const existing = await prisma.customer.findFirst({
      where: { id, userId: auth.userId },
    })

    if (!existing) {
      return withApiHeaders(apiError('Customer not found', 404))
    }

    await prisma.customer.delete({ where: { id } })

    return withApiHeaders(apiSuccess({ success: true, id }))
  } catch (error) {
    console.error('API v1 customers DELETE error:', error)
    return withApiHeaders(apiError('Failed to delete customer', 500))
  }
}
