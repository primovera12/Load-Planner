import { NextRequest, NextResponse } from 'next/server'
import { loadPlanStore } from '../route'

// GET - Retrieve a shared load plan
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const entry = loadPlanStore.get(token)

    if (!entry) {
      return NextResponse.json(
        { error: 'Load plan not found or expired' },
        { status: 404 }
      )
    }

    // Check expiration
    if (entry.expiresAt < new Date()) {
      loadPlanStore.delete(token)
      return NextResponse.json(
        { error: 'Load plan has expired' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      success: true,
      data: entry.data,
      createdAt: entry.createdAt.toISOString(),
      expiresAt: entry.expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Share link retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve load plan' },
      { status: 500 }
    )
  }
}
