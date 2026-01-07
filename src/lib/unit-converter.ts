/**
 * Unit Converter for Load Planner
 * Handles various dimension and weight formats from freight emails
 *
 * Supported formats:
 * - Dimensions: 10'6", 10-6, 10.5', 10.5 ft, 3.2m, 320cm, 120 inches
 * - Weights: 45,000 lbs, 45000 pounds, 22.5 tons, 20 MT, 45K
 */

// Conversion constants
const INCHES_PER_FOOT = 12
const FEET_PER_METER = 3.28084
const CM_PER_METER = 100
const LBS_PER_TON = 2000 // US short ton
const LBS_PER_METRIC_TON = 2204.62

/**
 * Parse a dimension string and return value in FEET
 */
export function parseDimension(input: string): number | null {
  if (!input || typeof input !== 'string') return null

  const normalized = input.trim().toLowerCase()

  // Handle feet and inches: 10'6", 10' 6", 10-6, 10ft 6in
  const feetInchesMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:'|ft|feet)?\s*[-\s]?\s*(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)?/
  )
  if (feetInchesMatch) {
    const feet = parseFloat(feetInchesMatch[1])
    const inches = parseFloat(feetInchesMatch[2])
    return feet + inches / INCHES_PER_FOOT
  }

  // Handle feet only: 10', 10 ft, 10.5 feet
  const feetMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:'|ft|feet)/)
  if (feetMatch) {
    return parseFloat(feetMatch[1])
  }

  // Handle inches only: 120", 120 in, 120 inches
  const inchesMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)/)
  if (inchesMatch) {
    return parseFloat(inchesMatch[1]) / INCHES_PER_FOOT
  }

  // Handle meters: 3.2m, 3.2 meters
  const metersMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m|meters?)(?!\w)/)
  if (metersMatch) {
    return parseFloat(metersMatch[1]) * FEET_PER_METER
  }

  // Handle centimeters: 320cm, 320 centimeters
  const cmMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)/)
  if (cmMatch) {
    return (parseFloat(cmMatch[1]) / CM_PER_METER) * FEET_PER_METER
  }

  // Handle plain number (assume feet)
  const plainNumber = normalized.match(/^(\d+(?:\.\d+)?)$/)
  if (plainNumber) {
    return parseFloat(plainNumber[1])
  }

  return null
}

/**
 * Parse a weight string and return value in POUNDS
 */
export function parseWeight(input: string): number | null {
  if (!input || typeof input !== 'string') return null

  const normalized = input.trim().toLowerCase().replace(/,/g, '')

  // Handle K notation: 45K, 45k lbs
  const kMatch = normalized.match(/(\d+(?:\.\d+)?)\s*k(?:\s*(?:lbs?|pounds?))?/)
  if (kMatch) {
    return parseFloat(kMatch[1]) * 1000
  }

  // Handle metric tons: 20 MT, 20 metric tons
  const metricTonMatch = normalized.match(
    /(\d+(?:\.\d+)?)\s*(?:mt|metric\s*tons?)/
  )
  if (metricTonMatch) {
    return parseFloat(metricTonMatch[1]) * LBS_PER_METRIC_TON
  }

  // Handle US tons: 22.5 tons, 22.5 ton
  const tonMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:tons?|t)(?!\w)/)
  if (tonMatch) {
    return parseFloat(tonMatch[1]) * LBS_PER_TON
  }

  // Handle pounds: 45000 lbs, 45000 pounds, 45000 lb
  const lbsMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/)
  if (lbsMatch) {
    return parseFloat(lbsMatch[1])
  }

  // Handle kilograms: 20000 kg, 20000 kilograms
  const kgMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)/)
  if (kgMatch) {
    return parseFloat(kgMatch[1]) * 2.20462
  }

  // Handle plain number (assume pounds if > 100, otherwise tons)
  const plainNumber = normalized.match(/^(\d+(?:\.\d+)?)$/)
  if (plainNumber) {
    const value = parseFloat(plainNumber[1])
    // If it's a small number, likely tons
    return value < 100 ? value * LBS_PER_TON : value
  }

  return null
}

/**
 * Format dimension in feet to readable string
 */
export function formatDimension(feet: number): string {
  const wholeFeet = Math.floor(feet)
  const inches = Math.round((feet - wholeFeet) * INCHES_PER_FOOT)

  if (inches === 0) {
    return `${wholeFeet}'`
  } else if (inches === 12) {
    return `${wholeFeet + 1}'`
  }
  return `${wholeFeet}'${inches}"`
}

/**
 * Format weight in pounds to readable string
 */
export function formatWeight(lbs: number): string {
  if (lbs >= 1000) {
    return `${(lbs / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K lbs`
  }
  return `${lbs.toLocaleString()} lbs`
}

/**
 * Convert feet to meters
 */
export function feetToMeters(feet: number): number {
  return feet / FEET_PER_METER
}

/**
 * Convert pounds to metric tons
 */
export function lbsToMetricTons(lbs: number): number {
  return lbs / LBS_PER_METRIC_TON
}

/**
 * Parse dimensions from various formats in an object
 * Returns { length, width, height } in feet
 */
export interface Dimensions {
  length: number | null
  width: number | null
  height: number | null
}

export function parseDimensions(
  length: string | number,
  width: string | number,
  height: string | number
): Dimensions {
  return {
    length: typeof length === 'number' ? length : parseDimension(length),
    width: typeof width === 'number' ? width : parseDimension(width),
    height: typeof height === 'number' ? height : parseDimension(height),
  }
}
