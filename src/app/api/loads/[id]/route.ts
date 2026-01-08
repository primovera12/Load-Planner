import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/loads/[id] - Get a single load
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const load = await prisma.load.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        customer: true,
        items: true,
        quotes: {
          include: {
            lineItems: true,
          },
        },
      },
    })

    if (!load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 })
    }

    return NextResponse.json(load)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching load:', error)
    return NextResponse.json({ error: 'Failed to fetch load' }, { status: 500 })
  }
}

// PUT /api/loads/[id] - Update a load
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()

    // Check load exists and belongs to user
    const existing = await prisma.load.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 })
    }

    const {
      customerId,
      status,
      origin,
      originCity,
      originState,
      destination,
      destCity,
      destState,
      description,
      cargoType,
      length,
      width,
      height,
      weight,
      items,
      trailerType,
      statesTraversed,
      totalDistance,
      totalDuration,
      permitCost,
      escortCost,
      fuelCost,
      tollCost,
      lineHaulRate,
      pickupDate,
      deliveryDate,
    } = body

    // Calculate total cost if any cost fields provided
    const newPermitCost = permitCost ?? existing.permitCost
    const newEscortCost = escortCost ?? existing.escortCost
    const newFuelCost = fuelCost ?? existing.fuelCost
    const newTollCost = tollCost ?? existing.tollCost
    const newLineHaulRate = lineHaulRate ?? existing.lineHaulRate ?? 0
    const totalCost = newPermitCost + newEscortCost + newFuelCost + newTollCost + newLineHaulRate

    // Update load with transaction for items
    const load = await prisma.$transaction(async (tx) => {
      // Delete existing items if new ones provided
      if (items) {
        await tx.loadItem.deleteMany({
          where: { loadId: id },
        })
      }

      // Update load
      return tx.load.update({
        where: { id },
        data: {
          ...(customerId !== undefined && { customerId: customerId || null }),
          ...(status && { status }),
          ...(origin && { origin }),
          ...(originCity !== undefined && { originCity }),
          ...(originState !== undefined && { originState }),
          ...(destination && { destination }),
          ...(destCity !== undefined && { destCity }),
          ...(destState !== undefined && { destState }),
          ...(description !== undefined && { description }),
          ...(cargoType !== undefined && { cargoType }),
          ...(length !== undefined && { length }),
          ...(width !== undefined && { width }),
          ...(height !== undefined && { height }),
          ...(weight !== undefined && { weight }),
          ...(trailerType !== undefined && { trailerType }),
          ...(statesTraversed && { statesTraversed }),
          ...(totalDistance !== undefined && { totalDistance }),
          ...(totalDuration !== undefined && { totalDuration }),
          permitCost: newPermitCost,
          escortCost: newEscortCost,
          fuelCost: newFuelCost,
          tollCost: newTollCost,
          lineHaulRate: lineHaulRate ?? existing.lineHaulRate,
          totalCost,
          ...(pickupDate !== undefined && {
            pickupDate: pickupDate ? new Date(pickupDate) : null,
          }),
          ...(deliveryDate !== undefined && {
            deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          }),
          ...(items && {
            items: {
              create: items.map((item: any) => ({
                name: item.name,
                length: item.length,
                width: item.width,
                height: item.height,
                weight: item.weight,
                quantity: item.quantity || 1,
                positionX: item.positionX || 0,
                positionY: item.positionY || 0,
                positionZ: item.positionZ || 0,
                color: item.color || '#3b82f6',
              })),
            },
          }),
        },
        include: {
          customer: true,
          items: true,
        },
      })
    })

    return NextResponse.json(load)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating load:', error)
    return NextResponse.json({ error: 'Failed to update load' }, { status: 500 })
  }
}

// DELETE /api/loads/[id] - Delete a load
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Check load exists and belongs to user
    const existing = await prisma.load.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 })
    }

    await prisma.load.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting load:', error)
    return NextResponse.json({ error: 'Failed to delete load' }, { status: 500 })
  }
}
