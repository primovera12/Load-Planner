import { NextRequest, NextResponse } from 'next/server'
import { getDieselPricesForStates } from '@/lib/external-data/fuel-prices'
import { calculateCompleteCostEstimate, recommendEquipmentType } from '@/lib/external-data/rate-estimates'
import { StatePermitInfo } from '@/types/route-planning'

interface RequestBody {
  distance: number
  states: string[]
  cargo: {
    width: number
    height: number
    length: number
    grossWeight: number
  }
  permits?: StatePermitInfo[]
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()
    const { distance, states, cargo, permits = [] } = body

    if (!distance || distance <= 0) {
      return NextResponse.json(
        { error: 'Invalid distance' },
        { status: 400 }
      )
    }

    if (!cargo) {
      return NextResponse.json(
        { error: 'Cargo specifications required' },
        { status: 400 }
      )
    }

    // Get fuel prices for states in route
    const fuelPrices = await getDieselPricesForStates(states)

    // Determine equipment type
    const equipmentType = recommendEquipmentType(cargo)

    // Get origin and destination states
    const originState = states.length > 0 ? states[0] : undefined
    const destState = states.length > 1 ? states[states.length - 1] : originState

    // Calculate complete cost estimate
    const costEstimate = calculateCompleteCostEstimate(
      distance,
      cargo,
      fuelPrices,
      permits,
      {
        equipmentType,
        originState,
        destState,
        currentDieselPrice:
          fuelPrices.length > 0
            ? fuelPrices.reduce((sum, fp) => sum + fp.dieselPrice, 0) / fuelPrices.length
            : undefined,
      }
    )

    return NextResponse.json(costEstimate)
  } catch (error) {
    console.error('Cost estimate API error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to calculate cost estimate: ${errorMessage}` },
      { status: 500 }
    )
  }
}
