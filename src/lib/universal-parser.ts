import * as XLSX from 'xlsx'

export interface ParsedItem {
  id: string
  description: string
  quantity: number
  length: number // feet
  width: number // feet
  height: number // feet
  weight: number // lbs
  unit?: string // original unit for reference
  raw?: Record<string, unknown> // original row data
}

export interface UniversalParseResult {
  success: boolean
  items: ParsedItem[]
  metadata?: {
    fileName?: string
    fileType?: string
    sheetName?: string
    totalRows?: number
    parsedRows?: number
  }
  error?: string
  rawText?: string // For AI processing
}

// Common column name patterns
const COLUMN_PATTERNS = {
  description: /desc|name|item|part|product|material|cargo|equipment/i,
  quantity: /qty|quantity|count|pcs|pieces|units?$/i,
  length: /length|len|l\s*[\(\[]|^l$/i,
  width: /width|wid|w\s*[\(\[]|^w$/i,
  height: /height|hgt|h\s*[\(\[]|^h$/i,
  weight: /weight|wt|wgt|mass|gw|gross|lbs|kg|pounds|kilos/i,
  // Metric-specific
  lengthMeters: /l\s*\(?m\)?|length.*meter|meters?$/i,
  widthMeters: /w\s*\(?m\)?|width.*meter/i,
  heightMeters: /h\s*\(?m\)?|height.*meter/i,
  weightKg: /kg|kilo|gross.*kg|gw.*kg/i,
  weightLbs: /lbs|pounds|gross.*lb/i,
}

// Unit conversion helpers
const metersToFeet = (m: number) => m * 3.28084
const kgToLbs = (kg: number) => kg * 2.20462
const inchesToFeet = (inches: number) => inches / 12
const cmToFeet = (cm: number) => cm / 30.48
const mmToFeet = (mm: number) => mm / 304.8

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Detect unit from column name or value
 */
function detectUnit(columnName: string, value: unknown): { unit: string; multiplier: number } {
  const colLower = columnName.toLowerCase()

  // Check column name for unit hints
  if (colLower.includes('meter') || colLower.match(/\(m\)|\[m\]/)) {
    return { unit: 'meters', multiplier: 3.28084 }
  }
  if (colLower.includes('inch') || colLower.match(/\(in\)|\[in\]|\"$/)) {
    return { unit: 'inches', multiplier: 1/12 }
  }
  if (colLower.match(/\(cm\)|\[cm\]/)) {
    return { unit: 'cm', multiplier: 1/30.48 }
  }
  if (colLower.match(/\(mm\)|\[mm\]/)) {
    return { unit: 'mm', multiplier: 1/304.8 }
  }
  if (colLower.includes('kg') || colLower.match(/\(kg\)|\[kg\]/)) {
    return { unit: 'kg', multiplier: 2.20462 }
  }
  if (colLower.includes('lbs') || colLower.includes('pounds') || colLower.match(/\(lbs\)|\[lbs\]/)) {
    return { unit: 'lbs', multiplier: 1 }
  }
  if (colLower.match(/\(t\)|\[t\]|tonne/)) {
    return { unit: 'tonnes', multiplier: 2204.62 }
  }

  // Default to feet/lbs (US standard)
  if (colLower.match(/length|width|height|^[lwh]$/i)) {
    return { unit: 'feet', multiplier: 1 }
  }
  if (colLower.match(/weight|wt|mass/i)) {
    return { unit: 'lbs', multiplier: 1 }
  }

  return { unit: 'unknown', multiplier: 1 }
}

/**
 * Parse a numeric value from various formats
 */
function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    return isNaN(value) ? null : value
  }

  const str = String(value).trim()

  // Handle feet and inches format: 10'6" or 10' 6"
  const feetInchMatch = str.match(/(\d+(?:\.\d+)?)'?\s*(\d+(?:\.\d+)?)?\"?/)
  if (feetInchMatch) {
    const feet = parseFloat(feetInchMatch[1]) || 0
    const inches = parseFloat(feetInchMatch[2]) || 0
    return feet + inches / 12
  }

  // Handle comma-separated numbers: 45,000
  const cleaned = str.replace(/,/g, '').replace(/[^\d.-]/g, '')
  const num = parseFloat(cleaned)

  return isNaN(num) ? null : num
}

/**
 * Auto-detect columns from headers
 */
function autoDetectColumns(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {}
  const usedIndices = new Set<number>()

  // First pass: look for exact/strong matches
  headers.forEach((header, index) => {
    const h = header.toLowerCase().trim()

    // Length (meters)
    if (!mapping.lengthMeters && h.match(/l\s*\(?meters?\)?|length.*\(m\)|^l \(meters\)/i)) {
      mapping.lengthMeters = index
      usedIndices.add(index)
    }
    // Width (meters)
    if (!mapping.widthMeters && h.match(/w\s*\(?meters?\)?|width.*\(m\)/i)) {
      mapping.widthMeters = index
      usedIndices.add(index)
    }
    // Height (meters)
    if (!mapping.heightMeters && h.match(/h\s*\(?meters?\)?|height.*\(m\)/i)) {
      mapping.heightMeters = index
      usedIndices.add(index)
    }
    // Length (inches)
    if (!mapping.lengthInches && h.match(/l\s*\(?inch/i)) {
      mapping.lengthInches = index
      usedIndices.add(index)
    }
    // Width (inches)
    if (!mapping.widthInches && h.match(/w\s*\(?inch/i)) {
      mapping.widthInches = index
      usedIndices.add(index)
    }
    // Height (inches)
    if (!mapping.heightInches && h.match(/h\s*\(?inch/i)) {
      mapping.heightInches = index
      usedIndices.add(index)
    }
    // Weight (lbs)
    if (!mapping.weightLbs && h.match(/lbs|pounds/i)) {
      mapping.weightLbs = index
      usedIndices.add(index)
    }
    // Weight (kg)
    if (!mapping.weightKg && h.match(/gw\s*\(?kg\)?|weight.*kg|kg/i) && !h.match(/lbs/i)) {
      mapping.weightKg = index
      usedIndices.add(index)
    }
    // Description
    if (!mapping.description && h.match(/description|item|name|part|product|material|cargo/i)) {
      mapping.description = index
      usedIndices.add(index)
    }
    // Quantity
    if (!mapping.quantity && h.match(/qty|quantity|count|pcs/i)) {
      mapping.quantity = index
      usedIndices.add(index)
    }
  })

  return mapping
}

/**
 * Parse Excel/CSV data
 */
export function parseSpreadsheet(data: ArrayBuffer, fileName: string): UniversalParseResult {
  try {
    const workbook = XLSX.read(data, { type: 'array' })
    const items: ParsedItem[] = []
    let totalRows = 0
    let parsedRows = 0

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]

      if (jsonData.length < 2) continue // Need at least header + 1 row

      // Find the header row (usually first non-empty row with dimension-related words)
      let headerRowIndex = 0
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i] as unknown[]
        const rowStr = row.join(' ').toLowerCase()
        if (rowStr.match(/length|width|height|weight|description|dimension/i)) {
          headerRowIndex = i
          break
        }
      }

      const headers = (jsonData[headerRowIndex] as unknown[]).map(h => String(h || ''))
      const columnMap = autoDetectColumns(headers)

      // Process data rows
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[]
        if (!row || row.every(cell => cell === '' || cell === null)) continue

        totalRows++

        // Get description
        let description = ''
        if (columnMap.description !== undefined) {
          description = String(row[columnMap.description] || '')
        }

        // Skip if no description and no dimension data
        if (!description && !row.some(cell => parseNumber(cell) !== null)) continue

        // Get quantity
        let quantity = 1
        if (columnMap.quantity !== undefined) {
          quantity = parseNumber(row[columnMap.quantity]) || 1
        }

        // Get dimensions - prefer LBS/feet if available, otherwise convert from metric
        let length = 0, width = 0, height = 0, weight = 0

        // Try LBS first
        if (columnMap.weightLbs !== undefined) {
          weight = parseNumber(row[columnMap.weightLbs]) || 0
        } else if (columnMap.weightKg !== undefined) {
          const kg = parseNumber(row[columnMap.weightKg]) || 0
          weight = kgToLbs(kg)
        }

        // Try inches first for dimensions
        if (columnMap.lengthInches !== undefined) {
          length = inchesToFeet(parseNumber(row[columnMap.lengthInches]) || 0)
        } else if (columnMap.lengthMeters !== undefined) {
          length = metersToFeet(parseNumber(row[columnMap.lengthMeters]) || 0)
        }

        if (columnMap.widthInches !== undefined) {
          width = inchesToFeet(parseNumber(row[columnMap.widthInches]) || 0)
        } else if (columnMap.widthMeters !== undefined) {
          width = metersToFeet(parseNumber(row[columnMap.widthMeters]) || 0)
        }

        if (columnMap.heightInches !== undefined) {
          height = inchesToFeet(parseNumber(row[columnMap.heightInches]) || 0)
        } else if (columnMap.heightMeters !== undefined) {
          height = metersToFeet(parseNumber(row[columnMap.heightMeters]) || 0)
        }

        // Skip rows with no useful data
        if (length === 0 && width === 0 && height === 0 && weight === 0) continue

        parsedRows++

        items.push({
          id: generateId(),
          description: description || `Item ${parsedRows}`,
          quantity,
          length: Math.round(length * 100) / 100,
          width: Math.round(width * 100) / 100,
          height: Math.round(height * 100) / 100,
          weight: Math.round(weight),
          raw: headers.reduce((acc, h, idx) => {
            if (h) acc[h] = row[idx]
            return acc
          }, {} as Record<string, unknown>),
        })
      }
    }

    return {
      success: items.length > 0,
      items,
      metadata: {
        fileName,
        fileType: fileName.endsWith('.csv') ? 'CSV' : 'Excel',
        totalRows,
        parsedRows: items.length,
      },
      error: items.length === 0 ? 'No valid cargo items found in file' : undefined,
    }
  } catch (error) {
    return {
      success: false,
      items: [],
      error: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Parse PDF text content
 */
export function parsePDFText(text: string): UniversalParseResult {
  // For PDFs, we'll extract the raw text and return it for AI processing
  // along with any dimensions we can pattern-match

  const items: ParsedItem[] = []

  // Try to find dimension patterns in the text
  const dimensionPatterns = [
    // L x W x H format: "32' x 10' x 10'6""
    /(\d+(?:\.\d+)?)\s*['']?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*['']?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*['"]?/g,
    // Separate L W H: "Length: 32 ft, Width: 10 ft, Height: 10.5 ft"
    /length[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?/gi,
    /width[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?/gi,
    /height[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?/gi,
  ]

  // Try LxWxH pattern first
  const lwhMatch = text.match(/(\d+(?:\.\d+)?)\s*['']?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*['']?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*['"]?/)
  if (lwhMatch) {
    const l = parseFloat(lwhMatch[1])
    const w = parseFloat(lwhMatch[2])
    const h = parseFloat(lwhMatch[3])

    // Try to find weight
    const weightMatch = text.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilograms?)/i)
    const weight = weightMatch ? parseNumber(weightMatch[1]) || 0 : 0

    // Try to find description
    const descMatch = text.match(/(?:item|description|cargo|equipment|product)[:\s]*([^\n,]+)/i)
    const description = descMatch ? descMatch[1].trim() : 'Cargo from PDF'

    items.push({
      id: generateId(),
      description,
      quantity: 1,
      length: l,
      width: w,
      height: h,
      weight,
    })
  }

  return {
    success: true,
    items,
    rawText: text, // Return raw text for AI processing
    metadata: {
      fileType: 'PDF',
      parsedRows: items.length,
    },
  }
}

/**
 * Parse plain text (email, manual input)
 */
export function parseText(text: string): UniversalParseResult {
  const items: ParsedItem[] = []

  // Pattern matching for dimensions
  const patterns = {
    // L x W x H formats
    lwhPattern: /(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|")?/,
    // Feet and inches: 10'6"
    feetInches: /(\d+)'(\d+)"/g,
    // Individual dimensions
    length: /(?:length|len|l)[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?/i,
    width: /(?:width|wid|w)[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?/i,
    height: /(?:height|hgt|h)[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|'|m|meters?)?/i,
    weight: /(?:weight|wt)[:\s]*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilograms?|tons?)?/i,
    // Description hints
    description: /(?:item|description|cargo|equipment|product|moving)[:\s]*([^\n,]+)/i,
  }

  let length = 0, width = 0, height = 0, weight = 0, description = ''

  // Try LxWxH pattern
  const lwhMatch = text.match(patterns.lwhPattern)
  if (lwhMatch) {
    length = parseFloat(lwhMatch[1])
    width = parseFloat(lwhMatch[2])
    height = parseFloat(lwhMatch[3])
  } else {
    // Try individual patterns
    const lengthMatch = text.match(patterns.length)
    const widthMatch = text.match(patterns.width)
    const heightMatch = text.match(patterns.height)

    if (lengthMatch) length = parseFloat(lengthMatch[1])
    if (widthMatch) width = parseFloat(widthMatch[1])
    if (heightMatch) height = parseFloat(heightMatch[1])
  }

  // Get weight
  const weightMatch = text.match(patterns.weight)
  if (weightMatch) {
    weight = parseNumber(weightMatch[1]) || 0
    // Convert if kg
    if (text.toLowerCase().includes('kg')) {
      weight = kgToLbs(weight)
    }
  }

  // Get description
  const descMatch = text.match(patterns.description)
  if (descMatch) {
    description = descMatch[1].trim()
  } else {
    // Try to extract any quoted text or equipment name
    const quotedMatch = text.match(/"([^"]+)"|'([^']+)'/)
    if (quotedMatch) {
      description = quotedMatch[1] || quotedMatch[2]
    } else {
      // Look for common equipment names
      const equipmentMatch = text.match(/\b(excavator|bulldozer|crane|loader|generator|transformer|tank|vessel|container|trailer|equipment)\b/i)
      if (equipmentMatch) {
        description = equipmentMatch[0]
      }
    }
  }

  if (length > 0 || width > 0 || height > 0 || weight > 0) {
    items.push({
      id: generateId(),
      description: description || 'Cargo',
      quantity: 1,
      length,
      width,
      height,
      weight,
    })
  }

  return {
    success: items.length > 0,
    items,
    rawText: text,
    metadata: {
      fileType: 'Text',
      parsedRows: items.length,
    },
    error: items.length === 0 ? 'Could not extract cargo dimensions from text' : undefined,
  }
}

/**
 * Detect file type and parse accordingly
 */
export async function parseFile(file: File): Promise<UniversalParseResult> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
    const buffer = await file.arrayBuffer()
    return parseSpreadsheet(buffer, file.name)
  }

  if (fileName.endsWith('.pdf')) {
    // For PDF, we need server-side processing
    return {
      success: true,
      items: [],
      rawText: 'PDF_NEEDS_SERVER_PROCESSING',
      metadata: {
        fileName: file.name,
        fileType: 'PDF',
      },
    }
  }

  if (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
    // For images, we need AI vision processing
    return {
      success: true,
      items: [],
      rawText: 'IMAGE_NEEDS_AI_PROCESSING',
      metadata: {
        fileName: file.name,
        fileType: 'Image',
      },
    }
  }

  if (fileName.endsWith('.txt') || fileName.endsWith('.eml')) {
    const text = await file.text()
    return parseText(text)
  }

  // Try to read as text
  try {
    const text = await file.text()
    return parseText(text)
  } catch {
    return {
      success: false,
      items: [],
      error: `Unsupported file type: ${file.name}`,
    }
  }
}
