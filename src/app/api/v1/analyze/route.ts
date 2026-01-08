import { NextRequest } from 'next/server'
import { requireApiAuth, isApiAuthError, apiError, apiSuccess, withApiHeaders } from '@/lib/api-auth'
import { parseEmail } from '@/lib/email-parser'
import { selectTrucks } from '@/lib/truck-selector'

// POST /api/v1/analyze - Analyze email text and get truck recommendations
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request, 'analyze:use')
  if (isApiAuthError(auth)) return withApiHeaders(auth)

  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return withApiHeaders(apiError('text is required and must be at least 10 characters'))
    }

    // Parse the email - returns ParsedLoad directly
    const parsed = await parseEmail(text)

    // Check if we got valid data (minimum: dimensions or weight)
    const hasValidData = parsed.length > 0 || parsed.width > 0 ||
                         parsed.height > 0 || parsed.weight > 0

    if (!hasValidData) {
      return withApiHeaders(apiSuccess({
        success: false,
        error: 'Could not extract valid load data from text',
        confidence: parsed.confidence,
        raw: text,
      }))
    }

    // Get truck recommendations
    const recommendations = selectTrucks(parsed)

    return withApiHeaders(apiSuccess({
      success: true,
      parsed,
      recommendations,
    }))
  } catch (error) {
    console.error('API v1 analyze error:', error)
    return withApiHeaders(apiError('Failed to analyze text', 500))
  }
}
