import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

// GET /api/share/[token]/logs - Get access logs for a share (requires auth)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const user = await requireAuth()
    const { token } = await params

    // Find the share token and verify ownership
    const share = await prisma.shareToken.findUnique({
      where: { token },
      include: {
        accessLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50, // Limit to last 50 logs
        },
      },
    })

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    if (share.createdById !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Transform logs to not expose full IP addresses (show partial for privacy)
    const transformedLogs = share.accessLogs.map(log => ({
      id: log.id,
      action: log.action,
      ipAddress: log.ipAddress ? maskIP(log.ipAddress) : null,
      userAgent: log.userAgent ? parseUserAgent(log.userAgent) : null,
      country: log.country,
      city: log.city,
      createdAt: log.createdAt,
    }))

    return NextResponse.json({
      logs: transformedLogs,
      stats: {
        totalViews: share.viewCount,
        totalDownloads: share.downloadCount,
        totalPrints: share.printCount,
        lastViewedAt: share.lastViewedAt,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching access logs:', error)
    return NextResponse.json({ error: 'Failed to fetch access logs' }, { status: 500 })
  }
}

// Mask IP for privacy (e.g., "192.168.1.100" -> "192.168.x.x")
function maskIP(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.x.x`
  }
  // For IPv6, just show first segment
  if (ip.includes(':')) {
    return ip.split(':')[0] + ':...'
  }
  return ip
}

// Parse user agent to get browser/OS info
function parseUserAgent(ua: string): string {
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    return 'Chrome'
  } else if (ua.includes('Firefox')) {
    return 'Firefox'
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    return 'Safari'
  } else if (ua.includes('Edg')) {
    return 'Edge'
  } else if (ua.includes('MSIE') || ua.includes('Trident')) {
    return 'Internet Explorer'
  } else if (ua.includes('Mobile')) {
    return 'Mobile Browser'
  }
  return 'Unknown Browser'
}
