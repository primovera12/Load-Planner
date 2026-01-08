import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { generateApiKey, isValidScope, API_SCOPES, ApiScope } from '@/lib/api-key'

// GET /api/api-keys - List all API keys for current user
export async function GET() {
  try {
    const user = await requireAuth()

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        requestCount: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json(apiKeys)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

// POST /api/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const { name, scopes, rateLimit = 1000, expiresInDays } = body

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Validate scopes
    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json({ error: 'At least one scope is required' }, { status: 400 })
    }

    const invalidScopes = scopes.filter((s: string) => !isValidScope(s))
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Invalid scopes: ${invalidScopes.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate key
    const { key, hash, prefix } = generateApiKey()

    // Calculate expiration
    let expiresAt: Date | null = null
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }

    // Create API key
    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        key: hash,
        keyPrefix: prefix,
        scopes,
        rateLimit: Math.max(1, Math.min(10000, rateLimit)),
        expiresAt,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    // Return with the unhashed key (only time it's shown)
    return NextResponse.json(
      {
        ...apiKey,
        key, // The actual key - only shown once!
        message: 'API key created. Save this key securely - it will not be shown again.',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}

// DELETE /api/api-keys?id=xxx - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'API key ID required' }, { status: 400 })
    }

    // Verify ownership
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId: user.id },
    })

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    await prisma.apiKey.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting API key:', error)
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
  }
}

// PATCH /api/api-keys?id=xxx - Update an API key (toggle active, update name/scopes)
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'API key ID required' }, { status: 400 })
    }

    // Verify ownership
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, userId: user.id },
    })

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const updates: Record<string, unknown> = {}

    if ('name' in body && typeof body.name === 'string') {
      updates.name = body.name.trim()
    }

    if ('isActive' in body && typeof body.isActive === 'boolean') {
      updates.isActive = body.isActive
    }

    if ('scopes' in body && Array.isArray(body.scopes)) {
      const invalidScopes = body.scopes.filter((s: string) => !isValidScope(s))
      if (invalidScopes.length > 0) {
        return NextResponse.json(
          { error: `Invalid scopes: ${invalidScopes.join(', ')}` },
          { status: 400 }
        )
      }
      updates.scopes = body.scopes
    }

    if ('rateLimit' in body && typeof body.rateLimit === 'number') {
      updates.rateLimit = Math.max(1, Math.min(10000, body.rateLimit))
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating API key:', error)
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
  }
}
