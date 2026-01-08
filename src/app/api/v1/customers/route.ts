import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth, isApiAuthError, apiError, apiSuccess, withApiHeaders } from '@/lib/api-auth'

// GET /api/v1/customers - List all customers
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, 'customers:read')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')
    const search = searchParams.get('search')
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { userId: auth.userId }
    if (isActive !== null) where.isActive = isActive === 'true'
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: { loads: true, quotes: true },
          },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.customer.count({ where }),
    ])

    return withApiHeaders(apiSuccess({
      data: customers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + customers.length < total,
      },
    }))
  } catch (error) {
    console.error('API v1 customers GET error:', error)
    return withApiHeaders(apiError('Failed to fetch customers', 500))
  }
}

// POST /api/v1/customers - Create a new customer
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, 'customers:write')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const body = await request.json()

    const {
      name,
      contactName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      notes,
    } = body

    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return withApiHeaders(apiError('name is required'))
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        contactName,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        notes,
        userId: auth.userId,
      },
    })

    return withApiHeaders(apiSuccess(customer, 201))
  } catch (error) {
    console.error('API v1 customers POST error:', error)
    return withApiHeaders(apiError('Failed to create customer', 500))
  }
}
