/**
 * Rate Estimates
 *
 * Calculate trucking rates based on distance, cargo dimensions, and market conditions
 * Uses industry standard formulas as an alternative to DAT load board data
 */

import { RateEstimate, CostEstimate, StatePermitInfo, FuelPrice } from '@/types/route-planning'

// Base rates by equipment type (per mile)
const BASE_RATES: Record<string, number> = {
  flatbed: 2.75,
  stepdeck: 2.85,
  lowboy: 3.50,
  rgn: 4.00,
  van: 2.25,
  reefer: 2.65,
}

// Regional rate adjustments (multiplier)
const REGIONAL_ADJUSTMENTS: Record<string, number> = {
  // Higher rates in dense/congested areas
  CA: 1.15,
  NY: 1.12,
  NJ: 1.10,
  MA: 1.08,
  WA: 1.05,
  OR: 1.05,
  // Lower rates in central/rural areas
  TX: 0.95,
  OK: 0.92,
  KS: 0.90,
  NE: 0.90,
  SD: 0.88,
  ND: 0.88,
  MT: 0.92,
  WY: 0.92,
}

// Legal dimensions (feet)
const LEGAL_DIMENSIONS = {
  width: 8.5,
  height: 13.5,
  length: 53,
  weight: 80000, // lbs
}

// Surcharges
const SURCHARGES = {
  oversizeWidthPerFoot: 0.35, // Per mile per foot over legal
  oversizeHeightPerFoot: 0.30,
  oversizeLengthPerFoot: 0.25,
  overweightPer1000lbs: 0.15, // Per mile per 1000 lbs over 80k
  fuelSurchargeThreshold: 3.50, // Diesel price threshold
  fuelSurchargeRate: 0.08, // Per $0.10 over threshold
  hazmatSurcharge: 0.45, // Flat per mile
  expeditedSurcharge: 0.50, // Per mile for time-critical
}

// Minimum charges
const MINIMUMS = {
  shortHaulMinimum: 500, // Minimum for trips under 100 miles
  minimumRatePerMile: 3.50, // Absolute minimum rate
}

interface CargoSpecs {
  width: number // feet
  height: number // feet
  length: number // feet
  grossWeight: number // lbs
  isHazmat?: boolean
  isExpedited?: boolean
}

interface RateOptions {
  equipmentType?: string
  originState?: string
  destState?: string
  currentDieselPrice?: number
}

/**
 * Calculate rate per mile based on cargo and route
 */
export function calculateRatePerMile(
  cargo: CargoSpecs,
  options: RateOptions = {}
): {
  baseRate: number
  oversizeSurcharge: number
  overweightSurcharge: number
  fuelSurcharge: number
  hazmatSurcharge: number
  expeditedSurcharge: number
  totalRate: number
} {
  const {
    equipmentType = 'flatbed',
    originState,
    destState,
    currentDieselPrice = 4.00,
  } = options

  // Base rate for equipment type
  let baseRate = BASE_RATES[equipmentType] || BASE_RATES.flatbed

  // Apply regional adjustment (average of origin and dest)
  const originAdj = REGIONAL_ADJUSTMENTS[originState || ''] || 1.0
  const destAdj = REGIONAL_ADJUSTMENTS[destState || ''] || 1.0
  const regionalAdj = (originAdj + destAdj) / 2
  baseRate *= regionalAdj

  // Oversize surcharges
  let oversizeSurcharge = 0
  const widthOver = Math.max(0, cargo.width - LEGAL_DIMENSIONS.width)
  const heightOver = Math.max(0, cargo.height - LEGAL_DIMENSIONS.height)
  const lengthOver = Math.max(0, cargo.length - LEGAL_DIMENSIONS.length)

  oversizeSurcharge += widthOver * SURCHARGES.oversizeWidthPerFoot
  oversizeSurcharge += heightOver * SURCHARGES.oversizeHeightPerFoot
  oversizeSurcharge += lengthOver * SURCHARGES.oversizeLengthPerFoot

  // Overweight surcharge
  let overweightSurcharge = 0
  const weightOver = Math.max(0, cargo.grossWeight - LEGAL_DIMENSIONS.weight)
  if (weightOver > 0) {
    overweightSurcharge =
      Math.ceil(weightOver / 1000) * SURCHARGES.overweightPer1000lbs
  }

  // Fuel surcharge
  let fuelSurcharge = 0
  if (currentDieselPrice > SURCHARGES.fuelSurchargeThreshold) {
    const overThreshold = currentDieselPrice - SURCHARGES.fuelSurchargeThreshold
    fuelSurcharge = Math.ceil(overThreshold / 0.1) * SURCHARGES.fuelSurchargeRate
  }

  // Special surcharges
  const hazmatSurcharge = cargo.isHazmat ? SURCHARGES.hazmatSurcharge : 0
  const expeditedSurcharge = cargo.isExpedited ? SURCHARGES.expeditedSurcharge : 0

  // Total rate
  const totalRate =
    baseRate +
    oversizeSurcharge +
    overweightSurcharge +
    fuelSurcharge +
    hazmatSurcharge +
    expeditedSurcharge

  return {
    baseRate: Math.round(baseRate * 100) / 100,
    oversizeSurcharge: Math.round(oversizeSurcharge * 100) / 100,
    overweightSurcharge: Math.round(overweightSurcharge * 100) / 100,
    fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
    hazmatSurcharge: Math.round(hazmatSurcharge * 100) / 100,
    expeditedSurcharge: Math.round(expeditedSurcharge * 100) / 100,
    totalRate: Math.round(totalRate * 100) / 100,
  }
}

/**
 * Calculate full rate estimate for a load
 */
export function calculateRateEstimate(
  distanceMiles: number,
  cargo: CargoSpecs,
  options: RateOptions = {}
): RateEstimate {
  const rates = calculateRatePerMile(cargo, options)

  // Apply minimum rate
  const effectiveRate = Math.max(rates.totalRate, MINIMUMS.minimumRatePerMile)

  // Calculate totals
  let totalRate = effectiveRate * distanceMiles

  // Apply short haul minimum
  if (distanceMiles < 100) {
    totalRate = Math.max(totalRate, MINIMUMS.shortHaulMinimum)
  }

  // Determine confidence based on data availability
  let confidence: 'high' | 'medium' | 'low' = 'medium'
  if (options.originState && options.destState && options.currentDieselPrice) {
    confidence = 'high'
  }
  if (!options.currentDieselPrice) {
    confidence = 'low'
  }

  return {
    baseRatePerMile: rates.baseRate,
    oversizeSurcharge: rates.oversizeSurcharge,
    overweightSurcharge: rates.overweightSurcharge,
    fuelSurcharge: rates.fuelSurcharge,
    totalRatePerMile: effectiveRate,
    totalRate: Math.round(totalRate * 100) / 100,
    distance: distanceMiles,
    confidence,
    breakdown: {
      lineHaul: Math.round(rates.baseRate * distanceMiles * 100) / 100,
      fuelSurcharge: Math.round(rates.fuelSurcharge * distanceMiles * 100) / 100,
      oversizeFees: Math.round(rates.oversizeSurcharge * distanceMiles * 100) / 100,
      overweightFees: Math.round(rates.overweightSurcharge * distanceMiles * 100) / 100,
    },
  }
}

/**
 * Calculate complete cost estimate including fuel, permits, and rate
 */
export function calculateCompleteCostEstimate(
  distanceMiles: number,
  cargo: CargoSpecs,
  fuelPrices: FuelPrice[],
  permitInfo: StatePermitInfo[],
  options: RateOptions = {}
): CostEstimate {
  // Get average diesel price
  const avgDieselPrice =
    fuelPrices.length > 0
      ? fuelPrices.reduce((sum, fp) => sum + fp.dieselPrice, 0) / fuelPrices.length
      : 4.0

  // Calculate fuel cost
  const mpg = cargo.grossWeight > 80000 ? 5 : 6 // Lower MPG for heavy loads
  const totalGallons = distanceMiles / mpg
  const fuelCost = totalGallons * avgDieselPrice

  // Calculate rate estimate
  const rate = calculateRateEstimate(distanceMiles, cargo, {
    ...options,
    currentDieselPrice: avgDieselPrice,
  })

  // Sum permit and escort costs
  const totalPermitFees = permitInfo.reduce((sum, p) => sum + p.permitFee, 0)
  const totalEscortCost = permitInfo.reduce((sum, p) => sum + p.escortCost, 0)

  // Estimate tolls (rough estimate based on states)
  const tollStates = ['NY', 'NJ', 'PA', 'OH', 'IL', 'IN', 'FL', 'TX', 'CA']
  const statesWithTolls = permitInfo.filter((p) => tollStates.includes(p.stateCode))
  const estimatedTolls = statesWithTolls.reduce((sum, p) => {
    // Rough toll estimate: $0.10 per mile in toll states
    return sum + p.distanceInState * 0.1
  }, 0)

  // Calculate total
  const total =
    rate.totalRate + fuelCost + totalPermitFees + totalEscortCost + estimatedTolls

  return {
    fuel: {
      totalGallons: Math.round(totalGallons * 10) / 10,
      averagePrice: Math.round(avgDieselPrice * 100) / 100,
      totalCost: Math.round(fuelCost * 100) / 100,
    },
    permits: {
      states: permitInfo,
      totalPermitFees: Math.round(totalPermitFees * 100) / 100,
      totalEscortCost: Math.round(totalEscortCost * 100) / 100,
    },
    rate,
    tolls: {
      estimated: Math.round(estimatedTolls * 100) / 100,
      byState: statesWithTolls.map((p) => ({
        state: p.stateCode,
        amount: Math.round(p.distanceInState * 0.1 * 100) / 100,
      })),
    },
    total: Math.round(total * 100) / 100,
    breakdown: {
      lineHaul: rate.breakdown.lineHaul,
      fuel: Math.round(fuelCost * 100) / 100,
      permits: Math.round(totalPermitFees * 100) / 100,
      escorts: Math.round(totalEscortCost * 100) / 100,
      tolls: Math.round(estimatedTolls * 100) / 100,
      other: 0,
    },
  }
}

/**
 * Get equipment type recommendation based on cargo
 */
export function recommendEquipmentType(cargo: CargoSpecs): string {
  // Height determines if lowboy/RGN needed
  if (cargo.height > 11) {
    if (cargo.grossWeight > 80000 || cargo.length > 48) {
      return 'rgn'
    }
    return 'lowboy'
  }

  // Long loads need stepdeck for better height clearance
  if (cargo.length > 48 && cargo.height > 8.5) {
    return 'stepdeck'
  }

  // Standard flatbed for most loads
  return 'flatbed'
}

export default calculateCompleteCostEstimate
