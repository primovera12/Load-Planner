import { NextRequest, NextResponse } from 'next/server'
import { optimizeRoute } from '@/lib/route-optimizer'
import { RouteStop, ItemStopAssignment } from '@/types/route-planning'

interface RequestBody {
  stops: RouteStop[]
  itemAssignments: ItemStopAssignment[]
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { stops, itemAssignments = [] } = body

    if (!stops || stops.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 stops are required for optimization' },
        { status: 400 }
      )
    }

    // Validate stops have coordinates
    const stopsWithCoords = stops.filter(
      (stop) => stop.latitude !== undefined && stop.longitude !== undefined
    )

    if (stopsWithCoords.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 stops with coordinates are required' },
        { status: 400 }
      )
    }

    // Run optimization
    const result = optimizeRoute(stops, itemAssignments)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Route optimization API error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to optimize route: ${errorMessage}` },
      { status: 500 }
    )
  }
}
