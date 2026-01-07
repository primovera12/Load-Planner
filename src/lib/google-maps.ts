/**
 * Google Maps Service for Load Planner
 *
 * Handles route calculation and geocoding using Google Maps API
 */

import {
  Client,
  DirectionsResponse,
  TravelMode,
  UnitSystem,
} from '@googlemaps/google-maps-services-js'

const client = new Client({})

// Get API key from environment
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

export interface RoutePoint {
  lat: number
  lng: number
  address?: string
}

export interface RouteStep {
  startLocation: RoutePoint
  endLocation: RoutePoint
  distance: number // meters
  duration: number // seconds
  instructions: string
}

export interface CalculatedRoute {
  origin: RoutePoint
  destination: RoutePoint
  totalDistance: number // miles
  totalDuration: number // minutes
  steps: RouteStep[]
  polyline: string // encoded polyline
  bounds: {
    northeast: RoutePoint
    southwest: RoutePoint
  }
  warnings: string[]
}

/**
 * Calculate route between two addresses using Google Directions API
 */
export async function calculateRoute(
  origin: string,
  destination: string
): Promise<CalculatedRoute> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured')
  }

  try {
    const response = await client.directions({
      params: {
        origin,
        destination,
        mode: TravelMode.driving,
        units: UnitSystem.imperial,
        key: GOOGLE_MAPS_API_KEY,
      },
    })

    if (response.data.status !== 'OK') {
      throw new Error(`Directions API error: ${response.data.status}`)
    }

    const route = response.data.routes[0]
    const leg = route.legs[0]

    const steps: RouteStep[] = leg.steps.map((step) => ({
      startLocation: {
        lat: step.start_location.lat,
        lng: step.start_location.lng,
      },
      endLocation: {
        lat: step.end_location.lat,
        lng: step.end_location.lng,
      },
      distance: step.distance?.value || 0,
      duration: step.duration?.value || 0,
      instructions: step.html_instructions || '',
    }))

    return {
      origin: {
        lat: leg.start_location.lat,
        lng: leg.start_location.lng,
        address: leg.start_address,
      },
      destination: {
        lat: leg.end_location.lat,
        lng: leg.end_location.lng,
        address: leg.end_address,
      },
      totalDistance: Math.round((leg.distance?.value || 0) / 1609.34), // meters to miles
      totalDuration: Math.round((leg.duration?.value || 0) / 60), // seconds to minutes
      steps,
      polyline: route.overview_polyline?.points || '',
      bounds: {
        northeast: {
          lat: route.bounds.northeast.lat,
          lng: route.bounds.northeast.lng,
        },
        southwest: {
          lat: route.bounds.southwest.lat,
          lng: route.bounds.southwest.lng,
        },
      },
      warnings: route.warnings || [],
    }
  } catch (error) {
    console.error('Route calculation error:', error)
    throw error
  }
}

/**
 * Geocode an address to get coordinates
 */
export async function geocodeAddress(
  address: string
): Promise<RoutePoint | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured')
  }

  try {
    const response = await client.geocode({
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY,
      },
    })

    if (response.data.status !== 'OK' || !response.data.results[0]) {
      return null
    }

    const result = response.data.results[0]
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      address: result.formatted_address,
    }
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Decode a Google polyline string to array of coordinates
 */
export function decodePolyline(encoded: string): RoutePoint[] {
  const points: RoutePoint[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    })
  }

  return points
}

/**
 * Check if Google Maps API is configured
 */
export function isGoogleMapsConfigured(): boolean {
  return !!GOOGLE_MAPS_API_KEY
}
