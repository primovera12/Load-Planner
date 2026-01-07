/**
 * Email Parser for Load Planner
 *
 * Mock implementation using pattern matching.
 * Ready to be swapped with Vercel AI SDK + Gemini for production.
 */

import { ParsedLoad, LoadItem } from '@/types'
import { parseDimension, parseWeight } from './unit-converter'

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Extract dimensions from text - simplified and robust approach
 */
function extractDimensions(text: string): {
  length: number | null
  width: number | null
  height: number | null
} {
  // First, look for "L x W x H" pattern on a single line
  const lines = text.split('\n')

  for (const line of lines) {
    // Look for dimension line: "32' x 10' x 10'6"" or "Dimensions: 32 x 10 x 10.5"
    if (line.match(/\d+.*x.*\d+.*x.*\d+/i)) {
      // Split by 'x' and extract each dimension
      const parts = line.split(/\s*x\s*/i)
      if (parts.length >= 3) {
        // Extract numbers with units from each part
        const extractDim = (part: string): number | null => {
          // Match patterns like "32'", "32'6"", "32 ft", "10.5", "3.2m"
          const match = part.match(/(\d+(?:\.\d+)?)\s*[\'']?\s*(\d+)?\s*[\""]?\s*(ft|feet|m|meters?|cm)?/i)
          if (match) {
            const mainNum = parseFloat(match[1])
            const inchNum = match[2] ? parseFloat(match[2]) : 0
            const unit = match[3]?.toLowerCase()

            if (unit === 'm' || unit === 'meters' || unit === 'meter') {
              return mainNum * 3.28084
            } else if (unit === 'cm') {
              return mainNum * 0.0328084
            } else {
              // Assume feet (with optional inches)
              return mainNum + (inchNum / 12)
            }
          }
          return null
        }

        const length = extractDim(parts[0])
        const width = extractDim(parts[1])
        const height = extractDim(parts[2])

        if (length !== null && width !== null && height !== null) {
          return { length, width, height }
        }
      }
    }
  }

  // Fallback: Look for individually labeled dimensions
  let length: number | null = null
  let width: number | null = null
  let height: number | null = null

  // Length patterns
  const lengthMatch = text.match(/(?:length|long)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*[\'']?\s*(\d+)?\s*[\""]?\s*(ft|feet|m|cm)?/i)
  if (lengthMatch) {
    const mainNum = parseFloat(lengthMatch[1])
    const inchNum = lengthMatch[2] ? parseFloat(lengthMatch[2]) : 0
    length = mainNum + (inchNum / 12)
  }

  // Width patterns
  const widthMatch = text.match(/(?:width|wide)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*[\'']?\s*(\d+)?\s*[\""]?\s*(ft|feet|m|cm)?/i)
  if (widthMatch) {
    const mainNum = parseFloat(widthMatch[1])
    const inchNum = widthMatch[2] ? parseFloat(widthMatch[2]) : 0
    width = mainNum + (inchNum / 12)
  }

  // Height patterns
  const heightMatch = text.match(/(?:height|high|tall)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*[\'']?\s*(\d+)?\s*[\""]?\s*(ft|feet|m|cm)?/i)
  if (heightMatch) {
    const mainNum = parseFloat(heightMatch[1])
    const inchNum = heightMatch[2] ? parseFloat(heightMatch[2]) : 0
    height = mainNum + (inchNum / 12)
  }

  return { length, width, height }
}

/**
 * Extract weight from text
 */
function extractWeight(text: string): number | null {
  const normalizedText = text.replace(/,/g, '')

  // Weight patterns
  const patterns = [
    /(?:weight|wt)\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(k)?\s*(lbs?|pounds?|tons?|kg)?/i,
    /(\d+(?:\.\d+)?)\s*(k)?\s*(lbs?|pounds?)/i,
    /(\d+(?:\.\d+)?)\s*(tons?|mt)/i,
  ]

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern)
    if (match) {
      let value = parseFloat(match[1])
      const hasK = match[2]?.toLowerCase() === 'k'
      const unit = match[3]?.toLowerCase() || ''

      if (hasK) value *= 1000

      if (unit.includes('ton') || unit === 'mt') {
        value *= 2000
      } else if (unit === 'kg') {
        value *= 2.20462
      }

      return value
    }
  }

  return null
}

/**
 * Extract locations (origin/destination) from text
 */
function extractLocations(text: string): {
  origin: string | null
  destination: string | null
} {
  let origin: string | null = null
  let destination: string | null = null

  const lines = text.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Origin patterns - match "From: Houston, TX" or "Pickup: Houston, TX"
    if (!origin) {
      const originMatch = trimmedLine.match(
        /^(?:from|origin|pickup|pick[\s-]?up)\s*[:\-]\s*(.+)$/i
      )
      if (originMatch) {
        origin = originMatch[1].trim().replace(/[,.]$/, '')
      }
    }

    // Destination patterns - match "To: Dallas, TX" or "Delivery: Dallas, TX"
    if (!destination) {
      const destMatch = trimmedLine.match(
        /^(?:to|destination|delivery|deliver[\s-]?to)\s*[:\-]\s*(.+)$/i
      )
      if (destMatch) {
        destination = destMatch[1].trim().replace(/[,.]$/, '')
      }
    }
  }

  return { origin, destination }
}

/**
 * Extract description/item name from text
 */
function extractDescription(text: string): string | null {
  const lines = text.split('\n')

  // Look for subject line
  for (const line of lines) {
    if (line.toLowerCase().includes('subject:')) {
      const subject = line.replace(/subject:\s*/i, '').trim()
      if (subject.length > 0) return subject
    }
  }

  // Look for equipment/cargo description
  for (const line of lines) {
    const match = line.match(/(?:equipment|cargo|item|machine|unit)\s*[:\-]\s*(.+)/i)
    if (match) {
      return match[1].trim()
    }
  }

  // First meaningful line (not a label)
  for (const line of lines) {
    const trimmed = line.trim()
    if (
      trimmed.length > 3 &&
      trimmed.length < 80 &&
      !trimmed.match(/^(?:from|to|weight|dimension|height|width|length|subject|hi|hello|please|thanks|we need|quote)/i) &&
      !trimmed.match(/^\d+\s*[\'\"x]/) &&
      !trimmed.match(/^\d+.*lbs/i)
    ) {
      return trimmed.replace(/[,.]$/, '')
    }
  }

  return null
}

/**
 * Calculate confidence score
 */
function calculateConfidence(parsedLoad: ParsedLoad): number {
  let score = 0

  if (parsedLoad.length && parsedLoad.length > 0) score += 15
  if (parsedLoad.width && parsedLoad.width > 0) score += 15
  if (parsedLoad.height && parsedLoad.height > 0) score += 10
  if (parsedLoad.weight && parsedLoad.weight > 0) score += 25
  if (parsedLoad.origin) score += 10
  if (parsedLoad.destination) score += 10
  if (parsedLoad.description) score += 10
  if (parsedLoad.pickupDate || parsedLoad.deliveryDate) score += 5

  return Math.min(score, 100)
}

/**
 * Parse an email/text and extract load information
 */
export async function parseEmail(emailText: string): Promise<ParsedLoad> {
  const dimensions = extractDimensions(emailText)
  const weight = extractWeight(emailText)
  const locations = extractLocations(emailText)
  const description = extractDescription(emailText)

  const primaryItem: LoadItem = {
    id: generateId(),
    description: description || 'Cargo',
    quantity: 1,
    length: dimensions.length || 0,
    width: dimensions.width || 0,
    height: dimensions.height || 0,
    weight: weight || 0,
  }

  const parsedLoad: ParsedLoad = {
    length: dimensions.length || 0,
    width: dimensions.width || 0,
    height: dimensions.height || 0,
    weight: weight || 0,
    origin: locations.origin || undefined,
    destination: locations.destination || undefined,
    items: [primaryItem],
    description: description || undefined,
    confidence: 0,
    rawFields: {
      extractedLength: dimensions.length?.toString() || '',
      extractedWidth: dimensions.width?.toString() || '',
      extractedHeight: dimensions.height?.toString() || '',
      extractedWeight: weight?.toString() || '',
      extractedOrigin: locations.origin || '',
      extractedDestination: locations.destination || '',
    },
  }

  parsedLoad.confidence = calculateConfidence(parsedLoad)

  return parsedLoad
}

/**
 * Validate parsed load has minimum required fields
 */
export function validateParsedLoad(load: ParsedLoad): {
  valid: boolean
  missingFields: string[]
} {
  const missingFields: string[] = []

  if (!load.length || load.length <= 0) missingFields.push('length')
  if (!load.width || load.width <= 0) missingFields.push('width')
  if (!load.height || load.height <= 0) missingFields.push('height')
  if (!load.weight || load.weight <= 0) missingFields.push('weight')

  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}
