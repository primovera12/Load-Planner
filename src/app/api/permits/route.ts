/**
 * Permits API Route
 *
 * Calculate permit requirements for a route
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateRoutePermits, calculateStatePermit } from '@/lib/permit-calculator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      states,
      width,
      height,
      length,
      grossWeight,
      stateDistances
    } = body

    // Validate required fields
    if (!states || !Array.isArray(states) || states.length === 0) {
      return NextResponse.json(
        { error: 'States array is required' },
        { status: 400 }
      )
    }

    if (!width || !height || !length || !grossWeight) {
      return NextResponse.json(
        { error: 'Cargo dimensions (width, height, length) and grossWeight are required' },
        { status: 400 }
      )
    }

    const cargo = {
      width: parseFloat(width),
      height: parseFloat(height),
      length: parseFloat(length),
      grossWeight: parseFloat(grossWeight)
    }

    const summary = calculateRoutePermits(states, cargo, stateDistances)

    return NextResponse.json({
      success: true,
      data: summary
    })
  } catch (error) {
    console.error('Permit calculation error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate permits' },
      { status: 500 }
    )
  }
}

// Get permit info for a single state
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const width = searchParams.get('width')
    const height = searchParams.get('height')
    const length = searchParams.get('length')
    const grossWeight = searchParams.get('grossWeight')

    if (!state) {
      return NextResponse.json(
        { error: 'State code is required' },
        { status: 400 }
      )
    }

    // If dimensions provided, calculate requirements
    if (width && height && length && grossWeight) {
      const cargo = {
        width: parseFloat(width),
        height: parseFloat(height),
        length: parseFloat(length),
        grossWeight: parseFloat(grossWeight)
      }

      const permit = calculateStatePermit(state, cargo)

      if (!permit) {
        return NextResponse.json(
          { error: 'State not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: permit
      })
    }

    // Otherwise return state info
    const { getStateByCode } = await import('@/data/state-permits')
    const stateData = getStateByCode(state)

    if (!stateData) {
      return NextResponse.json(
        { error: 'State not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: stateData
    })
  } catch (error) {
    console.error('Permit lookup error:', error)
    return NextResponse.json(
      { error: 'Failed to lookup permit info' },
      { status: 500 }
    )
  }
}
