import { NextRequest, NextResponse } from 'next/server'
import { calculateMultiStopRoute } from '@/lib/google-maps'
import { RouteStop, RouteLeg, MultiStopRoute } from '@/types/route-planning'

interface RequestBody {
  stops: RouteStop[]
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { stops } = body

    if (!stops || stops.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 stops are required' },
        { status: 400 }
      )
    }

    // Validate stops have addresses or coordinates
    const validStops = stops.filter(
      (stop) =>
        (stop.latitude && stop.longitude) ||
        stop.address ||
        stop.formattedAddress
    )

    if (validStops.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 stops with valid addresses are required' },
        { status: 400 }
      )
    }

    // Prepare stops for Google Maps API
    const mapsStops = validStops.map((stop) => ({
      address: stop.formattedAddress || stop.address || '',
      lat: stop.latitude,
      lng: stop.longitude,
    }))

    // Calculate the route
    const routeResult = await calculateMultiStopRoute(mapsStops)

    // Transform to our MultiStopRoute format
    const legs: RouteLeg[] = routeResult.legs.map((leg, index) => ({
      fromStopId: validStops[index].id,
      toStopId: validStops[index + 1].id,
      distance: leg.distance,
      duration: leg.duration,
      polyline: leg.polyline,
      statesInLeg: leg.statesInLeg,
    }))

    const route: MultiStopRoute = {
      stops: validStops,
      legs,
      totalDistance: routeResult.totalDistance,
      totalDuration: routeResult.totalDuration,
      statesTraversed: routeResult.statesTraversed,
      polyline: routeResult.polyline,
      optimized: false,
    }

    return NextResponse.json({
      success: true,
      route,
      warnings: routeResult.warnings,
    })
  } catch (error) {
    console.error('Multi-stop route API error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to calculate route: ${errorMessage}` },
      { status: 500 }
    )
  }
}
