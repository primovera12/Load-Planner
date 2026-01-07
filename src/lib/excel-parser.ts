/**
 * Excel and CSV file parser for cargo data import
 * Supports .xlsx, .xls, and .csv formats
 */

import * as XLSX from 'xlsx'

export interface ParsedRow {
  [key: string]: string | number | null
}

export interface ParsedSheet {
  name: string
  headers: string[]
  rows: ParsedRow[]
  rowCount: number
}

export interface ParseResult {
  success: boolean
  sheets: ParsedSheet[]
  error?: string
  fileName: string
  fileType: 'xlsx' | 'xls' | 'csv'
}

/**
 * Parse an Excel or CSV file from a File object
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const fileName = file.name
  const extension = fileName.split('.').pop()?.toLowerCase()

  if (!extension || !['xlsx', 'xls', 'csv'].includes(extension)) {
    return {
      success: false,
      sheets: [],
      error: 'Unsupported file format. Please use .xlsx, .xls, or .csv files.',
      fileName,
      fileType: 'xlsx',
    }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    const sheets: ParsedSheet[] = workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        blankrows: false,
      }) as unknown as (string | number | null)[][]

      if (jsonData.length === 0) {
        return {
          name: sheetName,
          headers: [],
          rows: [],
          rowCount: 0,
        }
      }

      // First row is headers
      const headers = (jsonData[0] || []).map((h, i) =>
        h !== null && h !== undefined ? String(h).trim() : `Column ${i + 1}`
      )

      // Rest are data rows
      const rows: ParsedRow[] = jsonData.slice(1).map((row) => {
        const rowObj: ParsedRow = {}
        headers.forEach((header, index) => {
          rowObj[header] = row[index] ?? null
        })
        return rowObj
      })

      return {
        name: sheetName,
        headers,
        rows,
        rowCount: rows.length,
      }
    })

    return {
      success: true,
      sheets,
      fileName,
      fileType: extension as 'xlsx' | 'xls' | 'csv',
    }
  } catch (error) {
    return {
      success: false,
      sheets: [],
      error: error instanceof Error ? error.message : 'Failed to parse file',
      fileName,
      fileType: extension as 'xlsx' | 'xls' | 'csv',
    }
  }
}

/**
 * Parse CSV text directly
 */
export function parseCSVText(text: string): ParsedSheet {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())

  if (lines.length === 0) {
    return {
      name: 'Sheet1',
      headers: [],
      rows: [],
      rowCount: 0,
    }
  }

  // Simple CSV parsing (handles basic cases)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())

    return result
  }

  const headers = parseCSVLine(lines[0]).map((h, i) =>
    h ? h.trim() : `Column ${i + 1}`
  )

  const rows: ParsedRow[] = lines.slice(1).map((line) => {
    const values = parseCSVLine(line)
    const rowObj: ParsedRow = {}
    headers.forEach((header, index) => {
      const value = values[index]
      // Try to parse as number
      if (value !== undefined && value !== '' && !isNaN(Number(value))) {
        rowObj[header] = Number(value)
      } else {
        rowObj[header] = value ?? null
      }
    })
    return rowObj
  })

  return {
    name: 'Sheet1',
    headers,
    rows,
    rowCount: rows.length,
  }
}

/**
 * Get a preview of the parsed data (first N rows)
 */
export function getPreview(sheet: ParsedSheet, maxRows: number = 10): ParsedSheet {
  return {
    ...sheet,
    rows: sheet.rows.slice(0, maxRows),
    rowCount: sheet.rowCount,
  }
}

/**
 * Validate that required columns exist in the parsed data
 */
export function validateColumns(
  sheet: ParsedSheet,
  requiredColumns: string[]
): { valid: boolean; missing: string[] } {
  const headerLower = sheet.headers.map((h) => h.toLowerCase())
  const missing = requiredColumns.filter(
    (col) => !headerLower.includes(col.toLowerCase())
  )

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Unit conversion constants
 */
const UNIT_CONVERSIONS = {
  // Length to feet
  m: 3.28084,           // meters to feet
  meter: 3.28084,
  meters: 3.28084,
  cm: 0.0328084,        // centimeters to feet
  centimeter: 0.0328084,
  centimeters: 0.0328084,
  mm: 0.00328084,       // millimeters to feet
  millimeter: 0.00328084,
  millimeters: 0.00328084,
  in: 0.0833333,        // inches to feet
  inch: 0.0833333,
  inches: 0.0833333,
  // Weight to pounds
  kg: 2.20462,          // kilograms to pounds
  kilogram: 2.20462,
  kilograms: 2.20462,
  ton: 2000,            // short tons to pounds
  tons: 2000,
  tonne: 2204.62,       // metric tons to pounds
  tonnes: 2204.62,
} as const

/**
 * Detect unit type from value string
 */
export type UnitType = 'length' | 'weight' | 'unknown'

export function detectUnitType(value: string): { type: UnitType; unit: string | null; isMetric: boolean } {
  const str = String(value).toLowerCase()

  // Length units
  if (/\b(m|meter|meters|cm|centimeter|centimeters|mm|millimeter|millimeters)\b/i.test(str)) {
    return { type: 'length', unit: str.match(/\b(m|meter|meters|cm|centimeter|centimeters|mm|millimeter|millimeters)\b/i)?.[0] || null, isMetric: true }
  }
  if (/\b(ft|feet|foot|in|inch|inches|'|")\b/i.test(str)) {
    return { type: 'length', unit: str.match(/\b(ft|feet|foot|in|inch|inches)\b/i)?.[0] || null, isMetric: false }
  }

  // Weight units
  if (/\b(kg|kilogram|kilograms|tonne|tonnes)\b/i.test(str)) {
    return { type: 'weight', unit: str.match(/\b(kg|kilogram|kilograms|tonne|tonnes)\b/i)?.[0] || null, isMetric: true }
  }
  if (/\b(lb|lbs|pound|pounds|ton|tons)\b/i.test(str)) {
    return { type: 'weight', unit: str.match(/\b(lb|lbs|pound|pounds|ton|tons)\b/i)?.[0] || null, isMetric: false }
  }

  return { type: 'unknown', unit: null, isMetric: false }
}

/**
 * Extract numeric value from a cell that might have units
 * Automatically converts metric units to imperial (feet, pounds)
 * e.g., "10 ft", "25'", "3.5m" → 11.48, "45,000 lbs", "100 kg" → 220.46
 */
export function extractNumericValue(value: string | number | null, forceConvertMetric = true): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value

  const str = String(value)

  // Detect if we have metric units that need conversion
  const unitInfo = detectUnitType(str)

  // Extract the numeric part
  const numMatch = str.replace(/,/g, '').match(/-?\d+\.?\d*/)
  if (!numMatch) return null

  let num = parseFloat(numMatch[0])
  if (isNaN(num)) return null

  // Apply unit conversion if needed
  if (forceConvertMetric && unitInfo.unit) {
    const conversionFactor = UNIT_CONVERSIONS[unitInfo.unit.toLowerCase() as keyof typeof UNIT_CONVERSIONS]
    if (conversionFactor) {
      num = num * conversionFactor
    }
  }

  return num
}

/**
 * Extract numeric value with explicit unit handling
 * Returns both the value and detected unit info
 */
export function extractValueWithUnit(
  value: string | number | null
): { value: number | null; unit: string | null; converted: boolean; originalValue: number | null } {
  if (value === null || value === undefined) {
    return { value: null, unit: null, converted: false, originalValue: null }
  }

  if (typeof value === 'number') {
    return { value, unit: null, converted: false, originalValue: value }
  }

  const str = String(value)
  const unitInfo = detectUnitType(str)

  // Extract the numeric part
  const numMatch = str.replace(/,/g, '').match(/-?\d+\.?\d*/)
  if (!numMatch) {
    return { value: null, unit: unitInfo.unit, converted: false, originalValue: null }
  }

  const originalValue = parseFloat(numMatch[0])
  if (isNaN(originalValue)) {
    return { value: null, unit: unitInfo.unit, converted: false, originalValue: null }
  }

  // Apply unit conversion if metric
  let convertedValue = originalValue
  let wasConverted = false

  if (unitInfo.unit && unitInfo.isMetric) {
    const conversionFactor = UNIT_CONVERSIONS[unitInfo.unit.toLowerCase() as keyof typeof UNIT_CONVERSIONS]
    if (conversionFactor) {
      convertedValue = originalValue * conversionFactor
      wasConverted = true
    }
  }

  return {
    value: convertedValue,
    unit: unitInfo.unit,
    converted: wasConverted,
    originalValue,
  }
}

/**
 * Convert parsed rows to cargo items using column mapping
 */
export interface ColumnMapping {
  name?: string
  length?: string
  width?: string
  height?: string
  weight?: string
  quantity?: string
}

export interface CargoImportItem {
  name: string
  length: number
  width: number
  height: number
  weight: number
  quantity: number
  originalRow: number
  errors: string[]
}

export function convertToCargoItems(
  sheet: ParsedSheet,
  mapping: ColumnMapping
): CargoImportItem[] {
  const items: CargoImportItem[] = []

  sheet.rows.forEach((row, index) => {
    const errors: string[] = []

    // Extract values using mapping
    const name = mapping.name ? String(row[mapping.name] ?? '') : `Item ${index + 1}`
    const length = mapping.length ? extractNumericValue(row[mapping.length]) : null
    const width = mapping.width ? extractNumericValue(row[mapping.width]) : null
    const height = mapping.height ? extractNumericValue(row[mapping.height]) : null
    const weight = mapping.weight ? extractNumericValue(row[mapping.weight]) : null
    const quantity = mapping.quantity ? extractNumericValue(row[mapping.quantity]) ?? 1 : 1

    // Validate required fields
    if (!length || length <= 0) errors.push('Invalid length')
    if (!width || width <= 0) errors.push('Invalid width')
    if (!height || height <= 0) errors.push('Invalid height')
    if (!weight || weight <= 0) errors.push('Invalid weight')

    items.push({
      name: name || `Item ${index + 1}`,
      length: length ?? 0,
      width: width ?? 0,
      height: height ?? 0,
      weight: weight ?? 0,
      quantity: Math.max(1, Math.round(quantity)),
      originalRow: index + 2, // +2 for 1-based and header row
      errors,
    })
  })

  return items
}

/**
 * Get import statistics
 */
export function getImportStats(items: CargoImportItem[]): {
  total: number
  valid: number
  invalid: number
  totalQuantity: number
  totalWeight: number
} {
  const valid = items.filter((item) => item.errors.length === 0)
  const totalQuantity = valid.reduce((sum, item) => sum + item.quantity, 0)
  const totalWeight = valid.reduce((sum, item) => sum + item.weight * item.quantity, 0)

  return {
    total: items.length,
    valid: valid.length,
    invalid: items.length - valid.length,
    totalQuantity,
    totalWeight,
  }
}
