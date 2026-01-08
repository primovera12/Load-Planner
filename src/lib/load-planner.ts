/**
 * Load Planner - Multi-truck planning and item assignment
 *
 * This module handles:
 * 1. Determining how many trucks are needed
 * 2. Assigning items to trucks optimally
 * 3. Recommending the best truck type for each load
 */

import { LoadItem, ParsedLoad } from '@/types/load'
import { TruckType, TruckRecommendation } from '@/types/truck'
import { trucks } from '@/data/trucks'
import { LEGAL_LIMITS } from '@/types'

export interface ItemPlacement {
  itemId: string
  x: number // position from front of trailer (feet)
  z: number // position from left edge (feet)
  rotated: boolean
}

export interface PlannedLoad {
  id: string
  items: LoadItem[]
  // Aggregate dimensions for this load
  length: number
  width: number
  height: number
  weight: number
  // Truck recommendation for this specific load
  recommendedTruck: TruckType
  truckScore: number
  // Item placements for visualization
  placements: ItemPlacement[]
  // Permits needed
  permitsRequired: string[]
  // Warnings
  warnings: string[]
  // Is this load legal without permits?
  isLegal: boolean
}

export interface LoadPlan {
  // All planned loads (one per truck)
  loads: PlannedLoad[]
  // Summary
  totalTrucks: number
  totalWeight: number
  totalItems: number
  // Items that couldn't be assigned (too large for any truck)
  unassignedItems: LoadItem[]
  // Overall warnings
  warnings: string[]
}

/**
 * Calculate optimal placements for items on a truck deck
 * Uses a simple bin-packing algorithm (bottom-left first fit)
 */
function calculatePlacements(items: LoadItem[], truck: TruckType): ItemPlacement[] {
  const placements: ItemPlacement[] = []
  const occupiedAreas: { x: number; z: number; length: number; width: number }[] = []

  // Sort items by area (largest first for better packing)
  const sortedItems = [...items].sort((a, b) =>
    (b.length * b.width) - (a.length * a.width)
  )

  for (const item of sortedItems) {
    const placement = findBestPlacement(item, truck, occupiedAreas)
    if (placement) {
      placements.push(placement)
      const itemLength = placement.rotated ? item.width : item.length
      const itemWidth = placement.rotated ? item.length : item.width
      occupiedAreas.push({
        x: placement.x,
        z: placement.z,
        length: itemLength,
        width: itemWidth
      })
    } else {
      // Fallback: place at origin if no space found (shouldn't happen if canShareTruck works)
      placements.push({
        itemId: item.id,
        x: 0,
        z: 0,
        rotated: false
      })
    }
  }

  return placements
}

/**
 * Find the best position for an item on the deck
 */
function findBestPlacement(
  item: LoadItem,
  truck: TruckType,
  occupiedAreas: { x: number; z: number; length: number; width: number }[]
): ItemPlacement | null {
  const candidates: { x: number; z: number; rotated: boolean; score: number }[] = []

  // Try both orientations
  const orientations = [
    { length: item.length, width: item.width, rotated: false },
    { length: item.width, width: item.length, rotated: true }
  ]

  // Only try rotation if dimensions differ
  const tryRotation = item.length !== item.width

  for (const orientation of tryRotation ? orientations : [orientations[0]]) {
    // Check if this orientation fits on truck
    if (orientation.length > truck.deckLength || orientation.width > truck.deckWidth) {
      continue
    }

    // Try positions from front-left corner, moving right then back
    const stepSize = 0.5 // Half-foot increments for finer placement

    for (let x = 0; x <= truck.deckLength - orientation.length; x += stepSize) {
      for (let z = 0; z <= truck.deckWidth - orientation.width; z += stepSize) {
        // Check if this position overlaps with existing items
        const testArea = {
          x,
          z,
          length: orientation.length,
          width: orientation.width
        }

        if (!isAreaOccupied(testArea, occupiedAreas)) {
          // Score this position (prefer front-left positions)
          let score = 100
          score -= x * 0.5 // Penalize positions further back
          score -= z * 0.3 // Slightly penalize positions to the right

          // Bonus for positions against edges (stability)
          if (z === 0 || z + orientation.width >= truck.deckWidth) score += 5
          if (x === 0) score += 10 // Prefer front

          // Bonus for positions adjacent to other cargo
          for (const occupied of occupiedAreas) {
            // Adjacent on x-axis
            if (Math.abs(x - (occupied.x + occupied.length)) < 0.5 ||
                Math.abs((x + orientation.length) - occupied.x) < 0.5) {
              score += 3
            }
            // Adjacent on z-axis
            if (Math.abs(z - (occupied.z + occupied.width)) < 0.5 ||
                Math.abs((z + orientation.width) - occupied.z) < 0.5) {
              score += 3
            }
          }

          candidates.push({
            x,
            z,
            rotated: orientation.rotated,
            score
          })
        }
      }
    }
  }

  if (candidates.length === 0) {
    return null
  }

  // Return best position
  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]

  return {
    itemId: item.id,
    x: best.x,
    z: best.z,
    rotated: best.rotated
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
    // Check for rectangle overlap with small tolerance
    const tolerance = 0.01
    const xOverlap =
      testArea.x < occupied.x + occupied.length - tolerance &&
      testArea.x + testArea.length > occupied.x + tolerance

    const zOverlap =
      testArea.z < occupied.z + occupied.width - tolerance &&
      testArea.z + testArea.width > occupied.z + tolerance

    if (xOverlap && zOverlap) {
      return true
    }
  }

  return false
}

/**
 * Find the best truck for a specific item based on its dimensions
 */
function findBestTruckForItem(item: LoadItem): { truck: TruckType; score: number; isLegal: boolean; permits: string[] } {
  let bestTruck = trucks[0]
  let bestScore = 0
  let bestIsLegal = false
  let bestPermits: string[] = []

  for (const truck of trucks) {
    const totalHeight = item.height + truck.deckHeight
    const totalWeight = item.weight + truck.tareWeight + LEGAL_LIMITS.TRACTOR_WEIGHT

    // Check if item physically fits
    const fits =
      item.length <= truck.deckLength &&
      item.width <= truck.deckWidth &&
      item.weight <= truck.maxCargoWeight

    if (!fits) continue

    // Check legal limits
    const exceedsHeight = totalHeight > LEGAL_LIMITS.HEIGHT
    const exceedsWidth = item.width > LEGAL_LIMITS.WIDTH
    const exceedsWeight = totalWeight > LEGAL_LIMITS.GROSS_WEIGHT
    const isLegal = !exceedsHeight && !exceedsWidth && !exceedsWeight

    // Calculate permits needed
    const permits: string[] = []
    if (exceedsHeight) permits.push(`Oversize Height (${totalHeight.toFixed(1)}' > 13.5')`)
    if (exceedsWidth) permits.push(`Oversize Width (${item.width.toFixed(1)}' > 8.5')`)
    if (exceedsWeight) permits.push(`Overweight (${totalWeight.toLocaleString()} lbs > 80,000 lbs)`)

    // Score this truck for this item
    let score = 100

    // Deduct for permits needed
    score -= permits.length * 15

    // Deduct for overkill (using lowboy for small cargo)
    const heightClearance = LEGAL_LIMITS.HEIGHT - totalHeight
    if (heightClearance > 4) score -= 10 // Too much clearance = overkill

    // Bonus for ideal fit
    if (heightClearance >= 0 && heightClearance <= 2) score += 10

    // Bonus for matching loading method
    if (truck.loadingMethod === 'drive-on' &&
        item.description?.toLowerCase().match(/excavator|dozer|loader|tractor|tracked/)) {
      score += 15
    }

    // Prefer legal options
    if (isLegal) score += 20

    if (score > bestScore) {
      bestScore = score
      bestTruck = truck
      bestIsLegal = isLegal
      bestPermits = permits
    }
  }

  return { truck: bestTruck, score: bestScore, isLegal: bestIsLegal, permits: bestPermits }
}

/**
 * Check if two items can share the same truck
 */
function canShareTruck(item1: LoadItem, item2: LoadItem, truck: TruckType): boolean {
  // Combined weight check
  const combinedWeight = item1.weight + item2.weight
  if (combinedWeight > truck.maxCargoWeight) return false

  // Check if items can be placed side by side (width-wise)
  const sideBySideWidth = item1.width + item2.width
  if (sideBySideWidth <= truck.deckWidth) {
    // Can place side by side
    const combinedLength = Math.max(item1.length, item2.length)
    if (combinedLength <= truck.deckLength) return true
  }

  // Check if items can be placed end to end (length-wise)
  const endToEndLength = item1.length + item2.length
  if (endToEndLength <= truck.deckLength) {
    const combinedWidth = Math.max(item1.width, item2.width)
    if (combinedWidth <= truck.deckWidth) return true
  }

  // Check stacking (if both items are stackable)
  if (item1.stackable && item2.stackable) {
    // Smaller item on top of larger
    const baseItem = item1.weight > item2.weight ? item1 : item2
    const topItem = item1.weight > item2.weight ? item2 : item1

    // Top item must fit within base item's footprint
    if (topItem.length <= baseItem.length && topItem.width <= baseItem.width) {
      const stackedHeight = item1.height + item2.height
      if (stackedHeight + truck.deckHeight <= LEGAL_LIMITS.HEIGHT) {
        return true
      }
    }
  }

  return false
}

/**
 * Main load planning function
 * Takes all items and creates an optimal multi-truck plan
 */
export function planLoads(parsedLoad: ParsedLoad): LoadPlan {
  const items = [...parsedLoad.items]
  const loads: PlannedLoad[] = []
  const unassignedItems: LoadItem[] = []
  const warnings: string[] = []

  // Sort items by weight (heaviest first) - greedy approach
  items.sort((a, b) => b.weight - a.weight)

  // Process each item
  for (const item of items) {
    // Find the best truck for this individual item
    const { truck: bestTruck, score, isLegal, permits } = findBestTruckForItem(item)

    // Check if item is too large for any truck
    const fitsAnyTruck = trucks.some(t =>
      item.length <= t.deckLength &&
      item.width <= t.deckWidth &&
      item.weight <= t.maxCargoWeight
    )

    if (!fitsAnyTruck) {
      unassignedItems.push(item)
      warnings.push(`Item "${item.description}" (${item.length}'L x ${item.width}'W x ${item.height}'H, ${item.weight.toLocaleString()} lbs) exceeds all truck capacities`)
      continue
    }

    // Try to add to an existing load
    let added = false
    for (const load of loads) {
      // Check if this item can share the truck with existing items
      const canAdd = load.items.every(existingItem =>
        canShareTruck(existingItem, item, load.recommendedTruck)
      )

      // Also check combined weight
      const newWeight = load.weight + item.weight
      if (canAdd && newWeight <= load.recommendedTruck.maxCargoWeight) {
        // Add item to this load
        load.items.push(item)
        load.weight = newWeight
        load.length = Math.max(load.length, item.length)
        load.width = Math.max(load.width, item.width)
        load.height = Math.max(load.height, item.height)

        // Re-evaluate truck choice if needed
        const { truck: newBestTruck, score: newScore, isLegal: newIsLegal, permits: newPermits } =
          findBestTruckForLoad(load)
        load.recommendedTruck = newBestTruck
        load.truckScore = newScore
        load.isLegal = newIsLegal
        load.permitsRequired = newPermits
        // Recalculate placements with new item
        load.placements = calculatePlacements(load.items, newBestTruck)

        added = true
        break
      }
    }

    // If couldn't add to existing load, create new load
    if (!added) {
      const loadWarnings: string[] = []

      // Generate warnings
      const totalHeight = item.height + bestTruck.deckHeight
      if (totalHeight > LEGAL_LIMITS.HEIGHT) {
        loadWarnings.push(`Total height ${totalHeight.toFixed(1)}' exceeds 13.5' legal limit`)
      }
      if (item.width > LEGAL_LIMITS.WIDTH) {
        loadWarnings.push(`Width ${item.width.toFixed(1)}' exceeds 8.5' legal limit`)
      }
      if (item.width > 12) {
        loadWarnings.push('Width over 12\' requires escort vehicles')
      }

      loads.push({
        id: `load-${loads.length + 1}`,
        items: [item],
        length: item.length,
        width: item.width,
        height: item.height,
        weight: item.weight,
        recommendedTruck: bestTruck,
        truckScore: score,
        placements: calculatePlacements([item], bestTruck),
        permitsRequired: permits,
        warnings: loadWarnings,
        isLegal,
      })
    }
  }

  // Calculate totals
  const totalWeight = loads.reduce((sum, load) => sum + load.weight, 0)
  const totalItems = loads.reduce((sum, load) => sum + load.items.length, 0)

  // Add summary warnings
  if (loads.length > 1) {
    warnings.push(`Load requires ${loads.length} trucks to transport all items`)
  }
  if (unassignedItems.length > 0) {
    warnings.push(`${unassignedItems.length} item(s) could not be assigned - may require specialized transport`)
  }

  return {
    loads,
    totalTrucks: loads.length,
    totalWeight,
    totalItems,
    unassignedItems,
    warnings,
  }
}

/**
 * Find best truck for an entire load (multiple items)
 */
function findBestTruckForLoad(load: PlannedLoad): { truck: TruckType; score: number; isLegal: boolean; permits: string[] } {
  // Use the max dimensions from all items in the load
  const maxLength = Math.max(...load.items.map(i => i.length))
  const maxWidth = Math.max(...load.items.map(i => i.width))
  const maxHeight = Math.max(...load.items.map(i => i.height))
  const totalWeight = load.items.reduce((sum, i) => sum + i.weight, 0)

  // Create a virtual "item" representing the load requirements
  const virtualItem: LoadItem = {
    id: 'virtual',
    description: 'Load',
    quantity: 1,
    length: maxLength,
    width: maxWidth,
    height: maxHeight,
    weight: totalWeight,
    stackable: false,
    fragile: false,
    hazmat: false,
  }

  return findBestTruckForItem(virtualItem)
}

/**
 * Get a simple summary of the load plan
 */
export function getLoadPlanSummary(plan: LoadPlan): string {
  if (plan.loads.length === 0) {
    return 'No loads could be planned'
  }

  const lines: string[] = []
  lines.push(`📦 Load Plan: ${plan.totalTrucks} truck(s) needed`)
  lines.push(`Total Weight: ${plan.totalWeight.toLocaleString()} lbs`)
  lines.push('')

  for (const load of plan.loads) {
    lines.push(`🚛 ${load.id.toUpperCase()}: ${load.recommendedTruck.name}`)
    lines.push(`   Items: ${load.items.map(i => i.description).join(', ')}`)
    lines.push(`   Dimensions: ${load.length.toFixed(1)}'L x ${load.width.toFixed(1)}'W x ${load.height.toFixed(1)}'H`)
    lines.push(`   Weight: ${load.weight.toLocaleString()} lbs`)
    if (load.permitsRequired.length > 0) {
      lines.push(`   ⚠️ Permits: ${load.permitsRequired.join(', ')}`)
    }
    lines.push('')
  }

  if (plan.unassignedItems.length > 0) {
    lines.push('❌ UNASSIGNED ITEMS (require special transport):')
    for (const item of plan.unassignedItems) {
      lines.push(`   - ${item.description}`)
    }
  }

  return lines.join('\n')
}
