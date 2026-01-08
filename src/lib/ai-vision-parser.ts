/**
 * AI Vision Parser for Load Planner
 *
 * Uses Google Gemini Vision to extract cargo information from images
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { ParsedItem } from './universal-parser'

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || ''

let genAI: GoogleGenerativeAI | null = null

function getGenAI() {
  if (!genAI && API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY)
  }
  return genAI
}

export interface AIParseResult {
  success: boolean
  items: ParsedItem[]
  rawResponse?: string
  error?: string
}

const VISION_PROMPT = `You are analyzing an image that contains cargo or freight information for load planning.

Extract all cargo items with their dimensions and weights. Look for:
- Tables with dimensions (L x W x H or Length, Width, Height)
- Weight information (in lbs, kg, tons)
- Item descriptions/names
- Quantities
- Packing lists, shipping documents, cargo specs

Return a JSON array of items with this exact structure:
[
  {
    "description": "item name or description",
    "quantity": 1,
    "length": 10.5,  // in feet (convert from meters/inches if needed)
    "width": 8.2,    // in feet
    "height": 5.0,   // in feet
    "weight": 15000  // in pounds (convert from kg/tons if needed)
  }
]

IMPORTANT:
- Convert ALL dimensions to feet (1 meter = 3.28084 feet, 12 inches = 1 foot)
- Convert ALL weights to pounds (1 kg = 2.20462 lbs, 1 ton = 2000 lbs)
- If dimensions are unclear, make reasonable estimates based on context
- If weight is missing, estimate based on item type (e.g., excavator ~45000 lbs)
- Return ONLY the JSON array, no other text
- If you cannot extract any items, return an empty array []

Now analyze this image and extract cargo information:`

/**
 * Parse an image using AI vision to extract cargo information
 */
export async function parseImageWithAI(
  imageData: string // base64 data URL like "data:image/png;base64,..."
): Promise<AIParseResult> {
  const ai = getGenAI()

  if (!ai) {
    return {
      success: false,
      items: [],
      error: 'AI service not configured. Please set GOOGLE_AI_API_KEY or GEMINI_API_KEY.',
    }
  }

  try {
    // Extract the base64 data and mime type
    const match = imageData.match(/^data:(.+);base64,(.+)$/)
    if (!match) {
      return {
        success: false,
        items: [],
        error: 'Invalid image data format',
      }
    }

    const mimeType = match[1]
    const base64Data = match[2]

    // Use Gemini Vision model
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const result = await model.generateContent([
      VISION_PROMPT,
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ])

    const response = await result.response
    const text = response.text()

    // Try to parse the JSON response
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      let jsonStr = text
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }

      const items = JSON.parse(jsonStr) as Array<{
        description: string
        quantity: number
        length: number
        width: number
        height: number
        weight: number
      }>

      // Convert to ParsedItem format and validate
      const parsedItems: ParsedItem[] = items
        .map((item, index) => ({
          id: `ai-${Date.now()}-${index}`,
          description: item.description || `Item ${index + 1}`,
          quantity: item.quantity || 1,
          length: item.length || 0,
          width: item.width || 0,
          height: item.height || 0,
          weight: item.weight || 0,
        }))
        // Filter out empty items (must have at least one dimension or weight)
        .filter(item =>
          item.length > 0 || item.width > 0 || item.height > 0 || item.weight > 0
        )

      return {
        success: parsedItems.length > 0,
        items: parsedItems,
        rawResponse: text,
      }
    } catch (parseError) {
      // If JSON parsing fails, return the raw text
      return {
        success: false,
        items: [],
        rawResponse: text,
        error: 'Could not parse AI response. The image may not contain structured cargo data.',
      }
    }
  } catch (error) {
    console.error('AI Vision parsing error:', error)
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'AI vision processing failed',
    }
  }
}

/**
 * Parse text using AI to extract cargo information
 * Handles any format: spreadsheets, tables, emails, documents, etc.
 */
export async function parseTextWithAI(text: string): Promise<AIParseResult> {
  const ai = getGenAI()

  if (!ai) {
    return {
      success: false,
      items: [],
      error: 'AI service not configured. Please set GOOGLE_AI_API_KEY or GEMINI_API_KEY.',
    }
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are an expert at extracting cargo/freight data from ANY format - spreadsheets, tables, packing lists, emails, PDFs, etc.

Your job is to find ALL cargo items with their dimensions and weights, regardless of how the data is formatted.

LOOK FOR:
- Item names/descriptions (SKU, Name, Description, Part #, etc.)
- Dimensions - could be labeled as Length/Width/Height, L/W/H, Dimensions, Size, etc.
- Weights - could be in lbs, kg, tons, pounds, kilograms
- Quantities - Qty, Quantity, Count, Pcs, Units
- The data might have headers explaining units (e.g., "Length dimensions: Inches" or "Weight: Pounds")

UNDERSTAND DIFFERENT FORMATS:
- CSV/spreadsheet data with columns separated by commas or pipes
- Tables with headers that might span multiple rows
- Metadata rows that explain units (e.g., "Inches", "Pounds", "Decimeters")
- European formats (commas as decimals, different column names)
- Cargo Planner exports, packing lists, shipping manifests

Return a JSON array with this EXACT structure:
[
  {
    "sku": "item ID if available",
    "description": "item name or description",
    "quantity": 1,
    "length": 10.5,
    "width": 8.2,
    "height": 5.0,
    "weight": 15000,
    "stackable": true,
    "priority": 1
  }
]

CRITICAL CONVERSION RULES:
- Convert ALL dimensions to FEET:
  * Inches → divide by 12
  * Meters → multiply by 3.28084
  * Centimeters → divide by 30.48
  * Decimeters → multiply by 0.328084
- Convert ALL weights to POUNDS:
  * Kilograms → multiply by 2.20462
  * Tons → multiply by 2000
- Look for unit hints in headers or metadata rows

IMPORTANT:
- Extract EVERY cargo item you can find
- If units aren't specified, assume inches for dimensions and pounds for weight
- Stackable: true if "Yes"/"Y", false if "No"/"N"
- Return ONLY the JSON array, no explanation
- If no items found, return []

DATA TO ANALYZE:
${text}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text()

    try {
      let jsonStr = responseText
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        jsonStr = jsonMatch[0]
      }

      const items = JSON.parse(jsonStr) as Array<{
        sku?: string
        description: string
        quantity: number
        length: number
        width: number
        height: number
        weight: number
        stackable?: boolean
        priority?: number
      }>

      // Convert to ParsedItem format and validate
      const parsedItems: ParsedItem[] = items
        .map((item, index) => ({
          id: `ai-${Date.now()}-${index}`,
          sku: item.sku,
          description: item.description || item.sku || `Item ${index + 1}`,
          quantity: item.quantity || 1,
          length: Math.round((item.length || 0) * 100) / 100,
          width: Math.round((item.width || 0) * 100) / 100,
          height: Math.round((item.height || 0) * 100) / 100,
          weight: Math.round(item.weight || 0),
          stackable: item.stackable,
          priority: item.priority,
        }))
        // Filter out empty items (must have at least one dimension or weight)
        .filter(item =>
          item.length > 0 || item.width > 0 || item.height > 0 || item.weight > 0
        )

      return {
        success: parsedItems.length > 0,
        items: parsedItems,
        rawResponse: responseText,
      }
    } catch {
      return {
        success: false,
        items: [],
        rawResponse: responseText,
        error: 'Could not parse AI response',
      }
    }
  } catch (error) {
    console.error('AI text parsing error:', error)
    return {
      success: false,
      items: [],
      error: error instanceof Error ? error.message : 'AI text processing failed',
    }
  }
}
