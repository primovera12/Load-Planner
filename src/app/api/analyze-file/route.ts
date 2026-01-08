import { NextRequest, NextResponse } from 'next/server'
import { parseSpreadsheet, parsePDFText, parseText, UniversalParseResult, ParsedItem } from '@/lib/universal-parser'
import { parseImageWithAI, parseTextWithAI } from '@/lib/ai-vision-parser'
import { selectTrucks } from '@/lib/truck-selector'
import { ParsedLoad, LoadItem } from '@/types/load'
import { TruckRecommendation } from '@/types/truck'
import { PDFParse } from 'pdf-parse'

// Convert ParsedItem to LoadItem
function toLoadItem(item: ParsedItem): LoadItem {
  return {
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    length: item.length,
    width: item.width,
    height: item.height,
    weight: item.weight,
    stackable: false,
    fragile: false,
    hazmat: false,
  }
}

// Convert UniversalParseResult to ParsedLoad
function toParsedLoad(result: UniversalParseResult): ParsedLoad {
  const items = result.items.map(toLoadItem)

  // Calculate overall dimensions from all items
  const length = items.length > 0 ? Math.max(...items.map(i => i.length)) : 0
  const width = items.length > 0 ? Math.max(...items.map(i => i.width)) : 0
  const height = items.length > 0 ? Math.max(...items.map(i => i.height)) : 0
  const weight = items.reduce((sum, i) => sum + i.weight * i.quantity, 0)

  return {
    length,
    width,
    height,
    weight,
    items,
    description: items.map(i => i.description).join(', ').slice(0, 100),
    confidence: result.success ? 85 : 50,
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

    // Convert to ParsedLoad format
    const parsedLoad = toParsedLoad(parseResult)

    // Get truck recommendations
    let recommendations: TruckRecommendation[] = []
    if (parsedLoad.length > 0 || parsedLoad.width > 0 || parsedLoad.height > 0 || parsedLoad.weight > 0) {
      recommendations = selectTrucks(parsedLoad)
    }

    return NextResponse.json({
      success: parseResult.success,
      parsedLoad,
      recommendations,
      metadata: parseResult.metadata,
      rawText: parseResult.rawText,
      error: parseResult.error,
    })
  } catch (error) {
    console.error('Analyze file error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze file',
    }, { status: 500 })
  }
}
