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

export interface MultiStopRouteResult {
  totalDistance: number // miles
  totalDuration: number // minutes
  legs: {
    startAddress: string
    endAddress: string
    distance: number // miles
    duration: number // minutes
    statesInLeg: string[]
    polyline: string
  }[]
  statesTraversed: string[]
  polyline: string
  warnings: string[]
}

// Extract state from address string
function extractStateFromAddress(address: string): string | null {
  // Match common US state patterns: "City, ST ZIP" or "City, State ZIP"
  const stateMatch = address.match(/,\s*([A-Z]{2})\s+\d{5}/)
  if (stateMatch) return stateMatch[1]

  // Full state name patterns
  const stateNames: Record<string, string> = {
    Alabama: 'AL',
    Alaska: 'AK',
    Arizona: 'AZ',
    Arkansas: 'AR',
    California: 'CA',
    Colorado: 'CO',
    Connecticut: 'CT',
    Delaware: 'DE',
    Florida: 'FL',
    Georgia: 'GA',
    Hawaii: 'HI',
    Idaho: 'ID',
    Illinois: 'IL',
    Indiana: 'IN',
    Iowa: 'IA',
    Kansas: 'KS',
    Kentucky: 'KY',
    Louisiana: 'LA',
    Maine: 'ME',
    Maryland: 'MD',
    Massachusetts: 'MA',
    Michigan: 'MI',
    Minnesota: 'MN',
    Mississippi: 'MS',
    Missouri: 'MO',
    Montana: 'MT',
    Nebraska: 'NE',
    Nevada: 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    Ohio: 'OH',
    Oklahoma: 'OK',
    Oregon: 'OR',
    Pennsylvania: 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    Tennessee: 'TN',
    Texas: 'TX',
    Utah: 'UT',
    Vermont: 'VT',
    Virginia: 'VA',
    Washington: 'WA',
    'West Virginia': 'WV',
    Wisconsin: 'WI',
    Wyoming: 'WY',
  }

  for (const [name, code] of Object.entries(stateNames)) {
    if (address.includes(name)) return code
  }

  return null
}

/**
 * Calculate multi-stop route using Google Directions API with waypoints
 */
export async function calculateMultiStopRoute(
  stops: Array<{ address: string; lat?: number; lng?: number }>
): Promise<MultiStopRouteResult> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured')
  }

  if (stops.length < 2) {
    throw new Error('At least 2 stops are required')
  }

  const origin = stops[0]
  const destination = stops[stops.length - 1]
  const waypoints = stops.slice(1, -1)

  try {
    const response = await client.directions({
      params: {
        origin: origin.lat && origin.lng
          ? { lat: origin.lat, lng: origin.lng }
          : origin.address,
        destination: destination.lat && destination.lng
          ? { lat: destination.lat, lng: destination.lng }
          : destination.address,
        waypoints: waypoints.map((wp) =>
          wp.lat && wp.lng
            ? { lat: wp.lat, lng: wp.lng }
            : wp.address
        ),
        mode: TravelMode.driving,
        units: UnitSystem.imperial,
        key: GOOGLE_MAPS_API_KEY,
      },
    })

    if (response.data.status !== 'OK') {
      throw new Error(`Directions API error: ${response.data.status}`)
    }

    const route = response.data.routes[0]
    const allStates: string[] = []

    const legs = route.legs.map((leg, index) => {
      const startState = extractStateFromAddress(leg.start_address)
      const endState = extractStateFromAddress(leg.end_address)
      const statesInLeg: string[] = []

      if (startState && !statesInLeg.includes(startState)) {
        statesInLeg.push(startState)
      }
      if (endState && !statesInLeg.includes(endState)) {
        statesInLeg.push(endState)
      }

      // Add to overall states traversed
      statesInLeg.forEach((state) => {
        if (!allStates.includes(state)) {
          allStates.push(state)
        }
      })

      return {
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        distance: Math.round((leg.distance?.value || 0) / 1609.34), // meters to miles
        duration: Math.round((leg.duration?.value || 0) / 60), // seconds to minutes
        statesInLeg,
        polyline: leg.steps.map((s) => s.polyline?.points || '').join(''),
      }
    })

    const totalDistance = legs.reduce((sum, leg) => sum + leg.distance, 0)
    const totalDuration = legs.reduce((sum, leg) => sum + leg.duration, 0)

    return {
      totalDistance,
      totalDuration,
      legs,
      statesTraversed: allStates,
      polyline: route.overview_polyline?.points || '',
      warnings: route.warnings || [],
    }
  } catch (error) {
    console.error('Multi-stop route calculation error:', error)
    throw error
  }
}
