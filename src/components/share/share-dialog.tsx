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
  Activity,
  Globe,
  RefreshCw,
  Mail,
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
  autoExtend: boolean
  extendDays: number
}

interface AccessLog {
  id: string
  action: string
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface AccessStats {
  totalViews: number
  totalDownloads: number
  totalPrints: number
  lastViewedAt: string | null
}

// Share presets/templates
const SHARE_TEMPLATES = {
  standard: {
    name: 'Standard',
    description: 'Full access for 30 days',
    allowDownload: true,
    allowPrint: true,
    expiresInDays: '30',
    password: '',
    isOneTimeLink: false,
    autoExtend: false,
    extendDays: '7',
  },
  secure: {
    name: 'Secure',
    description: 'Password protected, 7 days',
    allowDownload: true,
    allowPrint: false,
    expiresInDays: '7',
    password: '', // User will set password
    isOneTimeLink: false,
    autoExtend: false,
    extendDays: '7',
    requiresPassword: true,
  },
  viewOnly: {
    name: 'View Only',
    description: 'No download or print',
    allowDownload: false,
    allowPrint: false,
    expiresInDays: '14',
    password: '',
    isOneTimeLink: false,
    autoExtend: true,
    extendDays: '7',
  },
  oneTime: {
    name: 'One-Time',
    description: 'Self-destructs after viewing',
    allowDownload: true,
    allowPrint: true,
    expiresInDays: '',
    password: '',
    isOneTimeLink: true,
    autoExtend: false,
    extendDays: '7',
  },
}

export function ShareDialog({ entityType, entityId, entityName, onClose }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [showEmbed, setShowEmbed] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState<string | null>(null)
  const [showEmail, setShowEmail] = useState<string | null>(null)
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([])
  const [accessStats, setAccessStats] = useState<AccessStats | null>(null)
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Settings for new share link
  const [allowDownload, setAllowDownload] = useState(true)
  const [allowPrint, setAllowPrint] = useState(true)
  const [expiresInDays, setExpiresInDays] = useState('')
  const [password, setPassword] = useState('')
  const [isOneTimeLink, setIsOneTimeLink] = useState(false)
  const [autoExtend, setAutoExtend] = useState(false)
  const [extendDays, setExtendDays] = useState('7')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showPasswordInput, setShowPasswordInput] = useState(false)

  function applyTemplate(templateKey: keyof typeof SHARE_TEMPLATES) {
    const template = SHARE_TEMPLATES[templateKey]
    setAllowDownload(template.allowDownload)
    setAllowPrint(template.allowPrint)
    setExpiresInDays(template.expiresInDays)
    setPassword(template.password)
    setIsOneTimeLink(template.isOneTimeLink)
    setAutoExtend(template.autoExtend)
    setExtendDays(template.extendDays)
    setSelectedTemplate(templateKey)
    setShowPasswordInput('requiresPassword' in template && template.requiresPassword)
  }

  function resetForm() {
    setAllowDownload(true)
    setAllowPrint(true)
    setExpiresInDays('')
    setPassword('')
    setIsOneTimeLink(false)
    setAutoExtend(false)
    setExtendDays('7')
    setSelectedTemplate(null)
    setShowPasswordInput(false)
  }

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
          autoExtend: expiresInDays ? autoExtend : false,
          extendDays: parseInt(extendDays) || 7,
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

  async function fetchAccessLogs(token: string) {
    if (showLogs === token) {
      setShowLogs(null)
      return
    }
    setShowLogs(token)
    setLoadingLogs(true)
    try {
      const response = await fetch(`/api/share/${token}/logs`)
      if (response.ok) {
        const data = await response.json()
        setAccessLogs(data.logs)
        setAccessStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching access logs:', error)
    } finally {
      setLoadingLogs(false)
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

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateStr)
  }

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })

  function generateEmailTemplate(link: ShareLink) {
    const subject = `${entityType === 'QUOTE' ? 'Quote' : 'Load Details'}: ${entityName}`
    const expiresText = link.expiresAt
      ? `\n\nThis link will expire on ${formatDate(link.expiresAt)}.`
      : ''
    const passwordText = link.hasPassword
      ? '\n\nNote: This link is password protected. I will send the password separately.'
      : ''
    const actionsText = []
    if (link.allowDownload) actionsText.push('download')
    if (link.allowPrint) actionsText.push('print')
    const actionsLine = actionsText.length > 0
      ? `\n\nYou can view${actionsText.length > 0 ? `, ${actionsText.join(' and ')}` : ''} the ${entityType.toLowerCase()} using this link.`
      : ''

    const body = `Hello,

Please find the ${entityType.toLowerCase()} details at the link below:

${link.shareUrl}${actionsLine}${expiresText}${passwordText}

Best regards`

    return { subject, body }
  }

  function copyEmailTemplate(link: ShareLink) {
    const { body } = generateEmailTemplate(link)
    copyToClipboard(body)
  }

  function openEmailClient(link: ShareLink) {
    const { subject, body } = generateEmailTemplate(link)
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoLink, '_blank')
  }

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
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Create Share Link</h3>
                    {selectedTemplate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetForm}
                        className="text-xs text-muted-foreground h-6"
                      >
                        Reset
                      </Button>
                    )}
                  </div>

                  {/* Quick Templates */}
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-2">Quick presets:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(Object.keys(SHARE_TEMPLATES) as Array<keyof typeof SHARE_TEMPLATES>).map((key) => {
                        const template = SHARE_TEMPLATES[key]
                        return (
                          <button
                            key={key}
                            onClick={() => applyTemplate(key)}
                            className={cn(
                              "flex flex-col items-center p-2 rounded-lg border text-xs transition-colors",
                              selectedTemplate === key
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            <span className="font-medium">{template.name}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {template.description.split(',')[0]}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

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

                    {/* Auto-Extend (only show if expiration is set) */}
                    {expiresInDays && (
                      <div className="ml-6 pl-4 border-l-2 border-gray-200 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoExtend}
                            onChange={(e) => setAutoExtend(e.target.checked)}
                            className="rounded"
                          />
                          <RefreshCw className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Auto-extend when viewed</span>
                        </label>
                        {autoExtend && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground ml-6">Extend by</span>
                            <Input
                              type="number"
                              value={extendDays}
                              onChange={(e) => setExtendDays(e.target.value)}
                              className="w-16 h-7 text-sm"
                              min="1"
                            />
                            <span className="text-muted-foreground">days on each view</span>
                          </div>
                        )}
                      </div>
                    )}

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
                                className={cn("h-7 w-7", showEmail === link.id && "bg-blue-100")}
                                onClick={() => setShowEmail(showEmail === link.id ? null : link.id)}
                                title="Email Template"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-7 w-7", showLogs === link.token && "bg-blue-100")}
                                onClick={() => fetchAccessLogs(link.token)}
                                title="View Access History"
                              >
                                <Activity className="h-4 w-4" />
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

                          {/* Email Template */}
                          {showEmail === link.id && (
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium">Email Template</p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => copyEmailTemplate(link)}
                                  >
                                    {copied?.includes('Hello') ? (
                                      <Check className="h-3 w-3" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                    Copy
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => openEmailClient(link)}
                                  >
                                    <Mail className="h-3 w-3" />
                                    Open Email
                                  </Button>
                                </div>
                              </div>
                              <textarea
                                readOnly
                                className="w-full h-32 p-2 text-xs bg-white border rounded resize-none"
                                value={generateEmailTemplate(link).body}
                              />
                              <p className="text-xs text-muted-foreground mt-2">
                                Copy this template or open in your email client
                              </p>
                            </div>
                          )}

                          {/* Access Logs */}
                          {showLogs === link.token && (
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium">Access History</p>
                                {accessStats && (
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Eye className="h-3 w-3" /> {accessStats.totalViews}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Download className="h-3 w-3" /> {accessStats.totalDownloads}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Printer className="h-3 w-3" /> {accessStats.totalPrints}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {loadingLogs ? (
                                <div className="flex justify-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                              ) : accessLogs.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {accessLogs.map((log) => (
                                    <div key={log.id} className="flex items-center justify-between text-xs bg-white rounded p-2">
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded text-[10px] font-medium",
                                          log.action === 'view' && "bg-blue-100 text-blue-700",
                                          log.action === 'download' && "bg-green-100 text-green-700",
                                          log.action === 'print' && "bg-purple-100 text-purple-700"
                                        )}>
                                          {log.action}
                                        </span>
                                        {log.ipAddress && (
                                          <span className="flex items-center gap-1 text-muted-foreground">
                                            <Globe className="h-3 w-3" />
                                            {log.ipAddress}
                                          </span>
                                        )}
                                        {log.userAgent && (
                                          <span className="text-muted-foreground">
                                            {log.userAgent}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-muted-foreground">
                                        {formatRelativeTime(log.createdAt)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-4">
                                  No access logs yet
                                </p>
                              )}
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
                            {link.autoExtend && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                <RefreshCw className="h-3 w-3" /> Auto-extend ({link.extendDays}d)
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
