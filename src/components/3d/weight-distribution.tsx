'use client'

import type { CargoItem } from './cargo'

/**
 * Axle weight limits (in pounds)
 */
export const AXLE_LIMITS = {
  steer: 12000,      // Front steer axle
  drive: 34000,      // Tractor drive axles (tandem)
  trailer: 34000,    // Trailer axles (tandem)
  grossWeight: 80000, // Total vehicle weight
} as const

/**
 * Typical vehicle weights (in pounds)
 */
export const VEHICLE_WEIGHTS = {
  tractor: 17000,    // Empty tractor weight
  trailer: 12000,    // Empty trailer weight (varies by type)
} as const

/**
 * Axle positions from front of trailer (in feet)
 * These are approximate positions for calculation
 */
export const AXLE_POSITIONS = {
  steer: -25,        // Front of tractor (negative = ahead of trailer)
  drive: -5,         // Rear of tractor / fifth wheel area
  trailer: 35,       // Rear of trailer
} as const

export interface AxleWeight {
  name: string
  weight: number
  limit: number
  percentage: number
  status: 'safe' | 'caution' | 'overloaded'
}

export interface WeightDistribution {
  steerAxle: AxleWeight
  driveAxle: AxleWeight
  trailerAxle: AxleWeight
  totalWeight: number
  grossLimit: number
  grossPercentage: number
  grossStatus: 'safe' | 'caution' | 'overloaded'
  balanceRatio: number // 0.5 = perfectly balanced, <0.5 = front heavy, >0.5 = rear heavy
}

/**
 * Calculate weight distribution across axles based on cargo positions
 * Uses moment calculations (weight * distance from reference point)
 */
export function calculateWeightDistribution(
  cargo: CargoItem[],
  trailerLength: number = 48,
  tractorWeight: number = VEHICLE_WEIGHTS.tractor,
  trailerWeight: number = VEHICLE_WEIGHTS.trailer
): WeightDistribution {
  // Reference point: fifth wheel (kingpin) - where trailer connects to tractor
  const kingpinPosition = 0

  // Calculate total cargo weight and center of gravity
  let totalCargoWeight = 0
  let totalMoment = 0

  cargo.forEach((item) => {
    const cargoPosition = item.position?.[0] || 0 // x position on trailer
    totalCargoWeight += item.weight
    totalMoment += item.weight * cargoPosition
  })

  // Calculate cargo center of gravity position from kingpin
  const cargoCG = totalCargoWeight > 0 ? totalMoment / totalCargoWeight : 0

  // Total weight on trailer (cargo + trailer structure)
  const totalTrailerLoad = totalCargoWeight + trailerWeight

  // Distance from kingpin to trailer axles (approximately 70% back from kingpin)
  const kingpinToTrailerAxle = trailerLength * 0.7

  // Weight distribution calculation using moment balance
  // Moment about trailer axle = 0 for equilibrium
  // Weight on fifth wheel (goes to tractor) = Total trailer load * (distance from CG to trailer axle) / (distance from kingpin to trailer axle)

  const cargoDistToTrailerAxle = kingpinToTrailerAxle - cargoCG
  const trailerWeightCG = kingpinToTrailerAxle * 0.4 // Trailer weight CG approximately 40% back
  const trailerDistToTrailerAxle = kingpinToTrailerAxle - trailerWeightCG

  // Calculate weight transferred to fifth wheel (tractor)
  const cargoOnFifthWheel = totalCargoWeight > 0
    ? (totalCargoWeight * cargoDistToTrailerAxle) / kingpinToTrailerAxle
    : 0
  const trailerWeightOnFifthWheel = (trailerWeight * trailerDistToTrailerAxle) / kingpinToTrailerAxle

  const fifthWheelLoad = cargoOnFifthWheel + trailerWeightOnFifthWheel

  // Weight remaining on trailer axles
  const trailerAxleLoad = totalTrailerLoad - fifthWheelLoad

  // Now distribute tractor weight + fifth wheel load between steer and drive axles
  // Typical tractor wheelbase considerations
  const tractorWheelbase = 20 // feet from steer to drive
  const fifthWheelToDriver = 5 // feet from fifth wheel to drive axle

  // Total load on tractor = tractor weight + fifth wheel load
  const totalTractorLoad = tractorWeight + fifthWheelLoad

  // Steer axle load (moment balance)
  const steerAxleLoad = (tractorWeight * 0.35) + (fifthWheelLoad * fifthWheelToDriver / tractorWheelbase)

  // Drive axle load
  const driveAxleLoad = totalTractorLoad - steerAxleLoad

  // Calculate total gross weight
  const totalGrossWeight = tractorWeight + totalTrailerLoad

  // Helper to determine status
  const getStatus = (weight: number, limit: number): 'safe' | 'caution' | 'overloaded' => {
    const percentage = (weight / limit) * 100
    if (percentage >= 100) return 'overloaded'
    if (percentage >= 90) return 'caution'
    return 'safe'
  }

  // Calculate balance ratio (where is the weight center - 0.5 = middle)
  const totalAxleWeight = steerAxleLoad + driveAxleLoad + trailerAxleLoad
  const balanceRatio = totalAxleWeight > 0
    ? (driveAxleLoad + trailerAxleLoad) / totalAxleWeight
    : 0.5

  return {
    steerAxle: {
      name: 'Steer Axle',
      weight: Math.round(steerAxleLoad),
      limit: AXLE_LIMITS.steer,
      percentage: Math.round((steerAxleLoad / AXLE_LIMITS.steer) * 100),
      status: getStatus(steerAxleLoad, AXLE_LIMITS.steer),
    },
    driveAxle: {
      name: 'Drive Axles',
      weight: Math.round(driveAxleLoad),
      limit: AXLE_LIMITS.drive,
      percentage: Math.round((driveAxleLoad / AXLE_LIMITS.drive) * 100),
      status: getStatus(driveAxleLoad, AXLE_LIMITS.drive),
    },
    trailerAxle: {
      name: 'Trailer Axles',
      weight: Math.round(trailerAxleLoad),
      limit: AXLE_LIMITS.trailer,
      percentage: Math.round((trailerAxleLoad / AXLE_LIMITS.trailer) * 100),
      status: getStatus(trailerAxleLoad, AXLE_LIMITS.trailer),
    },
    totalWeight: Math.round(totalGrossWeight),
    grossLimit: AXLE_LIMITS.grossWeight,
    grossPercentage: Math.round((totalGrossWeight / AXLE_LIMITS.grossWeight) * 100),
    grossStatus: getStatus(totalGrossWeight, AXLE_LIMITS.grossWeight),
    balanceRatio: Math.round(balanceRatio * 100) / 100,
  }
}

/**
 * Get color for status
 */
export function getStatusColor(status: 'safe' | 'caution' | 'overloaded'): string {
  switch (status) {
    case 'safe':
      return '#22c55e' // green
    case 'caution':
      return '#f59e0b' // amber
    case 'overloaded':
      return '#ef4444' // red
  }
}

/**
 * Get background color for status
 */
export function getStatusBgColor(status: 'safe' | 'caution' | 'overloaded'): string {
  switch (status) {
    case 'safe':
      return 'bg-green-500/10 border-green-500/30'
    case 'caution':
      return 'bg-amber-500/10 border-amber-500/30'
    case 'overloaded':
      return 'bg-red-500/10 border-red-500/30'
  }
}

/**
 * Get text color for status
 */
export function getStatusTextColor(status: 'safe' | 'caution' | 'overloaded'): string {
  switch (status) {
    case 'safe':
      return 'text-green-600'
    case 'caution':
      return 'text-amber-600'
    case 'overloaded':
      return 'text-red-600'
  }
}
