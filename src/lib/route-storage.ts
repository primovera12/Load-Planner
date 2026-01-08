/**
 * Route storage utilities for saving/loading routes to localStorage
 */

import type { RoutePermitSummary } from '@/types'

export interface SavedRoute {
  id: string
  name: string
  createdAt: string
  origin: string
  destination: string
  states: string[]
  cargo: {
    width: number
    height: number
    length: number
    weight: number
  }
  costs: {
    permits: number
    escorts: number
    fuel: number
    tolls: number
    total: number
  }
  routeData?: {
    totalDistance: number
    totalDuration: number
    stateDistances: Record<string, number>
  }
  isFavorite: boolean
}

const STORAGE_KEY = 'load-planner-routes'
const MAX_SAVED_ROUTES = 20

/**
 * Get all saved routes
 */
export function getSavedRoutes(): SavedRoute[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Save a new route
 */
export function saveRoute(route: Omit<SavedRoute, 'id' | 'createdAt'>): SavedRoute {
  const routes = getSavedRoutes()

  const newRoute: SavedRoute = {
    ...route,
    id: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }

  // Add to beginning, limit total
  const updated = [newRoute, ...routes].slice(0, MAX_SAVED_ROUTES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return newRoute
}

/**
 * Delete a saved route
 */
export function deleteRoute(id: string): void {
  const routes = getSavedRoutes()
  const updated = routes.filter(r => r.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

/**
 * Toggle favorite status
 */
export function toggleFavorite(id: string): void {
  const routes = getSavedRoutes()
  const updated = routes.map(r =>
    r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

/**
 * Get a single route by ID
 */
export function getRouteById(id: string): SavedRoute | null {
  const routes = getSavedRoutes()
  return routes.find(r => r.id === id) || null
}

/**
 * Format date for display
 */
export function formatRouteDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

/**
 * Generate a shareable route URL
 */
export function generateShareableUrl(route: SavedRoute): string {
  const params = new URLSearchParams({
    o: route.origin,
    d: route.destination,
    w: route.cargo.width.toString(),
    h: route.cargo.height.toString(),
    l: route.cargo.length.toString(),
    wt: route.cargo.weight.toString(),
    s: route.states.join(','),
  })

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/routes?${params.toString()}`
  }
  return `/routes?${params.toString()}`
}

/**
 * Parse URL parameters to route data
 */
export function parseRouteFromUrl(searchParams: URLSearchParams): Partial<SavedRoute['cargo']> & { origin?: string; destination?: string; states?: string[] } | null {
  const origin = searchParams.get('o')
  const destination = searchParams.get('d')
  const width = searchParams.get('w')
  const height = searchParams.get('h')
  const length = searchParams.get('l')
  const weight = searchParams.get('wt')
  const states = searchParams.get('s')

  if (!width && !height && !length && !weight) {
    return null
  }

  return {
    origin: origin || undefined,
    destination: destination || undefined,
    width: width ? parseFloat(width) : undefined,
    height: height ? parseFloat(height) : undefined,
    length: length ? parseFloat(length) : undefined,
    weight: weight ? parseFloat(weight) : undefined,
    states: states ? states.split(',') : undefined,
  }
}

/**
 * Cargo presets for quick selection
 */
export interface CargoPreset {
  id: string
  name: string
  description: string
  width: number
  height: number
  length: number
  weight: number
  category: 'construction' | 'agriculture' | 'industrial' | 'custom'
}

export const CARGO_PRESETS: CargoPreset[] = [
  // Construction Equipment
  {
    id: 'excavator-small',
    name: 'Small Excavator',
    description: 'CAT 320 or similar',
    width: 10,
    height: 10,
    length: 32,
    weight: 52000,
    category: 'construction',
  },
  {
    id: 'excavator-large',
    name: 'Large Excavator',
    description: 'CAT 390 or similar',
    width: 11.5,
    height: 11,
    length: 40,
    weight: 95000,
    category: 'construction',
  },
  {
    id: 'bulldozer',
    name: 'Bulldozer D6',
    description: 'Medium track dozer',
    width: 10,
    height: 10.5,
    length: 20,
    weight: 48000,
    category: 'construction',
  },
  {
    id: 'crane-lattice',
    name: 'Lattice Boom Crane',
    description: 'Crawler crane boom section',
    width: 12,
    height: 12,
    length: 60,
    weight: 85000,
    category: 'construction',
  },
  {
    id: 'loader',
    name: 'Wheel Loader',
    description: 'CAT 966 or similar',
    width: 10,
    height: 11.5,
    length: 28,
    weight: 55000,
    category: 'construction',
  },
  // Industrial
  {
    id: 'transformer',
    name: 'Power Transformer',
    description: 'Substation transformer',
    width: 14,
    height: 14,
    length: 25,
    weight: 120000,
    category: 'industrial',
  },
  {
    id: 'generator',
    name: 'Industrial Generator',
    description: 'Large standby generator',
    width: 10,
    height: 11,
    length: 35,
    weight: 65000,
    category: 'industrial',
  },
  {
    id: 'tank-vessel',
    name: 'Pressure Vessel',
    description: 'Industrial tank/vessel',
    width: 12,
    height: 13,
    length: 45,
    weight: 80000,
    category: 'industrial',
  },
  // Agriculture
  {
    id: 'combine',
    name: 'Combine Harvester',
    description: 'Large combine with header',
    width: 18,
    height: 13,
    length: 35,
    weight: 45000,
    category: 'agriculture',
  },
  {
    id: 'tractor-large',
    name: 'Large Tractor',
    description: 'John Deere 9R or similar',
    width: 10,
    height: 12,
    length: 22,
    weight: 52000,
    category: 'agriculture',
  },
]

/**
 * Toll estimation by state (rough averages per mile)
 */
export const STATE_TOLL_RATES: Record<string, number> = {
  // States with significant tolls ($ per mile, weighted average)
  'NY': 0.15,
  'NJ': 0.12,
  'PA': 0.10,
  'OH': 0.08,
  'IN': 0.06,
  'IL': 0.08,
  'FL': 0.10,
  'TX': 0.05,
  'OK': 0.04,
  'KS': 0.03,
  'MA': 0.08,
  'MD': 0.06,
  'DE': 0.04,
  'WV': 0.03,
  'VA': 0.04,
  'NC': 0.02,
  'CO': 0.03,
  'CA': 0.04,
  // Most other states have minimal or no tolls
}

/**
 * Estimate toll costs for a route
 */
export function estimateTolls(stateDistances: Record<string, number>): number {
  let totalTolls = 0

  for (const [state, distance] of Object.entries(stateDistances)) {
    const rate = STATE_TOLL_RATES[state] || 0
    totalTolls += distance * rate
  }

  // Add 20% buffer for oversize surcharges
  return Math.round(totalTolls * 1.2)
}

/**
 * Check if current date falls within seasonal restrictions
 */
export function checkSeasonalRestrictions(restrictions: string[]): {
  active: string[]
  upcoming: string[]
} {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const day = now.getDate()
  const hour = now.getHours()
  const dayOfWeek = now.getDay() // 0=Sunday, 6=Saturday

  const active: string[] = []
  const upcoming: string[] = []

  for (const restriction of restrictions) {
    const lower = restriction.toLowerCase()

    // Night restrictions (typically 9pm-6am or sunset-sunrise)
    if (lower.includes('night') || lower.includes('sunset') || lower.includes('dark')) {
      if (hour >= 21 || hour < 6) {
        active.push(restriction)
      } else if (hour >= 18) {
        upcoming.push('Night travel restriction starts soon')
      }
    }

    // Weekend restrictions
    if (lower.includes('weekend') || lower.includes('saturday') || lower.includes('sunday')) {
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        active.push(restriction)
      } else if (dayOfWeek === 5 && hour >= 12) {
        upcoming.push('Weekend restriction starts soon')
      }
    }

    // Holiday restrictions - simplified check for major holidays
    if (lower.includes('holiday')) {
      // Check common holiday periods
      const holidays = [
        { month: 1, day: 1 },   // New Year's
        { month: 5, day: 27 },  // Memorial Day (approximate)
        { month: 7, day: 4 },   // July 4th
        { month: 9, day: 4 },   // Labor Day (approximate)
        { month: 11, day: 23 }, // Thanksgiving (approximate)
        { month: 12, day: 25 }, // Christmas
      ]

      for (const holiday of holidays) {
        if (month === holiday.month && Math.abs(day - holiday.day) <= 1) {
          active.push(restriction)
          break
        }
        // Check if holiday is within 3 days
        if (month === holiday.month && Math.abs(day - holiday.day) <= 3) {
          upcoming.push('Holiday travel restriction approaching')
          break
        }
      }
    }

    // Winter/frost restrictions
    if (lower.includes('winter') || lower.includes('frost') || lower.includes('snow')) {
      if (month >= 11 || month <= 3) {
        active.push(restriction)
      }
    }

    // Spring thaw restrictions
    if (lower.includes('spring') || lower.includes('thaw')) {
      if (month >= 3 && month <= 5) {
        active.push(restriction)
      }
    }

    // Peak hours restrictions
    if (lower.includes('rush hour') || lower.includes('peak')) {
      if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
        active.push(restriction)
      } else if (hour === 6 || hour === 15) {
        upcoming.push('Rush hour restriction starts soon')
      }
    }
  }

  return {
    active: [...new Set(active)],
    upcoming: [...new Set(upcoming)],
  }
}
