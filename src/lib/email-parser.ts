/**
 * Email Parser for Load Planner
 *
 * Enhanced pattern matching for various freight email formats.
 * Ready to be swapped with Vercel AI SDK + Gemini for production.
 */

import { ParsedLoad, LoadItem } from '@/types'

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Parse a single dimension value from string
 */
function parseSingleDimension(str: string): number | null {
  if (!str) return null
  const s = str.trim().toLowerCase()

  // Handle feet-inches: 10'6", 10' 6", 10-6
  const feetInches = s.match(/(\d+)\s*[\''\-]\s*(\d+)\s*[\""]?/)
  if (feetInches) {
    return parseFloat(feetInches[1]) + parseFloat(feetInches[2]) / 12
  }

  // Handle feet only: 10', 10 ft, 10feet
  const feetOnly = s.match(/(\d+(?:\.\d+)?)\s*(?:[\'']|ft|feet)/)
  if (feetOnly) {
    return parseFloat(feetOnly[1])
  }

  // Handle meters: 3.2m, 3.2 meters
  const meters = s.match(/(\d+(?:\.\d+)?)\s*(?:m|meters?)(?!\w)/i)
  if (meters) {
    return parseFloat(meters[1]) * 3.28084
  }

  // Handle centimeters: 320cm
  const cm = s.match(/(\d+(?:\.\d+)?)\s*(?:cm|centimeters?)/)
  if (cm) {
    return parseFloat(cm[1]) * 0.0328084
  }

  // Handle inches: 120", 120 in
  const inches = s.match(/(\d+(?:\.\d+)?)\s*(?:[\""]|in|inches?)/)
  if (inches) {
    return parseFloat(inches[1]) / 12
  }

  // Plain number (assume feet)
  const plain = s.match(/^(\d+(?:\.\d+)?)$/)
  if (plain) {
    return parseFloat(plain[1])
  }

  return null
}

/**
 * Extract dimensions from text
 */
function extractDimensions(text: string): {
  length: number | null
  width: number | null
  height: number | null
} {
  const lines = text.split('\n')

  // Pattern 1: "L x W x H" on single line
  for (const line of lines) {
    // Match patterns like "32' x 10' x 10'6"" or "32x10x10.5"
    const lwhMatch = line.match(
      /(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?(?:\s*[\""])?(?:\s*(?:ft|feet|m|cm))?)\s*[x×]\s*(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?(?:\s*[\""])?(?:\s*(?:ft|feet|m|cm))?)\s*[x×]\s*(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?(?:\s*[\""])?(?:\s*(?:ft|feet|m|cm))?)/i
    )
    if (lwhMatch) {
      const l = parseSingleDimension(lwhMatch[1])
      const w = parseSingleDimension(lwhMatch[2])
      const h = parseSingleDimension(lwhMatch[3])
      if (l !== null && w !== null && h !== null) {
        return { length: l, width: w, height: h }
      }
    }
  }

  // Pattern 2: Labeled dimensions (Length: X, Width: Y, Height: Z)
  let length: number | null = null
  let width: number | null = null
  let height: number | null = null

  // Length
  const lengthPatterns = [
    /length\s*[:\-=]?\s*(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?(?:\s*[\""])?(?:\s*(?:ft|feet|m|cm))?)/i,
    /(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?)\s*(?:long|length|l\b)/i,
    /-\s*(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?(?:\s*[\""])?)\s*(?:ft|feet|')?\s*[lL]\b/,
  ]
  for (const pattern of lengthPatterns) {
    const match = text.match(pattern)
    if (match) {
      length = parseSingleDimension(match[1])
      if (length !== null) break
    }
  }

  // Width
  const widthPatterns = [
    /width\s*[:\-=]?\s*(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?(?:\s*[\""])?(?:\s*(?:ft|feet|m|cm))?)/i,
    /(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?)\s*(?:wide|width|w\b)/i,
    /-\s*(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?(?:\s*[\""])?)\s*(?:ft|feet|')?\s*[wW]\b/,
  ]
  for (const pattern of widthPatterns) {
    const match = text.match(pattern)
    if (match) {
      width = parseSingleDimension(match[1])
      if (width !== null) break
    }
  }

  // Height
  const heightPatterns = [
    /height\s*[:\-=]?\s*(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?(?:\s*[\""])?(?:\s*(?:ft|feet|m|cm))?)/i,
    /(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?)\s*(?:high|height|tall|h\b)/i,
    /-\s*(\d+(?:\.\d+)?(?:\s*[\''\-]\s*\d+)?(?:\s*[\""])?)\s*(?:ft|feet|')?\s*[hH]\b/,
  ]
  for (const pattern of heightPatterns) {
    const match = text.match(pattern)
    if (match) {
      height = parseSingleDimension(match[1])
      if (height !== null) break
    }
  }

  return { length, width, height }
}

/**
 * Extract weight from text
 */
function extractWeight(text: string): number | null {
  const normalizedText = text.replace(/,/g, '')

  const patterns = [
    // Weight: 52,000 lbs or weight: 52000 pounds
    { regex: /weight\s*[:\-=]?\s*(\d+(?:\.\d+)?)\s*(k)?\s*(lbs?|pounds?)?/i, unit: 'lbs' },
    // 52,000 lbs or 52000 pounds
    { regex: /(\d+(?:\.\d+)?)\s*(k)?\s*(lbs?|pounds?)/i, unit: 'lbs' },
    // 26 tons or 26 ton
    { regex: /(\d+(?:\.\d+)?)\s*(tons?)\b/i, unit: 'tons' },
    // 20 MT or 20 metric tons
    { regex: /(\d+(?:\.\d+)?)\s*(mt|metric\s*tons?)/i, unit: 'mt' },
    // 20000 kg
    { regex: /(\d+(?:\.\d+)?)\s*(kg|kilograms?)/i, unit: 'kg' },
  ]

  for (const { regex, unit } of patterns) {
    const match = normalizedText.match(regex)
    if (match) {
      let value = parseFloat(match[1])

      // Handle K notation (52K = 52000)
      if (match[2]?.toLowerCase() === 'k') {
        value *= 1000
      }

      // Convert to pounds
      if (unit === 'tons' || match[2]?.toLowerCase() === 'tons') {
        value *= 2000
      } else if (unit === 'mt' || match[2]?.toLowerCase()?.includes('mt')) {
        value *= 2204.62
      } else if (unit === 'kg' || match[2]?.toLowerCase() === 'kg') {
        value *= 2.20462
      }

      return value
    }
  }

  return null
}

/**
 * Extract locations from text
 */
function extractLocations(text: string): {
  origin: string | null
  destination: string | null
} {
  let origin: string | null = null
  let destination: string | null = null

  const lines = text.split('\n')

  // US state abbreviations for pattern matching
  const statePattern = /[A-Z]{2}/

  for (const line of lines) {
    const trimmed = line.trim()

    // Origin patterns
    if (!origin) {
      // "From: Houston, TX" or "Pickup: Houston TX 77001"
      const originMatch = trimmed.match(
        /^(?:from|origin|pickup|pick[\s-]?up|ship(?:ping)?\s*from)\s*[:\-]?\s*(.+)/i
      )
      if (originMatch) {
        origin = originMatch[1].trim().replace(/[,.]$/, '')
      }
    }

    // Destination patterns
    if (!destination) {
      // "To: Dallas, TX" or "Delivery: Dallas TX"
      const destMatch = trimmed.match(
        /^(?:to|destination|delivery|deliver[\s-]?to|ship(?:ping)?\s*to)\s*[:\-]?\s*(.+)/i
      )
      if (destMatch) {
        destination = destMatch[1].trim().replace(/[,.]$/, '')
      }
    }
  }

  // Fallback: Try inline pattern "from X to Y"
  if (!origin || !destination) {
    const inlineMatch = text.match(
      /from\s+([A-Za-z\s]+,?\s*[A-Z]{2}(?:\s+\d{5})?)\s+to\s+([A-Za-z\s]+,?\s*[A-Z]{2}(?:\s+\d{5})?)/i
    )
    if (inlineMatch) {
      if (!origin) origin = inlineMatch[1].trim()
      if (!destination) destination = inlineMatch[2].trim()
    }
  }

  // Fallback: Look for "City, ST" patterns
  if (!origin || !destination) {
    const cityStateMatches = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+([A-Z]{2})(?:\s+\d{5})?/g)
    if (cityStateMatches && cityStateMatches.length >= 2) {
      if (!origin) origin = cityStateMatches[0]
      if (!destination) destination = cityStateMatches[1]
    }
  }

  return { origin, destination }
}

/**
 * Extract description/equipment name
 */
function extractDescription(text: string): string | null {
  const lines = text.split('\n')

  // Subject line
  for (const line of lines) {
    const subjectMatch = line.match(/^subject:\s*(.+)/i)
    if (subjectMatch) {
      const subject = subjectMatch[1].trim()
      // Clean up common prefixes
      const cleaned = subject
        .replace(/^(?:re:|fwd:|fw:)\s*/i, '')
        .replace(/^(?:quote\s+(?:request|needed)|need\s+quote)\s*[-:]\s*/i, '')
        .trim()
      if (cleaned.length > 0) return cleaned
    }
  }

  // Equipment/cargo labels
  const labelPatterns = [
    /(?:equipment|cargo|item|machine|unit|load)\s*[:\-]\s*(.+)/i,
    /(?:moving|transport(?:ing)?|ship(?:ping)?|haul(?:ing)?)\s+(?:a|an|one)?\s*(.+?)(?:\s+from|\s+to|\s*$)/i,
    /quote\s+(?:for|on|needed\s+for)\s+(.+)/i,
  ]

  for (const pattern of labelPatterns) {
    const match = text.match(pattern)
    if (match) {
      let desc = match[1].trim()
      // Remove trailing dimension/weight info
      desc = desc.split(/\d+[\'\"x\s]*(?:ft|lbs|tons)/i)[0].trim()
      desc = desc.replace(/[,.]$/, '')
      if (desc.length > 2 && desc.length < 100) return desc
    }
  }

  // First meaningful line
  for (const line of lines) {
    const trimmed = line.trim()
    // Skip common non-description lines
    if (
      trimmed.length > 3 &&
      trimmed.length < 80 &&
      !trimmed.match(/^(?:from|to|weight|dimension|height|width|length|subject|hi|hello|dear|please|thanks|we need|quote|re:|fw:|fwd:)/i) &&
      !trimmed.match(/^\d+\s*[\'\"x]/) &&
      !trimmed.match(/^\d+.*(?:lbs|tons|kg)/i) &&
      !trimmed.match(/^(?:pickup|delivery|ship)/i) &&
      !trimmed.match(/@/) // Skip email addresses
    ) {
      return trimmed.replace(/[,.]$/, '')
    }
  }

  return null
}

/**
 * Extract dates from text
 */
function extractDates(text: string): {
  pickupDate: string | null
  deliveryDate: string | null
} {
  let pickupDate: string | null = null
  let deliveryDate: string | null = null

  // Common date patterns
  const datePattern = /(?:(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4}))|(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?)|(?:(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:,?\s+(\d{4}))?)/gi

  // Pickup date
  const pickupMatch = text.match(
    /(?:pickup|pick[\s-]?up|available|ready)\s*(?:date)?[:\-]?\s*([^\n]+)/i
  )
  if (pickupMatch) {
    const dateMatch = pickupMatch[1].match(datePattern)
    if (dateMatch) {
      pickupDate = dateMatch[0]
    }
  }

  // Delivery date
  const deliveryMatch = text.match(
    /(?:delivery|deliver|due|needed\s+by)\s*(?:date)?[:\-]?\s*([^\n]+)/i
  )
  if (deliveryMatch) {
    const dateMatch = deliveryMatch[1].match(datePattern)
    if (dateMatch) {
      deliveryDate = dateMatch[0]
    }
  }

  return { pickupDate, deliveryDate }
}

/**
 * Calculate confidence score
 */
function calculateConfidence(parsedLoad: ParsedLoad): number {
  let score = 0

  // Core fields (65 points)
  if (parsedLoad.length && parsedLoad.length > 0) score += 15
  if (parsedLoad.width && parsedLoad.width > 0) score += 15
  if (parsedLoad.height && parsedLoad.height > 0) score += 10
  if (parsedLoad.weight && parsedLoad.weight > 0) score += 25

  // Location fields (20 points)
  if (parsedLoad.origin) score += 10
  if (parsedLoad.destination) score += 10

  // Description (10 points)
  if (parsedLoad.description) score += 10

  // Dates (5 points)
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
  const dates = extractDates(emailText)

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
    pickupDate: dates.pickupDate || undefined,
    deliveryDate: dates.deliveryDate || undefined,
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
