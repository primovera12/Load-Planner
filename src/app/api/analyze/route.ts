import { NextRequest, NextResponse } from 'next/server'
import { parseEmail, validateParsedLoad } from '@/lib/email-parser'
import { selectTrucks } from '@/lib/truck-selector'
import { AnalyzeResponse } from '@/types'

/**
 * POST /api/analyze
 *
 * Analyze freight email text and return parsed load with truck recommendations
 *
 * Request body:
 * {
 *   emailText: string
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   parsedLoad: ParsedLoad
 *   recommendations: TruckRecommendation[]
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { emailText } = body

    // Validate input
    if (!emailText || typeof emailText !== 'string') {
      return NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          parsedLoad: {
            length: 0,
            width: 0,
            height: 0,
            weight: 0,
            items: [],
            confidence: 0,
          },
          recommendations: [],
          error: 'Email text is required',
        },
        { status: 400 }
      )
    }

    if (emailText.trim().length < 10) {
      return NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          parsedLoad: {
            length: 0,
            width: 0,
            height: 0,
            weight: 0,
            items: [],
            confidence: 0,
          },
          recommendations: [],
          error: 'Email text is too short to analyze',
        },
        { status: 400 }
      )
    }

    // Parse the email
    const parsedLoad = await parseEmail(emailText)

    // Validate parsed load has minimum required fields
    const validation = validateParsedLoad(parsedLoad)

    if (!validation.valid) {
      return NextResponse.json<AnalyzeResponse>({
        success: true,
        parsedLoad,
        recommendations: [],
        error: `Could not extract: ${validation.missingFields.join(', ')}. Please provide dimensions (L x W x H) and weight.`,
      })
    }

    // Get truck recommendations
    const recommendations = selectTrucks(parsedLoad)

    return NextResponse.json<AnalyzeResponse>({
      success: true,
      parsedLoad,
      recommendations,
    })
  } catch (error) {
    console.error('Error analyzing email:', error)
    return NextResponse.json<AnalyzeResponse>(
      {
        success: false,
        parsedLoad: {
          length: 0,
          width: 0,
          height: 0,
          weight: 0,
          items: [],
          confidence: 0,
        },
        recommendations: [],
        error: 'Failed to analyze email. Please try again.',
      },
      { status: 500 }
    )
  }
}
