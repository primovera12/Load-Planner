import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth, isApiAuthError, apiError, apiSuccess, withApiHeaders } from '@/lib/api-auth'

// GET /api/v1/quotes - List all quotes
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request, 'quotes:read')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { userId: auth.userId }
    if (status) where.status = status
    if (customerId) where.customerId = customerId

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          load: { select: { id: true, loadNumber: true, origin: true, destination: true } },
          lineItems: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.quote.count({ where }),
    ])

    return withApiHeaders(apiSuccess({
      data: quotes,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + quotes.length < total,
      },
    }))
  } catch (error) {
    console.error('API v1 quotes GET error:', error)
    return withApiHeaders(apiError('Failed to fetch quotes', 500))
  }
}

// POST /api/v1/quotes - Create a new quote
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, 'quotes:write')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const body = await request.json()

    const {
      customerId,
      loadId,
      validUntil,
      notes,
      terms,
      lineItems,
      taxRate = 0,
    } = body

    // Verify customer ownership if provided
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, userId: auth.userId },
      })
      if (!customer) {
        return withApiHeaders(apiError('Customer not found', 404))
      }
    }

    // Verify load ownership if provided
    if (loadId) {
      const load = await prisma.load.findFirst({
        where: { id: loadId, userId: auth.userId },
      })
      if (!load) {
        return withApiHeaders(apiError('Load not found', 404))
      }
    }

    // Generate quote number
    const quoteCount = await prisma.quote.count({ where: { userId: auth.userId } })
    const quoteNumber = `QT-${String(quoteCount + 1).padStart(5, '0')}`

    // Calculate totals
    const items = lineItems || []
    const subtotal = items.reduce((sum: number, item: any) =>
      sum + (item.unitPrice * (item.quantity || 1)), 0)
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId,
        loadId,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        notes,
        terms,
        subtotal,
        taxRate,
        taxAmount,
        total,
        userId: auth.userId,
        lineItems: {
          create: items.map((item: any) => ({
            description: item.description,
            category: item.category || 'other',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            total: item.unitPrice * (item.quantity || 1),
            notes: item.notes,
          })),
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        load: { select: { id: true, loadNumber: true } },
        lineItems: true,
      },
    })

    return withApiHeaders(apiSuccess(quote, 201))
  } catch (error) {
    console.error('API v1 quotes POST error:', error)
    return withApiHeaders(apiError('Failed to create quote', 500))
  }
}
