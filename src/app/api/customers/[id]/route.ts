import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/customers/[id] - Get a single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        loads: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { loads: true, quotes: true },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: customer,
    })
  } catch (error) {
    console.error('Failed to fetch customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// PUT /api/customers/[id] - Update a customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.customer.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        notes: body.notes,
        isActive: body.isActive,
      },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'updated',
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
    console.error('Failed to update customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update customer' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify ownership
    const existing = await prisma.customer.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    await prisma.customer.delete({
      where: { id },
    })

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'deleted',
        entityType: 'customer',
        entityId: id,
        userId: user.id,
        details: { name: existing.name },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete customer:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete customer' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
