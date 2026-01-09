/**
 * Truck Stops Integration
 *
 * Uses OpenStreetMap Overpass API to find truck stops along a route
 */

import { TruckStopInfo } from '@/types/route-planning'

// Overpass API endpoint
const OVERPASS_API = 'https://overpass-api.de/api/interpreter'

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: {
    name?: string
    brand?: string
    amenity?: string
    hgv?: string
    'addr:street'?: string
    'addr:city'?: string
    'addr:state'?: string
    'addr:postcode'?: string
    fuel?: string
    parking?: string
    shower?: string
    restaurant?: string
    shop?: string
  }
}

interface OverpassResponse {
  elements: OverpassElement[]
}

/**
 * Build Overpass query to find truck stops along a route
 */
function buildOverpassQuery(
  coords: Array<{ lat: number; lng: number }>,
  radiusMeters: number = 5000 // 5km from route
): string {
  // Build a polygon around the route
  const bounds = calculateBounds(coords, radiusMeters / 111000) // Convert meters to degrees (approx)

  return `
    [out:json][timeout:30];
    (
      // Truck stops
      node["amenity"="fuel"]["hgv"="yes"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["amenity"="fuel"]["hgv"="yes"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      // General fuel stations that might serve trucks
      node["amenity"="fuel"]["brand"~"Pilot|Flying J|Love's|TA|Petro|Sapp Bros|Speedco"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["amenity"="fuel"]["brand"~"Pilot|Flying J|Love's|TA|Petro|Sapp Bros|Speedco"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      // Truck parking
      node["amenity"="parking"]["hgv"="yes"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    );
    out center;
  `
}

/**
 * Calculate bounding box for a set of coordinates
 */
function calculateBounds(
  coords: Array<{ lat: number; lng: number }>,
  paddingDegrees: number
): { north: number; south: number; east: number; west: number } {
  if (coords.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 }
  }

  let north = coords[0].lat
  let south = coords[0].lat
  let east = coords[0].lng
  let west = coords[0].lng

  for (const coord of coords) {
    north = Math.max(north, coord.lat)
    south = Math.min(south, coord.lat)
    east = Math.max(east, coord.lng)
    west = Math.min(west, coord.lng)
  }

  return {
    north: north + paddingDegrees,
    south: south - paddingDegrees,
    east: east + paddingDegrees,
    west: west - paddingDegrees,
  }
}

/**
 * Parse amenities from OSM tags
 */
function parseAmenities(tags: OverpassElement['tags']): string[] {
  const amenities: string[] = []

  if (tags?.fuel) amenities.push('fuel')
  if (tags?.hgv === 'yes') amenities.push('truck-friendly')
  if (tags?.shower === 'yes') amenities.push('showers')
  if (tags?.restaurant || tags?.['amenity'] === 'restaurant') amenities.push('restaurant')
  if (tags?.parking === 'yes') amenities.push('parking')
  if (tags?.shop) amenities.push('shop')

  // Default amenities for known brands
  const brand = tags?.brand?.toLowerCase() || tags?.name?.toLowerCase() || ''
  if (brand.includes('pilot') || brand.includes('flying j')) {
    if (!amenities.includes('showers')) amenities.push('showers')
    if (!amenities.includes('restaurant')) amenities.push('restaurant')
    if (!amenities.includes('parking')) amenities.push('parking')
  }
  if (brand.includes("love's")) {
    if (!amenities.includes('showers')) amenities.push('showers')
    if (!amenities.includes('parking')) amenities.push('parking')
  }
  if (brand.includes('ta ') || brand.includes('petro')) {
    if (!amenities.includes('showers')) amenities.push('showers')
    if (!amenities.includes('restaurant')) amenities.push('restaurant')
    if (!amenities.includes('parking')) amenities.push('parking')
    amenities.push('scales')
  }

  return amenities
}

/**
 * Calculate distance from a point to the nearest point on the route
 */
function distanceToRoute(
  point: { lat: number; lng: number },
  routeCoords: Array<{ lat: number; lng: number }>
): number {
  let minDistance = Infinity

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const distance = pointToSegmentDistance(
      point,
      routeCoords[i],
      routeCoords[i + 1]
    )
    minDistance = Math.min(minDistance, distance)
  }

  return minDistance
}

/**
 * Calculate distance from a point to a line segment
 */
function pointToSegmentDistance(
  point: { lat: number; lng: number },
  segStart: { lat: number; lng: number },
  segEnd: { lat: number; lng: number }
): number {
  const R = 3958.8 // Earth's radius in miles

  // Convert to radians
  const lat1 = (segStart.lat * Math.PI) / 180
  const lng1 = (segStart.lng * Math.PI) / 180
  const lat2 = (segEnd.lat * Math.PI) / 180
  const lng2 = (segEnd.lng * Math.PI) / 180
  const latP = (point.lat * Math.PI) / 180
  const lngP = (point.lng * Math.PI) / 180

  // Simplified: calculate distance to both endpoints and take minimum
  const d1 = haversineDistance(point.lat, point.lng, segStart.lat, segStart.lng)
  const d2 = haversineDistance(point.lat, point.lng, segEnd.lat, segEnd.lng)

  return Math.min(d1, d2)
}

/**
 * Haversine distance calculation
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8 // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Fetch truck stops along a route
 */
export async function getTruckStopsAlongRoute(
  routeCoords: Array<{ lat: number; lng: number }>,
  maxResults: number = 20,
  maxDistanceFromRoute: number = 10 // miles
): Promise<TruckStopInfo[]> {
  if (routeCoords.length < 2) {
    return []
  }

  try {
    const query = buildOverpassQuery(routeCoords)

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!response.ok) {
      console.error('Overpass API error:', response.status)
      return []
    }

    const data: OverpassResponse = await response.json()
    const truckStops: TruckStopInfo[] = []

    for (const element of data.elements) {
      const lat = element.lat || element.center?.lat
      const lng = element.lon || element.center?.lon

      if (!lat || !lng) continue

      const distanceFromRoute = distanceToRoute({ lat, lng }, routeCoords)

      if (distanceFromRoute > maxDistanceFromRoute) continue

      const tags = element.tags || {}
      const name = tags.name || tags.brand || 'Truck Stop'

      const address = [
        tags['addr:street'],
        tags['addr:city'],
        tags['addr:state'],
        tags['addr:postcode'],
      ]
        .filter(Boolean)
        .join(', ')

      truckStops.push({
        id: `osm-${element.id}`,
        name,
        address: address || 'Address not available',
        city: tags['addr:city'] || '',
        state: tags['addr:state'] || '',
        coordinates: { lat, lng },
        amenities: parseAmenities(tags),
        distanceFromRoute: Math.round(distanceFromRoute * 10) / 10,
      })
    }

    // Sort by distance from route and limit results
    truckStops.sort(
      (a, b) => (a.distanceFromRoute || 0) - (b.distanceFromRoute || 0)
    )

    return truckStops.slice(0, maxResults)
  } catch (error) {
    console.error('Failed to fetch truck stops:', error)
    return []
  }
}

/**
 * Get truck stops near a specific point
 */
export async function getTruckStopsNearPoint(
  lat: number,
  lng: number,
  radiusMiles: number = 25,
  maxResults: number = 10
): Promise<TruckStopInfo[]> {
  const radiusMeters = radiusMiles * 1609.34 // Convert miles to meters

  const query = `
    [out:json][timeout:30];
    (
      node["amenity"="fuel"]["hgv"="yes"](around:${radiusMeters},${lat},${lng});
      way["amenity"="fuel"]["hgv"="yes"](around:${radiusMeters},${lat},${lng});
      node["amenity"="fuel"]["brand"~"Pilot|Flying J|Love's|TA|Petro"](around:${radiusMeters},${lat},${lng});
      way["amenity"="fuel"]["brand"~"Pilot|Flying J|Love's|TA|Petro"](around:${radiusMeters},${lat},${lng});
    );
    out center;
  `

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    })

    if (!response.ok) {
      return []
    }

    const data: OverpassResponse = await response.json()
    const truckStops: TruckStopInfo[] = []

    for (const element of data.elements) {
      const stopLat = element.lat || element.center?.lat
      const stopLng = element.lon || element.center?.lon

      if (!stopLat || !stopLng) continue

      const tags = element.tags || {}
      const name = tags.name || tags.brand || 'Truck Stop'
      const distance = haversineDistance(lat, lng, stopLat, stopLng)

      const address = [
        tags['addr:street'],
        tags['addr:city'],
        tags['addr:state'],
        tags['addr:postcode'],
      ]
        .filter(Boolean)
        .join(', ')

      truckStops.push({
        id: `osm-${element.id}`,
        name,
        address: address || 'Address not available',
        city: tags['addr:city'] || '',
        state: tags['addr:state'] || '',
        coordinates: { lat: stopLat, lng: stopLng },
        amenities: parseAmenities(tags),
        distanceFromRoute: Math.round(distance * 10) / 10,
      })
    }

    truckStops.sort(
      (a, b) => (a.distanceFromRoute || 0) - (b.distanceFromRoute || 0)
    )

    return truckStops.slice(0, maxResults)
  } catch (error) {
    console.error('Failed to fetch truck stops:', error)
    return []
  }
}

export default getTruckStopsAlongRoute
