'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Share2,
  Link,
  Copy,
  Check,
  QrCode,
  X,
  Loader2,
  Calendar,
  Download,
  Printer,
  Trash2,
  ExternalLink,
  Code,
  Lock,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShareDialogProps {
  entityType: 'QUOTE' | 'LOAD'
  entityId: string
  entityName: string
  onClose?: () => void
}

interface ShareLink {
  id: string
  token: string
  shareUrl: string
  allowDownload: boolean
  allowPrint: boolean
  expiresAt: string | null
  viewCount: number
  createdAt: string
  hasPassword: boolean
  isOneTimeLink: boolean
  maxAccessCount: number | null
}

export function ShareDialog({ entityType, entityId, entityName, onClose }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [showEmbed, setShowEmbed] = useState<string | null>(null)

  // Settings for new share link
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPrint, setAllowPrint] = useState(true)
  const [expiresInDays, setExpiresInDays] = useState('')
  const [password, setPassword] = useState('')
  const [isOneTimeLink, setIsOneTimeLink] = useState(false)

  async function openDialog() {
    setIsOpen(true)
    setLoading(true)
    try {
      const response = await fetch(`/api/share?entityType=${entityType}&entityId=${entityId}`)
      if (response.ok) {
        const links = await response.json()
        setShareLinks(links)
      }
    } catch (error) {
      console.error('Error fetching share links:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createShareLink() {
    setCreating(true)
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          allowDownload,
          allowPrint,
          expiresInDays: expiresInDays || undefined,
          password: password || undefined,
          isOneTimeLink,
        }),
      })

      if (response.ok) {
        const newLink = await response.json()
        setShareLinks([newLink, ...shareLinks])
        // Copy to clipboard automatically
        await copyToClipboard(newLink.shareUrl)
        // Reset form
        setPassword('')
        setIsOneTimeLink(false)
      }
    } catch (error) {
      console.error('Error creating share link:', error)
    } finally {
      setCreating(false)
    }
  }

  async function deleteShareLink(id: string) {
    try {
      const response = await fetch(`/api/share?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        setShareLinks(shareLinks.filter(link => link.id !== id))
      }
    } catch (error) {
      console.error('Error deleting share link:', error)
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

  function closeDialog() {
    setIsOpen(false)
    onClose?.()
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={openDialog} className="gap-2">
        <Share2 className="h-4 w-4" />
        Share
      </Button>
    )
  }

  return (
    <>
      <Button variant="outline" onClick={openDialog} className="gap-2">
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      {/* Modal Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={closeDialog} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-lg font-semibold">Share {entityType.toLowerCase()}</h2>
              <p className="text-sm text-muted-foreground">{entityName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={closeDialog}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Create New Link */}
                <div className="border rounded-lg p-4 mb-4">
                  <h3 className="font-medium mb-3">Create Share Link</h3>
                  <div className="space-y-3">
                    {/* Permissions */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowDownload}
                          onChange={(e) => setAllowDownload(e.target.checked)}
                          className="rounded"
                        />
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Allow download</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowPrint}
                          onChange={(e) => setAllowPrint(e.target.checked)}
                          className="rounded"
                        />
                        <Printer className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Allow print</span>
                      </label>
                    </div>

                    {/* Expiration */}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm">Expires in</Label>
                      <Input
                        type="number"
                        placeholder="Never"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(e.target.value)}
                        className="w-20 h-8"
                        min="1"
                      />
                      <span className="text-sm text-muted-foreground">days</span>
                    </div>

                    {/* Security Options */}
                    <div className="border-t pt-3 space-y-3">
                      <p className="text-xs text-muted-foreground font-medium">Security Options</p>

                      {/* Password Protection */}
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm">Password</Label>
                        <Input
                          type="password"
                          placeholder="Optional"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="flex-1 h-8"
                        />
                      </div>

                      {/* One-Time Link */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isOneTimeLink}
                          onChange={(e) => setIsOneTimeLink(e.target.checked)}
                          className="rounded"
                        />
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">One-time link</span>
                        <span className="text-xs text-muted-foreground">(auto-deletes after viewing)</span>
                      </label>
                    </div>

                    <Button onClick={createShareLink} disabled={creating} className="w-full gap-2">
                      {creating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link className="h-4 w-4" />
                      )}
                      {creating ? 'Creating...' : 'Create Link'}
                    </Button>
                  </div>
                </div>

                {/* Existing Links */}
                {shareLinks.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Active Links ({shareLinks.length})</h3>
                    <div className="space-y-3">
                      {shareLinks.map((link) => (
                        <div key={link.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Created {formatDate(link.createdAt)}</span>
                              <span>•</span>
                              <span>{link.viewCount} views</span>
                              {link.expiresAt && (
                                <>
                                  <span>•</span>
                                  <span>Expires {formatDate(link.expiresAt)}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setShowQR(showQR === link.id ? null : link.id)}
                                title="Show QR Code"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setShowEmbed(showEmbed === link.id ? null : link.id)}
                                title="Get Embed Code"
                              >
                                <Code className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => window.open(link.shareUrl, '_blank')}
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => deleteShareLink(link.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              readOnly
                              value={link.shareUrl}
                              className="h-8 text-sm font-mono bg-muted"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              onClick={() => copyToClipboard(link.shareUrl)}
                            >
                              {copied === link.shareUrl ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>

                          {/* QR Code */}
                          {showQR === link.id && (
                            <div className="mt-3 p-4 bg-white border rounded-lg flex flex-col items-center">
                              <QRCodeSVG
                                value={link.shareUrl}
                                size={150}
                                level="M"
                                includeMargin
                              />
                              <p className="text-xs text-muted-foreground mt-2">
                                Scan to view
                              </p>
                            </div>
                          )}

                          {/* Embed Code */}
                          {showEmbed === link.id && (
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <p className="text-xs font-medium mb-2">Embed Code</p>
                              <div className="relative">
                                <textarea
                                  readOnly
                                  className="w-full h-20 p-2 text-xs font-mono bg-white border rounded resize-none"
                                  value={`<iframe src="${link.shareUrl.replace('/share/', '/embed/')}" width="400" height="300" frameborder="0" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></iframe>`}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="absolute top-2 right-2"
                                  onClick={() => copyToClipboard(
                                    `<iframe src="${link.shareUrl.replace('/share/', '/embed/')}" width="400" height="300" frameborder="0" style="border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></iframe>`
                                  )}
                                >
                                  {copied?.includes('iframe') ? (
                                    <Check className="h-3 w-3" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Paste this code into your website HTML
                              </p>
                            </div>
                          )}

                          {/* Permissions & Security Badges */}
                          <div className="flex items-center flex-wrap gap-2 mt-2">
                            {link.hasPassword && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                <Lock className="h-3 w-3" /> Password
                              </span>
                            )}
                            {link.isOneTimeLink && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                <Zap className="h-3 w-3" /> One-time
                              </span>
                            )}
                            {link.allowDownload && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Download className="h-3 w-3" /> Download
                              </span>
                            )}
                            {link.allowPrint && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Printer className="h-3 w-3" /> Print
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {shareLinks.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No share links created yet
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
