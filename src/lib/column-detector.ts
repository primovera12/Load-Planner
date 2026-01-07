/**
 * Auto-detect column mappings based on header names and data patterns
 */

import type { ParsedSheet, ColumnMapping, ParsedRow } from './excel-parser'

// Common patterns for cargo data columns
const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  name: [
    /^name$/i,
    /^item$/i,
    /^description$/i,
    /^desc$/i,
    /^cargo$/i,
    /^equipment$/i,
    /^product$/i,
    /^load$/i,
    /item.?name/i,
    /cargo.?name/i,
  ],
  length: [
    /^length$/i,
    /^len$/i,
    /^l$/i,
    /length.?\(?ft\)?/i,
    /length.?\(?feet\)?/i,
    /length.?\(?in\)?/i,
    /^long$/i,
  ],
  width: [
    /^width$/i,
    /^wid$/i,
    /^w$/i,
    /width.?\(?ft\)?/i,
    /width.?\(?feet\)?/i,
    /width.?\(?in\)?/i,
    /^wide$/i,
  ],
  height: [
    /^height$/i,
    /^hgt$/i,
    /^ht$/i,
    /^h$/i,
    /height.?\(?ft\)?/i,
    /height.?\(?feet\)?/i,
    /height.?\(?in\)?/i,
    /^tall$/i,
  ],
  weight: [
    /^weight$/i,
    /^wt$/i,
    /^wgt$/i,
    /weight.?\(?lb/i,
    /weight.?\(?kg/i,
    /^lbs$/i,
    /^pounds$/i,
    /^mass$/i,
  ],
  quantity: [
    /^qty$/i,
    /^quantity$/i,
    /^count$/i,
    /^num$/i,
    /^number$/i,
    /^units$/i,
    /^pieces$/i,
    /^pcs$/i,
  ],
}

/**
 * Score how well a column header matches a field type
 */
function scoreColumnMatch(header: string, patterns: RegExp[]): number {
  const normalized = header.toLowerCase().trim()

  for (let i = 0; i < patterns.length; i++) {
    if (patterns[i].test(normalized)) {
      // Earlier patterns are more specific, give them higher scores
      return patterns.length - i
    }
  }

  return 0
}

/**
 * Analyze sample data to help with detection
 */
function analyzeColumnData(
  rows: ParsedRow[],
  header: string
): { isNumeric: boolean; hasUnits: boolean; avgValue: number | null } {
  const values = rows.slice(0, 20).map((row) => row[header])
  const numericValues: number[] = []
  let hasUnits = false

  for (const value of values) {
    if (value === null || value === undefined) continue

    if (typeof value === 'number') {
      numericValues.push(value)
    } else {
      const str = String(value)
      // Check for unit patterns
      if (/\d+.*?(ft|feet|in|inch|m|lb|lbs|kg)/i.test(str)) {
        hasUnits = true
      }
      const cleaned = str.replace(/[,'"]/g, '').replace(/[a-zA-Z\s]/g, '')
      const num = parseFloat(cleaned)
      if (!isNaN(num)) {
        numericValues.push(num)
      }
    }
  }

  const isNumeric = numericValues.length > values.length * 0.5
  const avgValue =
    numericValues.length > 0
      ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      : null

  return { isNumeric, hasUnits, avgValue }
}

/**
 * Auto-detect column mappings from a parsed sheet
 */
export function detectColumnMapping(sheet: ParsedSheet): ColumnMapping {
  const mapping: ColumnMapping = {}
  const usedColumns = new Set<string>()

  // First pass: match by header patterns
  const fieldTypes: (keyof ColumnMapping)[] = [
    'name',
    'length',
    'width',
    'height',
    'weight',
    'quantity',
  ]

  for (const fieldType of fieldTypes) {
    let bestMatch: { header: string; score: number } | null = null

    for (const header of sheet.headers) {
      if (usedColumns.has(header)) continue

      const score = scoreColumnMatch(header, COLUMN_PATTERNS[fieldType])
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { header, score }
      }
    }

    if (bestMatch) {
      mapping[fieldType] = bestMatch.header
      usedColumns.add(bestMatch.header)
    }
  }

  // Second pass: use data analysis for unmatched fields
  if (!mapping.length || !mapping.width || !mapping.height || !mapping.weight) {
    const unassignedHeaders = sheet.headers.filter((h) => !usedColumns.has(h))

    for (const header of unassignedHeaders) {
      const analysis = analyzeColumnData(sheet.rows, header)

      if (!analysis.isNumeric) continue

      // Try to guess based on typical value ranges
      if (analysis.avgValue !== null) {
        // Length: typically 5-60 feet
        if (!mapping.length && analysis.avgValue >= 3 && analysis.avgValue <= 100) {
          // Check if header hints at dimension
          if (/dim|size|measure/i.test(header)) {
            mapping.length = header
            usedColumns.add(header)
            continue
          }
        }

        // Weight: typically 1000-100000 lbs
        if (!mapping.weight && analysis.avgValue >= 500 && analysis.avgValue <= 200000) {
          // Weight is usually the largest value
          if (/\d/.test(header) === false) {
            mapping.weight = header
            usedColumns.add(header)
            continue
          }
        }
      }
    }
  }

  return mapping
}

/**
 * Get suggestions for unmapped columns
 */
export function getColumnSuggestions(
  sheet: ParsedSheet,
  currentMapping: ColumnMapping
): Record<string, string[]> {
  const suggestions: Record<string, string[]> = {}
  const usedColumns = new Set(Object.values(currentMapping).filter(Boolean))

  const fieldTypes: (keyof ColumnMapping)[] = [
    'name',
    'length',
    'width',
    'height',
    'weight',
    'quantity',
  ]

  for (const fieldType of fieldTypes) {
    if (currentMapping[fieldType]) continue

    const candidates: { header: string; score: number }[] = []

    for (const header of sheet.headers) {
      if (usedColumns.has(header)) continue

      const score = scoreColumnMatch(header, COLUMN_PATTERNS[fieldType])
      const analysis = analyzeColumnData(sheet.rows, header)

      let adjustedScore = score

      // Boost numeric columns for dimension/weight fields
      if (fieldType !== 'name' && analysis.isNumeric) {
        adjustedScore += 1
      }

      // Boost columns with units for dimension/weight fields
      if (fieldType !== 'name' && analysis.hasUnits) {
        adjustedScore += 2
      }

      if (adjustedScore > 0 || analysis.isNumeric) {
        candidates.push({ header, score: adjustedScore })
      }
    }

    candidates.sort((a, b) => b.score - a.score)
    suggestions[fieldType] = candidates.slice(0, 3).map((c) => c.header)
  }

  return suggestions
}

/**
 * Validate a column mapping
 */
export function validateMapping(mapping: ColumnMapping): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!mapping.length) errors.push('Length column is required')
  if (!mapping.width) errors.push('Width column is required')
  if (!mapping.height) errors.push('Height column is required')
  if (!mapping.weight) errors.push('Weight column is required')

  // Optional fields
  if (!mapping.name) warnings.push('Name column not mapped - items will use default names')
  if (!mapping.quantity) warnings.push('Quantity column not mapped - assuming quantity of 1')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Get field labels for display
 */
export function getFieldLabel(field: keyof ColumnMapping): string {
  const labels: Record<keyof ColumnMapping, string> = {
    name: 'Item Name',
    length: 'Length (ft)',
    width: 'Width (ft)',
    height: 'Height (ft)',
    weight: 'Weight (lbs)',
    quantity: 'Quantity',
  }
  return labels[field]
}

/**
 * Check if a field is required
 */
export function isFieldRequired(field: keyof ColumnMapping): boolean {
  return ['length', 'width', 'height', 'weight'].includes(field)
}
