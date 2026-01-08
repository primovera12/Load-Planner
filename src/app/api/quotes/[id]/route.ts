import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/quotes/[id] - Get a single quote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const quote = await prisma.quote.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        customer: true,
        load: {
          include: {
            items: true,
          },
        },
        lineItems: true,
      },
    })

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching quote:', error)
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 })
  }
}

// PUT /api/quotes/[id] - Update a quote
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    // Check quote exists and belongs to user
    const existing = await prisma.quote.findFirst({
      where: { id, userId: user.id },
      include: { lineItems: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const {
      customerId,
      loadId,
      status,
      validUntil,
      notes,
      terms,
      lineItems,
      taxRate,
    } = body

    // Calculate totals if line items provided
    let subtotal = existing.subtotal
    let taxAmount = existing.taxAmount
    let total = existing.total

    if (lineItems) {
      subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
      const rate = taxRate ?? existing.taxRate
      taxAmount = subtotal * (rate / 100)
      total = subtotal + taxAmount
    }

    // Update quote with transaction for line items
    const quote = await prisma.$transaction(async (tx) => {
      // Delete existing line items if new ones provided
      if (lineItems) {
        await tx.quoteLineItem.deleteMany({
          where: { quoteId: id },
        })
      }

      // Update quote
      return tx.quote.update({
        where: { id },
        data: {
          ...(customerId !== undefined && { customerId: customerId || null }),
          ...(loadId !== undefined && { loadId: loadId || null }),
          ...(status && { status }),
          ...(validUntil !== undefined && {
            validUntil: validUntil ? new Date(validUntil) : null,
          }),
          ...(notes !== undefined && { notes }),
          ...(terms !== undefined && { terms }),
          ...(taxRate !== undefined && { taxRate }),
          subtotal,
          taxAmount,
          total,
          ...(status === 'SENT' && !existing.sentAt && { sentAt: new Date() }),
          ...(status === 'ACCEPTED' && { acceptedAt: new Date() }),
          ...(status === 'DECLINED' && { declinedAt: new Date() }),
          ...(lineItems && {
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
          }),
        },
        include: {
          customer: true,
          load: true,
          lineItems: true,
        },
      })
    })

    return NextResponse.json(quote)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating quote:', error)
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
  }
}

// DELETE /api/quotes/[id] - Delete a quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Check quote exists and belongs to user
    const existing = await prisma.quote.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    await prisma.quote.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting quote:', error)
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 })
  }
}
