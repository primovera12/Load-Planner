import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/customers - List all customers for the current user
export async function GET() {
  try {
    const user = await requireAuth()

    const customers = await prisma.customer.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { loads: true, quotes: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: customers,
    })
  } catch (error) {
    console.error('Failed to fetch customers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const customer = await prisma.customer.create({
      data: {
        userId: user.id,
        name: body.name,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        notes: body.notes,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'created',
        entityType: 'customer',
        entityId: customer.id,
        userId: user.id,
        details: { name: customer.name },
      },
    })

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error) {
    console.error('Failed to create customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create customer' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
