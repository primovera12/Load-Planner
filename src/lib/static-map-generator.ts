/**
 * Static Map Generator
 *
 * Uses Google Static Maps API to generate map images for PDF export
 */

import { RouteStop } from '@/types/route-planning'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''

interface StaticMapOptions {
  width?: number
  height?: number
  mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid'
  scale?: 1 | 2 | 4
  format?: 'png' | 'png8' | 'png32' | 'gif' | 'jpg' | 'jpg-baseline'
}

interface MarkerOptions {
  color?: string
  label?: string
  size?: 'tiny' | 'small' | 'mid'
}

/**
 * Generate Google Static Maps URL for a route with stops
 */
export function generateStaticMapUrl(
  stops: RouteStop[],
  options: StaticMapOptions = {}
): string {
  const {
    width = 600,
    height = 300,
    mapType = 'roadmap',
    scale = 2,
    format = 'png',
  } = options

  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key not configured for static maps')
    return ''
  }

  if (stops.length === 0) {
    return ''
  }

  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap'
  const params = new URLSearchParams()

  params.set('size', `${width}x${height}`)
  params.set('maptype', mapType)
  params.set('scale', scale.toString())
  params.set('format', format)
  params.set('key', GOOGLE_MAPS_API_KEY)

  // Add markers for each stop
  const pickupStops = stops.filter((s) => s.type === 'PICKUP')
  const deliveryStops = stops.filter((s) => s.type === 'DELIVERY')

  // Pickup markers (green)
  if (pickupStops.length > 0) {
    const pickupMarkers = pickupStops
      .map((stop, index) => {
        if (stop.latitude && stop.longitude) {
          return `${stop.latitude},${stop.longitude}`
        }
        return encodeURIComponent(stop.formattedAddress || stop.address || '')
      })
      .filter(Boolean)
      .join('|')

    if (pickupMarkers) {
      params.append('markers', `color:green|label:P|${pickupMarkers}`)
    }
  }

  // Delivery markers (blue)
  if (deliveryStops.length > 0) {
    const deliveryMarkers = deliveryStops
      .map((stop, index) => {
        if (stop.latitude && stop.longitude) {
          return `${stop.latitude},${stop.longitude}`
        }
        return encodeURIComponent(stop.formattedAddress || stop.address || '')
      })
      .filter(Boolean)
      .join('|')

    if (deliveryMarkers) {
      params.append('markers', `color:blue|label:D|${deliveryMarkers}`)
    }
  }

  // Add path connecting all stops if we have coordinates
  const pathCoords = stops
    .filter((s) => s.latitude && s.longitude)
    .map((s) => `${s.latitude},${s.longitude}`)
    .join('|')

  if (pathCoords) {
    params.append('path', `color:0x4285f4ff|weight:3|${pathCoords}`)
  }

  return `${baseUrl}?${params.toString()}`
}

/**
 * Generate static map URL with encoded polyline
 */
export function generateStaticMapUrlWithPolyline(
  polyline: string,
  stops: RouteStop[],
  options: StaticMapOptions = {}
): string {
  const {
    width = 600,
    height = 300,
    mapType = 'roadmap',
    scale = 2,
    format = 'png',
  } = options

  if (!GOOGLE_MAPS_API_KEY) {
    return ''
  }

  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap'
  const params = new URLSearchParams()

  params.set('size', `${width}x${height}`)
  params.set('maptype', mapType)
  params.set('scale', scale.toString())
  params.set('format', format)
  params.set('key', GOOGLE_MAPS_API_KEY)

  // Add the route path using encoded polyline
  if (polyline) {
    params.append('path', `color:0x4285f4ff|weight:4|enc:${polyline}`)
  }

  // Add numbered markers for stops
  stops.forEach((stop, index) => {
    const position =
      stop.latitude && stop.longitude
        ? `${stop.latitude},${stop.longitude}`
        : encodeURIComponent(stop.formattedAddress || stop.address || '')

    if (position) {
      const color = stop.type === 'PICKUP' ? 'green' : 'blue'
      const label = (index + 1).toString()
      params.append('markers', `color:${color}|label:${label}|${position}`)
    }
  })

  return `${baseUrl}?${params.toString()}`
}

/**
 * Fetch static map as base64 data URL for embedding in PDF
 * Has a 10-second timeout to prevent blocking PDF generation
 */
export async function fetchStaticMapAsBase64(
  stops: RouteStop[],
  polyline?: string,
  options: StaticMapOptions = {}
): Promise<string | null> {
  const url = polyline
    ? generateStaticMapUrlWithPolyline(polyline, stops, options)
    : generateStaticMapUrl(stops, options)

  if (!url) {
    return null
  }

  try {
    // Add a 10-second timeout using AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error('Failed to fetch static map:', response.status)
      return null
    }

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = options.format === 'jpg' || options.format === 'jpg-baseline'
      ? 'image/jpeg'
      : 'image/png'

    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Static map fetch timed out after 10 seconds')
    } else {
      console.error('Error fetching static map:', error)
    }
    return null
  }
}

/**
 * Generate a simple overview map URL (no route, just markers)
 */
export function generateOverviewMapUrl(
  locations: Array<{ lat: number; lng: number; label?: string; color?: string }>,
  options: StaticMapOptions = {}
): string {
  const {
    width = 400,
    height = 200,
    mapType = 'roadmap',
    scale = 2,
  } = options

  if (!GOOGLE_MAPS_API_KEY || locations.length === 0) {
    return ''
  }

  const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap'
  const params = new URLSearchParams()

  params.set('size', `${width}x${height}`)
  params.set('maptype', mapType)
  params.set('scale', scale.toString())
  params.set('key', GOOGLE_MAPS_API_KEY)

  // Group markers by color
  const markersByColor = new Map<string, string[]>()
  locations.forEach((loc) => {
    const color = loc.color || 'red'
    const position = `${loc.lat},${loc.lng}`
    if (!markersByColor.has(color)) {
      markersByColor.set(color, [])
    }
    markersByColor.get(color)!.push(position)
  })

  markersByColor.forEach((positions, color) => {
    params.append('markers', `color:${color}|${positions.join('|')}`)
  })

  return `${baseUrl}?${params.toString()}`
}

export default generateStaticMapUrl
