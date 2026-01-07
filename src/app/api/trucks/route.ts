import { NextRequest, NextResponse } from 'next/server'
import { trucks, getTrucksByCategory, getCategories } from '@/data/trucks'
import { TruckType } from '@/types'

/**
 * GET /api/trucks
 *
 * Get all truck types or filter by category
 *
 * Query params:
 * - category: Filter by trailer category (FLATBED, STEP_DECK, RGN, etc.)
 *
 * Response:
 * {
 *   success: boolean
 *   trucks: TruckType[]
 *   categories: string[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let filteredTrucks: TruckType[] = trucks

    // Filter by category if provided
    if (category) {
      const upperCategory = category.toUpperCase() as TruckType['category']
      filteredTrucks = getTrucksByCategory(upperCategory)
    }

    return NextResponse.json({
      success: true,
      trucks: filteredTrucks,
      categories: getCategories(),
      total: filteredTrucks.length,
    })
  } catch (error) {
    console.error('Error fetching trucks:', error)
    return NextResponse.json(
      {
        success: false,
        trucks: [],
        categories: [],
        error: 'Failed to fetch trucks',
      },
      { status: 500 }
    )
  }
}
