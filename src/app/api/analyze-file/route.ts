import { NextRequest, NextResponse } from 'next/server'
import { parseSpreadsheet, parsePDFText, parseText, UniversalParseResult, ParsedItem } from '@/lib/universal-parser'
import { parseImageWithAI, parseTextWithAI } from '@/lib/ai-vision-parser'
import { selectTrucks } from '@/lib/truck-selector'
import { ParsedLoad, LoadItem } from '@/types/load'
import { TruckRecommendation } from '@/types/truck'
// pdf-parse is dynamically imported only when needed to avoid serverless compatibility issues

// Convert ParsedItem to LoadItem
function toLoadItem(item: ParsedItem): LoadItem {
  return {
    id: item.id,
    sku: item.sku,
    description: item.description,
    quantity: item.quantity,
    length: item.length,
    width: item.width,
    height: item.height,
    weight: item.weight,
    // Stacking properties
    stackable: item.stackable ?? false,
    bottomOnly: item.bottomOnly,
    maxLayers: item.maxLayers,
    maxLoad: item.maxLoad,
    // Orientation/rotation
    orientation: item.orientation,
    // Visual properties
    geometry: item.geometry,
    color: item.color,
    // Loading order
    priority: item.priority,
    // Other
    fragile: false,
    hazmat: false,
  }
}

// Calculate smart confidence score based on data quality
function calculateConfidence(items: LoadItem[], parseMethod: string): number {
  if (items.length === 0) return 0

  let score = 0
  const item = items[0] // Check first item for field presence

  // Core fields (65 points max)
  if (item.length > 0) score += 15
  if (item.width > 0) score += 15
  if (item.height > 0) score += 10
  if (item.weight > 0) score += 25

  // Description (10 points)
  if (item.description && item.description.length > 3) score += 10

  // Multiple items bonus (10 points)
  if (items.length > 1) score += 10

  // AI parsing bonus (15 points) - AI is generally more reliable
  if (parseMethod === 'AI') score += 15

  return Math.min(score, 100)
}

// Convert UniversalParseResult to ParsedLoad
function toParsedLoad(result: UniversalParseResult, parseMethod: string = 'pattern'): ParsedLoad {
  const items = result.items.map(toLoadItem)

  // Calculate overall dimensions from all items
  // Length: max (items placed end-to-end or side-by-side)
  const length = items.length > 0 ? Math.max(...items.map(i => i.length)) : 0
  // Width: max (widest item determines load width)
  const width = items.length > 0 ? Math.max(...items.map(i => i.width)) : 0
  // Height: SUM all heights (conservative - assumes stacked cargo for permits)
  const height = items.length > 0
    ? items.reduce((sum, i) => sum + i.height * i.quantity, 0)
    : 0
  // Weight: sum all weights with quantities
  const weight = items.reduce((sum, i) => sum + i.weight * i.quantity, 0)

  return {
    length,
    width,
    height,
    weight,
    items,
    description: items.map(i => i.description).join(', ').slice(0, 100),
    confidence: calculateConfidence(items, parseMethod),
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null

    let parseResult: UniversalParseResult

    if (file) {
      const fileName = file.name.toLowerCase()

      // Handle different file types
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        // Excel/CSV files
        const buffer = await file.arrayBuffer()
        parseResult = parseSpreadsheet(buffer, file.name)
      } else if (fileName.endsWith('.pdf')) {
        // PDF files - extract text and parse using pdf-parse v2 API
        try {
          // Dynamic import to avoid serverless compatibility issues
          const { PDFParse } = await import('pdf-parse')
          const buffer = await file.arrayBuffer()
          const pdfParser = new PDFParse({ data: new Uint8Array(buffer) })
          const textResult = await pdfParser.getText()
          const pdfText = textResult.text || ''
          await pdfParser.destroy()

          parseResult = parsePDFText(pdfText)

          // If PDF parsing found items, great. Otherwise, return raw text for AI
          if (parseResult.items.length === 0 && pdfText.trim()) {
            parseResult.rawText = pdfText
          }
        } catch (pdfError) {
          console.error('PDF parsing error:', pdfError)
          return NextResponse.json({
            success: false,
            error: 'Failed to parse PDF. The file may be corrupted or password-protected.',
          }, { status: 400 })
        }
      } else if (fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) {
        // Image files - use AI vision to extract cargo data
        const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
        const mimeType = file.type || 'image/png'
        const imageData = `data:${mimeType};base64,${base64}`

        const aiResult = await parseImageWithAI(imageData)

        if (!aiResult.success && aiResult.error?.includes('not configured')) {
          // AI not configured, return helpful message
          return NextResponse.json({
            success: false,
            error: 'Image analysis requires AI. Please configure GOOGLE_AI_API_KEY in environment variables.',
          }, { status: 400 })
        }

        parseResult = {
          success: aiResult.success,
          items: aiResult.items,
          metadata: {
            fileName: file.name,
            fileType: 'Image',
            parsedRows: aiResult.items.length,
            parseMethod: 'AI', // Images are always AI-parsed
          },
          rawText: aiResult.rawResponse,
          error: aiResult.error,
        }
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.eml')) {
        // Text files
        const textContent = await file.text()
        parseResult = parseText(textContent)
      } else {
        // Try to read as text
        try {
          const textContent = await file.text()
          parseResult = parseText(textContent)
        } catch {
          return NextResponse.json({
            success: false,
            error: `Unsupported file type: ${file.name}`,
          }, { status: 400 })
        }
      }
    } else if (text) {
      // Plain text input
      parseResult = parseText(text)
    } else {
      return NextResponse.json({
        success: false,
        error: 'No file or text provided',
      }, { status: 400 })
    }

    // Track parse method for confidence scoring
    // Use metadata parseMethod if already set (e.g., for images which are always AI-parsed)
    let parseMethod = parseResult.metadata?.parseMethod || 'pattern'

    // AI Fallback: If pattern matching found no items but we have raw text, try AI
    if (parseResult.items.length === 0 && parseResult.rawText && parseResult.rawText.trim().length > 20) {
      console.log('Pattern matching found no items, trying AI fallback...')
      const aiResult = await parseTextWithAI(parseResult.rawText)

      if (aiResult.success && aiResult.items.length > 0) {
        parseResult = {
          success: true,
          items: aiResult.items,
          metadata: {
            ...parseResult.metadata,
            parseMethod: 'AI',
          },
          rawText: parseResult.rawText,
        }
        parseMethod = 'AI'
        console.log(`AI fallback found ${aiResult.items.length} items`)
      }
    }

    // Convert to ParsedLoad format
    const parsedLoad = toParsedLoad(parseResult, parseMethod)

    // Get truck recommendations
    let recommendations: TruckRecommendation[] = []
    if (parsedLoad.length > 0 || parsedLoad.width > 0 || parsedLoad.height > 0 || parsedLoad.weight > 0) {
      recommendations = selectTrucks(parsedLoad)
    }

    // Build enhanced metadata with parsing details
    const enhancedMetadata = {
      ...parseResult.metadata,
      parseMethod,
      itemsFound: parseResult.items.length,
      hasAIFallback: parseMethod === 'AI' && parseResult.metadata?.parseMethod !== 'AI',
    }

    // Generate helpful error/warning messages
    let warning: string | undefined
    if (parseResult.items.length === 0) {
      warning = 'No cargo items could be extracted. Please check your file format or try pasting the text directly.'
    } else if (parsedLoad.confidence < 50) {
      warning = 'Low confidence parsing. Some dimensions or weights may be missing. Please review the extracted data.'
    }

    return NextResponse.json({
      success: parseResult.success && parseResult.items.length > 0,
      parsedLoad,
      recommendations,
      metadata: enhancedMetadata,
      rawText: parseResult.rawText,
      error: parseResult.error,
      warning,
    })
  } catch (error) {
    console.error('Analyze file error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze file',
    }, { status: 500 })
  }
}
