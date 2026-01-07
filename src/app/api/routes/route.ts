/**
 * Routes API
 *
 * Calculate route with Google Maps and get permit requirements
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  calculateRoute,
  decodePolyline,
  isGoogleMapsConfigured,
} from '@/lib/google-maps'
import {
  getStatesAlongRoute,
  getDistanceByState,
} from '@/lib/state-boundaries'
import { calculateRoutePermits } from '@/lib/permit-calculator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { origin, destination, width, height, length, grossWeight } = body

    // Validate required fields
    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      )
    }

    if (!width || !height || !length || !grossWeight) {
      return NextResponse.json(
        { error: 'Cargo dimensions (width, height, length) and grossWeight are required' },
        { status: 400 }
      )
    }

    // Check if Google Maps is configured
    if (!isGoogleMapsConfigured()) {
      return NextResponse.json(
        {
          error: 'Google Maps API not configured',
          message: 'Please set GOOGLE_MAPS_API_KEY in environment variables',
          fallback: true,
        },
        { status: 503 }
      )
    }

    // Calculate route using Google Maps
    const route = await calculateRoute(origin, destination)

    // Decode polyline to get route points
    const routePoints = decodePolyline(route.polyline)

    // Get states along route
    const states = getStatesAlongRoute(routePoints)

    // Get distance by state
    const stateDistances = getDistanceByState(routePoints, route.totalDistance)

    // Calculate permits
    const cargo = {
      width: parseFloat(width),
      height: parseFloat(height),
      length: parseFloat(length),
      grossWeight: parseFloat(grossWeight),
    }

    const permits = calculateRoutePermits(states, cargo, stateDistances)

    // Estimate fuel cost (rough: $4/gallon, 6 mpg for heavy haul)
    const fuelCost = Math.round((route.totalDistance / 6) * 4)

    return NextResponse.json({
      success: true,
      data: {
        route: {
          origin: route.origin,
          destination: route.destination,
          totalDistance: route.totalDistance,
          totalDuration: route.totalDuration,
          statesTraversed: states,
          stateDistances,
          polyline: route.polyline,
          bounds: route.bounds,
          warnings: route.warnings,
        },
        permits,
        costs: {
          permits: permits.totalPermitFees,
          escorts: permits.totalEscortCost,
          fuel: fuelCost,
          total: permits.totalPermitFees + permits.totalEscortCost + fuelCost,
        },
        // Include decoded points for map (sample every 10th point to reduce data)
        mapPoints: routePoints.filter((_, i) => i % 10 === 0),
      },
    })
  } catch (error) {
    console.error('Route calculation error:', error)

    // Return helpful error message
    const message = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Failed to calculate route',
        message,
      },
      { status: 500 }
    )
  }
}
