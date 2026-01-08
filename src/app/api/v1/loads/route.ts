import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth, isApiAuthError, apiError, apiSuccess, withApiHeaders } from '@/lib/api-auth'

// GET /api/v1/loads - List all loads
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, 'loads:read')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { userId: auth.userId }
    if (status) where.status = status

    const [loads, total] = await Promise.all([
      prisma.load.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.load.count({ where }),
    ])

    return withApiHeaders(apiSuccess({
      data: loads,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + loads.length < total,
      },
    }))
  } catch (error) {
    console.error('API v1 loads GET error:', error)
    return withApiHeaders(apiError('Failed to fetch loads', 500))
  }
}

// POST /api/v1/loads - Create a new load
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, 'loads:write')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const body = await request.json()

    const {
      origin,
      destination,
      length,
      width,
      height,
      weight,
      description,
      cargoType,
      trailerType,
      customerId,
      pickupDate,
      deliveryDate,
      items,
    } = body

    // Validate required fields
    if (!origin || !destination) {
      return withApiHeaders(apiError('origin and destination are required'))
    }
    if (typeof length !== 'number' || typeof width !== 'number' ||
        typeof height !== 'number' || typeof weight !== 'number') {
      return withApiHeaders(apiError('length, width, height, and weight are required numbers'))
    }

    // Verify customer ownership if provided
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, userId: auth.userId },
      })
      if (!customer) {
        return withApiHeaders(apiError('Customer not found', 404))
      }
    }

    // Generate load number
    const loadCount = await prisma.load.count({ where: { userId: auth.userId } })
    const loadNumber = `LD-${String(loadCount + 1).padStart(5, '0')}`

    const load = await prisma.load.create({
      data: {
        loadNumber,
        origin,
        destination,
        length,
        width,
        height,
        weight,
        description,
        cargoType,
        trailerType,
        customerId,
        pickupDate: pickupDate ? new Date(pickupDate) : undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
        userId: auth.userId,
        items: items ? {
          create: items.map((item: any) => ({
            name: item.name,
            length: item.length,
            width: item.width,
            height: item.height,
            weight: item.weight,
            quantity: item.quantity || 1,
          })),
        } : undefined,
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
      },
    })

    return withApiHeaders(apiSuccess(load, 201))
  } catch (error) {
    console.error('API v1 loads POST error:', error)
    return withApiHeaders(apiError('Failed to create load', 500))
  }
}
