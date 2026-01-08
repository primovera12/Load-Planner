'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Share2,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Lock,
  Zap,
  Eye,
  Download,
  Printer,
  Loader2,
  Search,
  Filter,
  FileText,
  Package,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareLink {
  id: string
  token: string
  entityType: 'QUOTE' | 'LOAD'
  entityId: string
  allowDownload: boolean
  allowPrint: boolean
  expiresAt: string | null
  viewCount: number
  downloadCount: number
  printCount: number
  createdAt: string
  hasPassword: boolean
  isOneTimeLink: boolean
  maxAccessCount: number | null
  _count: {
    accessLogs: number
  }
}

export default function SharesPage() {
  const [shares, setShares] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'QUOTE' | 'LOAD'>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchShares()
  }, [])

  async function fetchShares() {
    setLoading(true)
    try {
      const response = await fetch('/api/share')
      if (response.ok) {
        const data = await response.json()
        setShares(data)
      }
    } catch (error) {
      console.error('Error fetching shares:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteShare(id: string) {
    setDeleting(id)
    try {
      const response = await fetch(`/api/share?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        setShares(shares.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Error deleting share:', error)
    } finally {
      setDeleting(null)
    }
  }

  async function deleteExpired() {
    const expiredShares = shares.filter(s =>
      s.expiresAt && new Date(s.expiresAt) < new Date()
    )
    for (const share of expiredShares) {
      await deleteShare(share.id)
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  const isExpired = (share: ShareLink) =>
    share.expiresAt && new Date(share.expiresAt) < new Date()

  const isAccessLimitReached = (share: ShareLink) =>
    share.maxAccessCount !== null && share.viewCount >= share.maxAccessCount

  // Filter and search
  const filteredShares = shares.filter(share => {
    if (filter !== 'all' && share.entityType !== filter) return false
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        share.token.toLowerCase().includes(searchLower) ||
        share.entityType.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // Stats
  const totalViews = shares.reduce((sum, s) => sum + s.viewCount, 0)
  const totalDownloads = shares.reduce((sum, s) => sum + s.downloadCount, 0)
  const activeShares = shares.filter(s => !isExpired(s) && !isAccessLimitReached(s)).length
  const expiredCount = shares.filter(s => isExpired(s) || isAccessLimitReached(s)).length

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6" />
            Share Management
          </h1>
          <p className="text-muted-foreground">Manage all your shared links</p>
        </div>
        <Button onClick={fetchShares} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Share2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{shares.length}</p>
                <p className="text-xs text-muted-foreground">Total Links</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalViews}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Download className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDownloads}</p>
                <p className="text-xs text-muted-foreground">Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeShares}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search links..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'QUOTE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('QUOTE')}
            className="gap-1"
          >
            <FileText className="h-3 w-3" />
            Quotes
          </Button>
          <Button
            variant={filter === 'LOAD' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('LOAD')}
            className="gap-1"
          >
            <Package className="h-3 w-3" />
            Loads
          </Button>
        </div>
        {expiredCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={deleteExpired}
            className="gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
          >
            <Trash2 className="h-3 w-3" />
            Delete {expiredCount} Expired
          </Button>
        )}
      </div>

      {/* Share List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredShares.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Share2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No shared links</h3>
            <p className="text-muted-foreground">
              {search || filter !== 'all'
                ? 'No links match your search or filter'
                : 'Share a quote or load to see it here'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredShares.map((share) => {
            const expired = isExpired(share)
            const limitReached = isAccessLimitReached(share)
            const shareUrl = `${baseUrl}/share/${share.token}`

            return (
              <Card key={share.id} className={cn(
                (expired || limitReached) && "opacity-60"
              )}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        {share.entityType === 'QUOTE' ? (
                          <FileText className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Package className="h-4 w-4 text-green-600" />
                        )}
                        <span className="font-medium">{share.entityType}</span>
                        <span className="text-xs text-muted-foreground">
                          Created {formatDate(share.createdAt)}
                        </span>
                        {expired && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                            Expired
                          </span>
                        )}
                        {limitReached && !expired && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                            Limit Reached
                          </span>
                        )}
                      </div>

                      {/* URL */}
                      <div className="flex items-center gap-2 mb-2">
                        <Input
                          readOnly
                          value={shareUrl}
                          className="h-8 text-sm font-mono bg-muted flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(shareUrl)}
                        >
                          {copied === shareUrl ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(shareUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Stats and Badges */}
                      <div className="flex items-center flex-wrap gap-3">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="h-3 w-3" /> {share.viewCount} views
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Download className="h-3 w-3" /> {share.downloadCount}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Printer className="h-3 w-3" /> {share.printCount}
                        </span>
                        {share.expiresAt && !expired && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" /> Expires {formatDate(share.expiresAt)}
                          </span>
                        )}
                        {share.hasPassword && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                            <Lock className="h-3 w-3" /> Password
                          </span>
                        )}
                        {share.isOneTimeLink && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                            <Zap className="h-3 w-3" /> One-time
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteShare(share.id)}
                      disabled={deleting === share.id}
                    >
                      {deleting === share.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
