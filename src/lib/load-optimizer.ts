/**
 * Load optimizer using bin packing algorithm
 * Arranges cargo items on trailer for optimal space usage and weight distribution
 */

import type { CargoItem } from '@/components/3d/cargo'
import { TRAILER_SPECS } from '@/components/3d/trailer-models'
import { AXLE_LIMITS } from '@/components/3d/weight-distribution'

export interface TrailerDimensions {
  length: number
  width: number
  height: number
  maxHeight: number // Legal max height from ground
  deckHeight: number
}

export interface OptimizationResult {
  success: boolean
  placements: CargoPlacement[]
  unplacedItems: CargoItem[]
  stats: OptimizationStats
  warnings: string[]
}

export interface CargoPlacement {
  item: CargoItem
  position: [number, number, number]
  rotated: boolean // Whether item was rotated 90 degrees
}

export interface OptimizationStats {
  totalWeight: number
  spaceUtilization: number // Percentage of deck area used
  volumeUtilization: number // Percentage of volume used
  weightBalance: number // -1 to 1 (0 = balanced, negative = front heavy)
  itemsPlaced: number
  itemsTotal: number
}

interface PlacementCell {
  x: number
  z: number
  width: number
  length: number
  available: boolean
}

/**
 * Main optimization function - arranges cargo on trailer
 */
export function optimizeLoad(
  items: CargoItem[],
  trailerType: string,
  options: {
    prioritizeWeight?: boolean
    allowRotation?: boolean
    optimizeForBalance?: boolean
  } = {}
): OptimizationResult {
  const {
    prioritizeWeight = true,
    allowRotation = true,
    optimizeForBalance = true,
  } = options

  const spec = TRAILER_SPECS[trailerType] || TRAILER_SPECS.flatbed
  const trailer: TrailerDimensions = {
    length: spec.deckLength,
    width: spec.deckWidth,
    height: spec.deckHeight,
    maxHeight: 13.5, // Legal limit
    deckHeight: spec.deckHeight,
  }

  const maxCargoHeight = trailer.maxHeight - trailer.deckHeight
  const warnings: string[] = []
  const placements: CargoPlacement[] = []
  const unplacedItems: CargoItem[] = []

  // Sort items by size/weight for better packing
  const sortedItems = [...items].sort((a, b) => {
    if (prioritizeWeight) {
      // Place heavier items first (towards front for better balance)
      return b.weight - a.weight
    } else {
      // Place larger footprint items first
      return (b.length * b.width) - (a.length * a.width)
    }
  })

  // Track occupied spaces using a grid-based approach
  const occupiedAreas: { x: number; z: number; length: number; width: number }[] = []

  // Calculate running weight totals
  let totalWeight = 0
  let weightMoment = 0 // For center of gravity

  for (const item of sortedItems) {
    // Check height limit
    if (item.height > maxCargoHeight) {
      warnings.push(`${item.name} exceeds height limit (${item.height}' > ${maxCargoHeight}')`)
    }

    // Check weight limit
    if (totalWeight + item.weight > AXLE_LIMITS.grossWeight - 29000) {
      // Reserve ~29000 for truck+trailer weight
      warnings.push(`${item.name} would exceed weight limit`)
      unplacedItems.push(item)
      continue
    }

    // Find best position for this item
    const placement = findBestPosition(
      item,
      trailer,
      occupiedAreas,
      allowRotation,
      optimizeForBalance,
      totalWeight,
      weightMoment
    )

    if (placement) {
      placements.push(placement)
      occupiedAreas.push({
        x: placement.position[0] - (placement.rotated ? item.width : item.length) / 2,
        z: placement.position[2] - (placement.rotated ? item.length : item.width) / 2,
        length: placement.rotated ? item.width : item.length,
        width: placement.rotated ? item.length : item.width,
      })

      // Update weight tracking
      totalWeight += item.weight
      weightMoment += item.weight * placement.position[0]
    } else {
      unplacedItems.push(item)
      warnings.push(`Could not find space for ${item.name}`)
    }
  }

  // Calculate statistics
  const deckArea = trailer.length * trailer.width
  const usedArea = occupiedAreas.reduce((sum, area) => sum + area.length * area.width, 0)
  const spaceUtilization = (usedArea / deckArea) * 100

  const maxVolume = trailer.length * trailer.width * maxCargoHeight
  const usedVolume = placements.reduce(
    (sum, p) => sum + p.item.length * p.item.width * p.item.height,
    0
  )
  const volumeUtilization = (usedVolume / maxVolume) * 100

  // Calculate weight balance (-1 = all front, 0 = center, 1 = all back)
  const avgPosition = totalWeight > 0 ? weightMoment / totalWeight : 0
  const weightBalance = avgPosition / (trailer.length / 2) // Normalize to -1 to 1

  return {
    success: unplacedItems.length === 0,
    placements,
    unplacedItems,
    stats: {
      totalWeight,
      spaceUtilization: Math.round(spaceUtilization * 10) / 10,
      volumeUtilization: Math.round(volumeUtilization * 10) / 10,
      weightBalance: Math.round(weightBalance * 100) / 100,
      itemsPlaced: placements.length,
      itemsTotal: items.length,
    },
    warnings,
  }
}

/**
 * Find the best position for an item on the trailer
 */
function findBestPosition(
  item: CargoItem,
  trailer: TrailerDimensions,
  occupiedAreas: { x: number; z: number; length: number; width: number }[],
  allowRotation: boolean,
  optimizeForBalance: boolean,
  currentWeight: number,
  currentMoment: number
): CargoPlacement | null {
  const candidates: { position: [number, number, number]; rotated: boolean; score: number }[] = []

  // Try both orientations
  const orientations: { length: number; width: number; rotated: boolean }[] = [
    { length: item.length, width: item.width, rotated: false },
  ]

  if (allowRotation && item.length !== item.width) {
    orientations.push({ length: item.width, width: item.length, rotated: true })
  }

  // Grid step size for position search
  const stepSize = 1 // 1 foot increments

  for (const orientation of orientations) {
    const halfLength = orientation.length / 2
    const halfWidth = orientation.width / 2

    // Search from front to back of trailer
    for (
      let x = -trailer.length / 2 + halfLength;
      x <= trailer.length / 2 - halfLength;
      x += stepSize
    ) {
      // Search across width
      for (
        let z = -trailer.width / 2 + halfWidth;
        z <= trailer.width / 2 - halfWidth;
        z += stepSize
      ) {
        // Check if position is clear
        const testArea = {
          x: x - halfLength,
          z: z - halfWidth,
          length: orientation.length,
          width: orientation.width,
        }

        if (!isAreaOccupied(testArea, occupiedAreas)) {
          // Calculate score for this position
          let score = 100

          if (optimizeForBalance) {
            // Prefer positions that balance the load
            const newMoment = currentMoment + item.weight * x
            const newWeight = currentWeight + item.weight
            const newCG = newMoment / newWeight

            // Penalize positions far from center
            score -= Math.abs(newCG) * 2

            // Bonus for keeping heavy items near front/center
            if (item.weight > 10000) {
              score += (trailer.length / 2 - x) * 0.5
            }
          }

          // Prefer positions against walls/other cargo (better stability)
          if (Math.abs(z) > trailer.width / 2 - orientation.width) {
            score += 5
          }

          // Prefer positions towards front (for better weight distribution)
          score += (trailer.length / 2 - x) * 0.1

          candidates.push({
            position: [x, 0, z],
            rotated: orientation.rotated,
            score,
          })
        }
      }
    }
  }

  if (candidates.length === 0) {
    return null
  }

  // Sort by score and return best
  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]

  return {
    item,
    position: best.position,
    rotated: best.rotated,
  }
}

/**
 * Check if an area overlaps with any occupied areas
 */
function isAreaOccupied(
  testArea: { x: number; z: number; length: number; width: number },
  occupiedAreas: { x: number; z: number; length: number; width: number }[]
): boolean {
  for (const occupied of occupiedAreas) {
    // Check for rectangle overlap
    const xOverlap =
      testArea.x < occupied.x + occupied.length &&
      testArea.x + testArea.length > occupied.x

    const zOverlap =
      testArea.z < occupied.z + occupied.width &&
      testArea.z + testArea.width > occupied.z

    if (xOverlap && zOverlap) {
      return true
    }
  }

  return false
}

/**
 * Apply optimization results to cargo items
 */
export function applyOptimization(
  items: CargoItem[],
  result: OptimizationResult
): CargoItem[] {
  const placementMap = new Map<string, CargoPlacement>()

  for (const placement of result.placements) {
    placementMap.set(placement.item.id, placement)
  }

  return items.map((item) => {
    const placement = placementMap.get(item.id)
    if (placement) {
      return {
        ...item,
        position: placement.position,
        // If rotated, swap dimensions
        length: placement.rotated ? item.width : item.length,
        width: placement.rotated ? item.length : item.width,
      }
    }
    return item
  })
}

/**
 * Generate loading instructions based on optimization
 */
export function generateLoadingInstructions(
  result: OptimizationResult
): string[] {
  const instructions: string[] = []

  // Sort placements by loading order (back to front, then left to right)
  const sorted = [...result.placements].sort((a, b) => {
    // Load from back to front
    if (Math.abs(a.position[0] - b.position[0]) > 1) {
      return b.position[0] - a.position[0] // Higher x (back) first
    }
    // Then left to right
    return a.position[2] - b.position[2]
  })

  instructions.push('LOADING SEQUENCE:')
  instructions.push('')

  sorted.forEach((placement, idx) => {
    const { item, position, rotated } = placement
    const xPos = position[0] > 0 ? `${Math.abs(position[0]).toFixed(1)}' from center (rear)` :
                 position[0] < 0 ? `${Math.abs(position[0]).toFixed(1)}' from center (front)` :
                 'at center'
    const zPos = position[2] > 0 ? `${Math.abs(position[2]).toFixed(1)}' right of center` :
                 position[2] < 0 ? `${Math.abs(position[2]).toFixed(1)}' left of center` :
                 'centered'

    instructions.push(`${idx + 1}. ${item.name}`)
    instructions.push(`   Position: ${xPos}, ${zPos}`)
    instructions.push(`   Dimensions: ${item.length}' L × ${item.width}' W × ${item.height}' H`)
    instructions.push(`   Weight: ${item.weight.toLocaleString()} lbs`)
    if (rotated) {
      instructions.push(`   Note: Load rotated 90°`)
    }
    instructions.push('')
  })

  // Add summary
  instructions.push('SUMMARY:')
  instructions.push(`Total Items: ${result.stats.itemsPlaced}`)
  instructions.push(`Total Weight: ${result.stats.totalWeight.toLocaleString()} lbs`)
  instructions.push(`Space Utilization: ${result.stats.spaceUtilization}%`)

  if (result.warnings.length > 0) {
    instructions.push('')
    instructions.push('WARNINGS:')
    result.warnings.forEach((w) => instructions.push(`• ${w}`))
  }

  return instructions
}

/**
 * Estimate number of trailers needed for items
 */
export function estimateTrailersNeeded(
  items: CargoItem[],
  trailerType: string
): { count: number; byWeight: number; bySpace: number } {
  const spec = TRAILER_SPECS[trailerType] || TRAILER_SPECS.flatbed

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  const totalFootprint = items.reduce((sum, item) => sum + item.length * item.width, 0)

  const maxWeight = AXLE_LIMITS.grossWeight - 29000 // Available cargo weight
  const deckArea = spec.deckLength * spec.deckWidth

  const byWeight = Math.ceil(totalWeight / maxWeight)
  const bySpace = Math.ceil(totalFootprint / (deckArea * 0.8)) // Assume 80% efficiency

  return {
    count: Math.max(byWeight, bySpace),
    byWeight,
    bySpace,
  }
}
