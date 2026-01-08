import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/quotes - Get all quotes for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const search = searchParams.get('search')

    const quotes = await prisma.quote.findMany({
      where: {
        userId: user.id,
        ...(status && { status: status as any }),
        ...(customerId && { customerId }),
        ...(search && {
          OR: [
            { quoteNumber: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: {
        customer: true,
        load: true,
        lineItems: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching quotes:', error)
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 })
  }
}

// POST /api/quotes - Create a new quote
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const {
      customerId,
      loadId,
      validUntil,
      notes,
      terms,
      lineItems = [],
    } = body

    // Generate quote number
    const count = await prisma.quote.count({ where: { userId: user.id } })
    const quoteNumber = `Q-${String(count + 1).padStart(4, '0')}`

    // Calculate totals
    const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
    const taxRate = body.taxRate || 0
    const taxAmount = subtotal * (taxRate / 100)
    const total = subtotal + taxAmount

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        userId: user.id,
        customerId: customerId || null,
        loadId: loadId || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes,
        terms,
        subtotal,
        taxRate,
        taxAmount,
        total,
        lineItems: {
          create: lineItems.map((item: any) => ({
            description: item.description,
            category: item.category,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice,
            total: item.total || item.quantity * item.unitPrice,
            notes: item.notes,
          })),
        },
      },
      include: {
        customer: true,
        load: true,
        lineItems: true,
      },
    })

    return NextResponse.json(quote, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating quote:', error)
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 })
  }
}
