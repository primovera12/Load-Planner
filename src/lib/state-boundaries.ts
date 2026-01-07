/**
 * State Boundary Detection for Load Planner
 *
 * Determines which US states a route passes through based on coordinates
 */

import { RoutePoint } from './google-maps'

// US State boundaries (approximate bounding boxes)
// Format: [minLat, maxLat, minLng, maxLng]
const STATE_BOUNDS: Record<string, [number, number, number, number]> = {
  AL: [30.22, 35.01, -88.47, -84.89],
  AK: [51.21, 71.39, -179.15, -129.98],
  AZ: [31.33, 37.00, -114.82, -109.04],
  AR: [33.00, 36.50, -94.62, -89.64],
  CA: [32.53, 42.01, -124.48, -114.13],
  CO: [36.99, 41.00, -109.06, -102.04],
  CT: [40.95, 42.05, -73.73, -71.79],
  DE: [38.45, 39.84, -75.79, -75.05],
  FL: [24.52, 31.00, -87.63, -80.03],
  GA: [30.36, 35.00, -85.61, -80.84],
  HI: [18.91, 22.24, -160.25, -154.81],
  ID: [41.99, 49.00, -117.24, -111.04],
  IL: [36.97, 42.51, -91.51, -87.02],
  IN: [37.77, 41.76, -88.10, -84.78],
  IA: [40.38, 43.50, -96.64, -90.14],
  KS: [36.99, 40.00, -102.05, -94.59],
  KY: [36.50, 39.15, -89.57, -81.96],
  LA: [28.93, 33.02, -94.04, -88.82],
  ME: [43.06, 47.46, -71.08, -66.95],
  MD: [37.91, 39.72, -79.49, -75.05],
  MA: [41.24, 42.89, -73.50, -69.93],
  MI: [41.70, 48.19, -90.42, -82.12],
  MN: [43.50, 49.38, -97.24, -89.49],
  MS: [30.17, 35.00, -91.66, -88.10],
  MO: [35.99, 40.61, -95.77, -89.10],
  MT: [44.36, 49.00, -116.05, -104.04],
  NE: [40.00, 43.00, -104.05, -95.31],
  NV: [35.00, 42.00, -120.01, -114.04],
  NH: [42.70, 45.31, -72.56, -70.70],
  NJ: [38.93, 41.36, -75.56, -73.89],
  NM: [31.33, 37.00, -109.05, -103.00],
  NY: [40.50, 45.02, -79.76, -71.86],
  NC: [33.84, 36.59, -84.32, -75.46],
  ND: [45.94, 49.00, -104.05, -96.55],
  OH: [38.40, 42.33, -84.82, -80.52],
  OK: [33.62, 37.00, -103.00, -94.43],
  OR: [41.99, 46.29, -124.57, -116.46],
  PA: [39.72, 42.27, -80.52, -74.69],
  RI: [41.15, 42.02, -71.86, -71.12],
  SC: [32.03, 35.22, -83.35, -78.54],
  SD: [42.48, 45.95, -104.06, -96.44],
  TN: [34.98, 36.68, -90.31, -81.65],
  TX: [25.84, 36.50, -106.65, -93.51],
  UT: [36.99, 42.00, -114.05, -109.04],
  VT: [42.73, 45.02, -73.44, -71.46],
  VA: [36.54, 39.47, -83.68, -75.24],
  WA: [45.54, 49.00, -124.85, -116.92],
  WV: [37.20, 40.64, -82.64, -77.72],
  WI: [42.49, 47.08, -92.89, -86.25],
  WY: [40.99, 45.01, -111.06, -104.05],
}

// State center points for fallback matching
const STATE_CENTERS: Record<string, [number, number]> = {
  AL: [32.80, -86.79],
  AK: [64.07, -153.37],
  AZ: [34.27, -111.66],
  AR: [34.90, -92.44],
  CA: [36.78, -119.42],
  CO: [39.11, -105.36],
  CT: [41.60, -72.70],
  DE: [39.00, -75.50],
  FL: [27.77, -81.69],
  GA: [33.04, -83.64],
  HI: [19.90, -155.58],
  ID: [44.24, -114.48],
  IL: [40.35, -89.00],
  IN: [39.85, -86.26],
  IA: [42.01, -93.21],
  KS: [38.53, -98.38],
  KY: [37.67, -84.67],
  LA: [31.17, -91.87],
  ME: [45.37, -69.24],
  MD: [39.06, -76.80],
  MA: [42.23, -71.53],
  MI: [44.18, -84.51],
  MN: [46.39, -94.64],
  MS: [32.75, -89.67],
  MO: [38.46, -92.29],
  MT: [46.92, -110.45],
  NE: [41.49, -99.90],
  NV: [38.50, -117.02],
  NH: [43.45, -71.56],
  NJ: [40.30, -74.52],
  NM: [34.84, -106.25],
  NY: [42.17, -74.95],
  NC: [35.63, -79.81],
  ND: [47.53, -100.47],
  OH: [40.42, -82.91],
  OK: [35.59, -97.49],
  OR: [43.94, -120.55],
  PA: [40.88, -77.80],
  RI: [41.68, -71.51],
  SC: [33.86, -80.95],
  SD: [44.30, -100.23],
  TN: [35.75, -86.25],
  TX: [31.05, -97.56],
  UT: [39.32, -111.09],
  VT: [44.07, -72.67],
  VA: [37.77, -78.17],
  WA: [47.40, -121.49],
  WV: [38.64, -80.62],
  WI: [44.63, -89.71],
  WY: [42.76, -107.30],
}

/**
 * Check if a point is within a state's bounding box
 */
function isPointInStateBounds(
  lat: number,
  lng: number,
  stateCode: string
): boolean {
  const bounds = STATE_BOUNDS[stateCode]
  if (!bounds) return false

  const [minLat, maxLat, minLng, maxLng] = bounds
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng
}

/**
 * Find which state a coordinate is in
 */
export function getStateForCoordinate(lat: number, lng: number): string | null {
  // First, check bounding boxes
  const candidates: string[] = []

  for (const [stateCode, bounds] of Object.entries(STATE_BOUNDS)) {
    if (isPointInStateBounds(lat, lng, stateCode)) {
      candidates.push(stateCode)
    }
  }

  // If only one match, return it
  if (candidates.length === 1) {
    return candidates[0]
  }

  // If multiple matches (overlapping bounds), use closest center
  if (candidates.length > 1) {
    let closestState = candidates[0]
    let closestDist = Infinity

    for (const state of candidates) {
      const center = STATE_CENTERS[state]
      if (center) {
        const dist = Math.sqrt(
          Math.pow(lat - center[0], 2) + Math.pow(lng - center[1], 2)
        )
        if (dist < closestDist) {
          closestDist = dist
          closestState = state
        }
      }
    }

    return closestState
  }

  // No match found - find closest state center
  let closestState: string | null = null
  let closestDist = Infinity

  for (const [stateCode, center] of Object.entries(STATE_CENTERS)) {
    const dist = Math.sqrt(
      Math.pow(lat - center[0], 2) + Math.pow(lng - center[1], 2)
    )
    if (dist < closestDist) {
      closestDist = dist
      closestState = stateCode
    }
  }

  return closestState
}

/**
 * Get all states that a route passes through, in order
 */
export function getStatesAlongRoute(points: RoutePoint[]): string[] {
  const states: string[] = []
  let lastState: string | null = null

  for (const point of points) {
    const state = getStateForCoordinate(point.lat, point.lng)

    if (state && state !== lastState) {
      states.push(state)
      lastState = state
    }
  }

  return states
}

/**
 * Calculate approximate distance traveled in each state
 */
export function getDistanceByState(
  points: RoutePoint[],
  totalDistance: number
): Record<string, number> {
  if (points.length < 2) {
    return {}
  }

  const stateDistances: Record<string, number> = {}
  let totalPoints = points.length - 1

  for (let i = 0; i < points.length - 1; i++) {
    const state = getStateForCoordinate(points[i].lat, points[i].lng)
    if (state) {
      // Approximate distance per segment
      const segmentDistance = totalDistance / totalPoints
      stateDistances[state] = (stateDistances[state] || 0) + segmentDistance
    }
  }

  // Round distances
  for (const state of Object.keys(stateDistances)) {
    stateDistances[state] = Math.round(stateDistances[state])
  }

  return stateDistances
}

/**
 * Get state name from code
 */
export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
}

export function getStateName(code: string): string {
  return STATE_NAMES[code] || code
}
