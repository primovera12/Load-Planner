import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/loads - Get all loads for current user
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const search = searchParams.get('search')

    const loads = await prisma.load.findMany({
      where: {
        userId: user.id,
        ...(status && { status: status as any }),
        ...(customerId && { customerId }),
        ...(search && {
          OR: [
            { loadNumber: { contains: search, mode: 'insensitive' } },
            { origin: { contains: search, mode: 'insensitive' } },
            { destination: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        customer: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(loads)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching loads:', error)
    return NextResponse.json({ error: 'Failed to fetch loads' }, { status: 500 })
  }
}

// POST /api/loads - Create a new load
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const {
      customerId,
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
      items = [],
      trailerType,
      statesTraversed = [],
      totalDistance,
      totalDuration,
      permitCost = 0,
      escortCost = 0,
      fuelCost = 0,
      tollCost = 0,
      lineHaulRate,
      pickupDate,
      deliveryDate,
    } = body

    // Calculate total cost
    const totalCost = permitCost + escortCost + fuelCost + tollCost + (lineHaulRate || 0)

    const load = await prisma.load.create({
      data: {
        userId: user.id,
        customerId: customerId || null,
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
        trailerType,
        statesTraversed,
        totalDistance,
        totalDuration,
        permitCost,
        escortCost,
        fuelCost,
        tollCost,
        lineHaulRate,
        totalCost,
        pickupDate: pickupDate ? new Date(pickupDate) : null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
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
      },
      include: {
        customer: true,
        items: true,
      },
    })

    return NextResponse.json(load, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating load:', error)
    return NextResponse.json({ error: 'Failed to create load' }, { status: 500 })
  }
}
