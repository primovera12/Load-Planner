import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

// Simple in-memory store for load plans (replace with database in production)
// This is a temporary solution - in production, use database storage
const loadPlanStore = new Map<string, { data: unknown; createdAt: Date; expiresAt: Date }>()

// Clean up expired entries periodically
function cleanupExpired() {
  const now = new Date()
  for (const [token, entry] of loadPlanStore.entries()) {
    if (entry.expiresAt < now) {
      loadPlanStore.delete(token)
    }
  }
}

// POST - Create a new share link
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Accept either { items, loadPlan } format from load-planner page
    // or legacy { items, placements, trailers } format
    const items = data.items || (data.loadPlan?.loads?.flatMap((l: { items: unknown[] }) => l.items) || [])

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid load plan data' },
        { status: 400 }
      )
    }

    // Generate unique token
    const token = randomBytes(16).toString('hex')

    // Store the plan (expires in 30 days)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Store full loadPlan if provided (new format from load-planner page)
    const loadPlanData = data.loadPlan ? {
      loadPlan: data.loadPlan,
      items: data.items,
    } : {
      items: data.items,
      placements: data.placements || [],
      trailers: data.trailers || [],
      origin: data.origin || '',
      destination: data.destination || '',
      description: data.description || '',
      instructions: data.instructions || [],
    }

    loadPlanStore.set(token, {
      data: loadPlanData,
      createdAt: now,
      expiresAt,
    })

    // Clean up old entries
    cleanupExpired()

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('Share link creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    )
  }
}

// Export the store for the [token] route to access
export { loadPlanStore }
