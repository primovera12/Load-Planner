/**
 * Route Optimizer
 *
 * Uses a modified TSP (Traveling Salesman Problem) algorithm that respects
 * pickup-before-delivery constraints for each item.
 */

import { RouteStop, ItemStopAssignment, RouteOptimizationResult } from '@/types/route-planning'

interface StopWithCoords {
  id: string
  lat: number
  lng: number
  type: 'PICKUP' | 'DELIVERY'
}

/**
 * Calculate distance between two points using Haversine formula
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
 * Build a distance matrix between all stops
 */
function buildDistanceMatrix(stops: StopWithCoords[]): number[][] {
  const n = stops.length
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = haversineDistance(
          stops[i].lat,
          stops[i].lng,
          stops[j].lat,
          stops[j].lng
        )
      }
    }
  }

  return matrix
}

/**
 * Calculate total route distance for a given order
 */
function calculateRouteDistance(
  order: number[],
  distanceMatrix: number[][]
): number {
  let distance = 0
  for (let i = 0; i < order.length - 1; i++) {
    distance += distanceMatrix[order[i]][order[i + 1]]
  }
  return distance
}

/**
 * Check if an order respects all pickup-before-delivery constraints
 */
function isValidOrder(
  order: number[],
  stops: StopWithCoords[],
  itemAssignments: ItemStopAssignment[]
): boolean {
  const stopIdToPosition = new Map<string, number>()
  order.forEach((index, position) => {
    stopIdToPosition.set(stops[index].id, position)
  })

  for (const assignment of itemAssignments) {
    const pickupPos = stopIdToPosition.get(assignment.pickupStopId)
    const deliveryPos = stopIdToPosition.get(assignment.deliveryStopId)

    if (pickupPos === undefined || deliveryPos === undefined) continue

    if (pickupPos >= deliveryPos) {
      return false // Pickup must come before delivery
    }
  }

  return true
}

/**
 * Generate all permutations of an array (for small arrays)
 */
function* permutations<T>(arr: T[]): Generator<T[]> {
  if (arr.length <= 1) {
    yield arr
    return
  }

  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const perm of permutations(rest)) {
      yield [arr[i], ...perm]
    }
  }
}

/**
 * Nearest neighbor heuristic with constraint checking
 */
function nearestNeighborWithConstraints(
  stops: StopWithCoords[],
  distanceMatrix: number[][],
  itemAssignments: ItemStopAssignment[]
): number[] {
  const n = stops.length
  if (n === 0) return []

  const visited = new Set<number>()
  const route: number[] = []

  // Find the first pickup stop to start with
  let startIndex = stops.findIndex((s) => s.type === 'PICKUP')
  if (startIndex === -1) startIndex = 0

  route.push(startIndex)
  visited.add(startIndex)

  // Build route using nearest neighbor with constraint checking
  while (route.length < n) {
    const currentIndex = route[route.length - 1]
    let bestNext = -1
    let bestDistance = Infinity

    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue

      // Check if adding this stop would violate constraints
      const testRoute = [...route, i]
      const testOrder = testRoute.map((idx) => stops[idx].id)

      // Build a temporary stop array for constraint checking
      const tempStops = testRoute.map((idx) => stops[idx])

      // Check pickup-before-delivery constraints
      let isValid = true
      for (const assignment of itemAssignments) {
        const pickupIdx = tempStops.findIndex(
          (s) => s.id === assignment.pickupStopId
        )
        const deliveryIdx = tempStops.findIndex(
          (s) => s.id === assignment.deliveryStopId
        )

        // If delivery is in route but pickup isn't, this is invalid
        if (deliveryIdx >= 0 && pickupIdx < 0) {
          const hasPickupLater = stops.some(
            (s, idx) =>
              !visited.has(idx) &&
              idx !== i &&
              s.id === assignment.pickupStopId
          )
          if (!hasPickupLater) {
            isValid = false
            break
          }
        }

        // If both are in route, pickup must come first
        if (pickupIdx >= 0 && deliveryIdx >= 0 && pickupIdx > deliveryIdx) {
          isValid = false
          break
        }
      }

      if (!isValid) continue

      const distance = distanceMatrix[currentIndex][i]
      if (distance < bestDistance) {
        bestDistance = distance
        bestNext = i
      }
    }

    if (bestNext === -1) {
      // No valid next stop found, just pick any unvisited
      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          bestNext = i
          break
        }
      }
    }

    if (bestNext !== -1) {
      route.push(bestNext)
      visited.add(bestNext)
    } else {
      break
    }
  }

  return route
}

/**
 * 2-opt improvement with constraint checking
 */
function twoOptWithConstraints(
  initialRoute: number[],
  stops: StopWithCoords[],
  distanceMatrix: number[][],
  itemAssignments: ItemStopAssignment[],
  maxIterations: number = 1000
): number[] {
  let route = [...initialRoute]
  let improved = true
  let iterations = 0

  while (improved && iterations < maxIterations) {
    improved = false
    iterations++

    for (let i = 0; i < route.length - 2; i++) {
      for (let j = i + 2; j < route.length; j++) {
        // Create new route by reversing segment between i+1 and j
        const newRoute = [
          ...route.slice(0, i + 1),
          ...route.slice(i + 1, j + 1).reverse(),
          ...route.slice(j + 1),
        ]

        // Check if new route is valid
        if (!isValidOrder(newRoute, stops, itemAssignments)) {
          continue
        }

        // Check if new route is shorter
        const currentDist = calculateRouteDistance(route, distanceMatrix)
        const newDist = calculateRouteDistance(newRoute, distanceMatrix)

        if (newDist < currentDist) {
          route = newRoute
          improved = true
        }
      }
    }
  }

  return route
}

/**
 * Optimize route for multiple stops with pickup-before-delivery constraints
 */
export function optimizeRoute(
  stops: RouteStop[],
  itemAssignments: ItemStopAssignment[]
): RouteOptimizationResult {
  // Filter stops with valid coordinates
  const validStops: StopWithCoords[] = stops
    .filter((s) => s.latitude !== undefined && s.longitude !== undefined)
    .map((s) => ({
      id: s.id,
      lat: s.latitude!,
      lng: s.longitude!,
      type: s.type,
    }))

  if (validStops.length < 3) {
    return {
      originalOrder: stops.map((s) => s.id),
      optimizedOrder: stops.map((s) => s.id),
      originalDistance: 0,
      optimizedDistance: 0,
      distanceSaved: 0,
      timeSaved: 0,
      isValid: true,
      message: 'Not enough stops to optimize',
    }
  }

  // Build distance matrix
  const distanceMatrix = buildDistanceMatrix(validStops)

  // Calculate original distance
  const originalOrder = validStops.map((_, i) => i)
  const originalDistance = calculateRouteDistance(originalOrder, distanceMatrix)

  let optimizedRoute: number[]

  // For small number of stops, try all permutations
  if (validStops.length <= 8) {
    let bestRoute = originalOrder
    let bestDistance = originalDistance

    for (const perm of permutations(originalOrder)) {
      if (!isValidOrder(perm, validStops, itemAssignments)) continue

      const distance = calculateRouteDistance(perm, distanceMatrix)
      if (distance < bestDistance) {
        bestDistance = distance
        bestRoute = perm
      }
    }

    optimizedRoute = bestRoute
  } else {
    // For larger routes, use heuristics
    const nnRoute = nearestNeighborWithConstraints(
      validStops,
      distanceMatrix,
      itemAssignments
    )
    optimizedRoute = twoOptWithConstraints(
      nnRoute,
      validStops,
      distanceMatrix,
      itemAssignments
    )
  }

  const optimizedDistance = calculateRouteDistance(optimizedRoute, distanceMatrix)
  const distanceSaved = originalDistance - optimizedDistance

  // Estimate time saved (assuming 50 mph average)
  const timeSaved = (distanceSaved / 50) * 60 // minutes

  // Map back to stop IDs
  const optimizedOrder = optimizedRoute.map((i) => validStops[i].id)

  // Add any stops without coordinates at the end (in their original order)
  const stopIdsWithCoords = new Set(validStops.map((s) => s.id))
  stops.forEach((stop) => {
    if (!stopIdsWithCoords.has(stop.id)) {
      optimizedOrder.push(stop.id)
    }
  })

  return {
    originalOrder: stops.map((s) => s.id),
    optimizedOrder,
    originalDistance: Math.round(originalDistance * 10) / 10,
    optimizedDistance: Math.round(optimizedDistance * 10) / 10,
    distanceSaved: Math.round(distanceSaved * 10) / 10,
    timeSaved: Math.round(timeSaved),
    isValid: isValidOrder(optimizedRoute, validStops, itemAssignments),
    message:
      distanceSaved > 0
        ? `Route optimized! Saved ${Math.round(distanceSaved)} miles.`
        : 'Route is already optimal.',
  }
}

export default optimizeRoute
