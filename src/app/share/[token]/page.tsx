'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  FileText,
  Download,
  Printer,
  Truck,
  Package,
  Mail,
  Phone,
  MapPin,
  Building,
  Clock,
  AlertTriangle,
  Loader2,
  CheckCircle,
  User,
  Lock,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  X,
  MessageSquare,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { generateQuotePDF } from '@/lib/pdf-generator'

interface SharedData {
  entityType: 'QUOTE' | 'LOAD'
  entity: any
  owner: {
    firstName: string | null
    lastName: string | null
    company: string | null
    email: string | null
    phone: string | null
  }
  permissions: {
    allowDownload: boolean
    allowPrint: boolean
  }
  expiresAt: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  line_haul: 'Line Haul',
  permit: 'Permits',
  escort: 'Escorts',
  fuel: 'Fuel',
  toll: 'Tolls',
  other: 'Other',
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<SharedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)

  // Response modal state
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [responseType, setResponseType] = useState<'accept' | 'decline' | null>(null)
  const [respondentName, setRespondentName] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')
  const [responseMessage, setResponseMessage] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)
  const [responseSuccess, setResponseSuccess] = useState<string | null>(null)
  const [responseError, setResponseError] = useState<string | null>(null)

  // Feedback form state
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [feedbackName, setFeedbackName] = useState('')
  const [feedbackEmail, setFeedbackEmail] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  useEffect(() => {
    fetchSharedData()
  }, [token])

  async function fetchSharedData(providedPassword?: string) {
    try {
      setLoading(true)
      const headers: HeadersInit = {}
      if (providedPassword) {
        headers['x-share-password'] = providedPassword
      }

      const response = await fetch(`/api/share/${token}`, { headers })
      const result = await response.json()

      if (response.ok) {
        setData(result)
        setRequiresPassword(false)
        setPasswordError(null)
      } else if (response.status === 401 && result.requiresPassword) {
        setRequiresPassword(true)
        if (providedPassword) {
          setPasswordError('Invalid password. Please try again.')
        }
      } else if (response.status === 404) {
        setError('This share link is invalid or has been removed.')
      } else if (response.status === 410) {
        const message = result.error || 'This share link has expired.'
        setError(message)
      } else if (response.status === 429) {
        setError('Too many requests. Please try again later.')
      } else {
        setError('Failed to load shared content.')
      }
    } catch (err) {
      setError('An error occurred while loading.')
    } finally {
      setLoading(false)
      setVerifying(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) {
      setPasswordError('Please enter a password')
      return
    }
    setVerifying(true)
    setPasswordError(null)
    await fetchSharedData(password)
  }

  async function trackAction(action: 'download' | 'print') {
    try {
      await fetch(`/api/share/${token}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
    } catch (error) {
      // Silently fail - don't block the user action
      console.error('Failed to track action:', error)
    }
  }

  function handleDownloadPDF() {
    if (!data || data.entityType !== 'QUOTE') return
    trackAction('download')
    generateQuotePDF(data.entity)
  }

  function handlePrint() {
    trackAction('print')
    window.print()
  }

  function openResponseModal(type: 'accept' | 'decline') {
    setResponseType(type)
    setShowResponseModal(true)
    setResponseError(null)
  }

  function closeResponseModal() {
    setShowResponseModal(false)
    setResponseType(null)
    setRespondentName('')
    setRespondentEmail('')
    setResponseMessage('')
    setResponseError(null)
  }

  async function submitResponse() {
    if (!responseType) return

    setSubmittingResponse(true)
    setResponseError(null)

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (password) {
        headers['x-share-password'] = password
      }

      const response = await fetch(`/api/share/${token}/respond`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          response: responseType,
          respondentName: respondentName || undefined,
          respondentEmail: respondentEmail || undefined,
          message: responseMessage || undefined,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setResponseSuccess(result.message)
        closeResponseModal()
        // Update the entity status in local state
        if (data) {
          setData({
            ...data,
            entity: {
              ...data.entity,
              status: result.newStatus,
              ...(responseType === 'accept' ? { acceptedAt: new Date().toISOString() } : { declinedAt: new Date().toISOString() }),
            },
          })
        }
      } else {
        setResponseError(result.error || 'Failed to submit response')
      }
    } catch (err) {
      setResponseError('An error occurred. Please try again.')
    } finally {
      setSubmittingResponse(false)
    }
  }

  async function submitFeedback() {
    if (!feedbackMessage.trim()) {
      setFeedbackError('Please enter a message')
      return
    }

    setSubmittingFeedback(true)
    setFeedbackError(null)

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (password) {
        headers['x-share-password'] = password
      }

      const response = await fetch(`/api/share/${token}/comment`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: feedbackMessage,
          authorName: feedbackName || undefined,
          authorEmail: feedbackEmail || undefined,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setFeedbackSuccess(true)
        setFeedbackMessage('')
        setShowFeedbackForm(false)
      } else {
        setFeedbackError(result.error || 'Failed to submit feedback')
      }
    } catch (err) {
      setFeedbackError('An error occurred. Please try again.')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  if (loading && !requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Loading shared content...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Load</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Password Protected</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              This content is protected. Please enter the password to continue.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className={passwordError ? 'border-red-500' : ''}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {passwordError && (
                  <p className="text-sm text-red-500">{passwordError}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Unlock Content'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const { entity, owner, permissions, expiresAt, entityType } = data

  // Check if quote can be responded to
  const canRespond = entityType === 'QUOTE' && !['ACCEPTED', 'DECLINED', 'EXPIRED'].includes(entity.status)

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header */}
      <header className="bg-white border-b print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold">Load Planner</span>
              <span className="text-xs text-muted-foreground block">Shared {entityType.toLowerCase()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {permissions.allowPrint && (
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            )}
            {permissions.allowDownload && entityType === 'QUOTE' && (
              <Button size="sm" onClick={handleDownloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Response Success Message */}
        {responseSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 print:hidden">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">{responseSuccess}</span>
          </div>
        )}

        {/* Expiration Warning */}
        {expiresAt && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 print:hidden">
            <Clock className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              This link expires on {formatDate(expiresAt)}
            </span>
          </div>
        )}

        {entityType === 'QUOTE' && <QuoteView entity={entity} owner={owner} />}
        {entityType === 'LOAD' && <LoadView entity={entity} owner={owner} />}

        {/* Accept/Decline Buttons for Quotes */}
        {canRespond && (
          <Card className="mt-6 print:hidden">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Ready to proceed?</h3>
                <p className="text-muted-foreground mb-4">
                  Accept this quote to confirm the shipment, or decline if you need changes.
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => openResponseModal('decline')}
                    className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    <ThumbsDown className="h-5 w-5" />
                    Decline Quote
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => openResponseModal('accept')}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <ThumbsUp className="h-5 w-5" />
                    Accept Quote
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback Section for Quotes */}
        {entityType === 'QUOTE' && (
          <Card className="mt-6 print:hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Questions or Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackSuccess ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-3" />
                  <p className="font-medium text-green-800">Thank you for your feedback!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    We've received your message and will respond soon.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setFeedbackSuccess(false)
                      setShowFeedbackForm(true)
                    }}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : showFeedbackForm ? (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="feedbackName">Your Name (optional)</Label>
                      <Input
                        id="feedbackName"
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        placeholder="Enter your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedbackEmail">Your Email (optional)</Label>
                      <Input
                        id="feedbackEmail"
                        type="email"
                        value={feedbackEmail}
                        onChange={(e) => setFeedbackEmail(e.target.value)}
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feedbackMessage">Message</Label>
                    <Textarea
                      id="feedbackMessage"
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Enter your question or feedback..."
                      rows={4}
                    />
                  </div>

                  {feedbackError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {feedbackError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowFeedbackForm(false)}
                      disabled={submittingFeedback}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={submitFeedback}
                      disabled={submittingFeedback || !feedbackMessage.trim()}
                      className="gap-2"
                    >
                      {submittingFeedback ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Have a question or want to provide feedback? We'd love to hear from you.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowFeedbackForm(true)}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Leave Feedback
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground print:mt-16">
          <p>Shared via Load Planner - AI-Powered Freight Solutions</p>
        </div>
      </main>

      {/* Response Modal */}
      {showResponseModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={closeResponseModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4"
                  onClick={closeResponseModal}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className={cn(
                  "mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2",
                  responseType === 'accept' ? "bg-green-100" : "bg-red-100"
                )}>
                  {responseType === 'accept' ? (
                    <ThumbsUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <ThumbsDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <CardTitle className="text-center">
                  {responseType === 'accept' ? 'Accept Quote' : 'Decline Quote'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="respondentName">Your Name (optional)</Label>
                  <Input
                    id="respondentName"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="respondentEmail">Your Email (optional)</Label>
                  <Input
                    id="respondentEmail"
                    type="email"
                    value={respondentEmail}
                    onChange={(e) => setRespondentEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responseMessage">
                    {responseType === 'accept' ? 'Additional Comments' : 'Reason for Declining'} (optional)
                  </Label>
                  <Textarea
                    id="responseMessage"
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder={responseType === 'accept'
                      ? "Any special instructions or comments..."
                      : "Please let us know what changes you'd like..."
                    }
                    rows={3}
                  />
                </div>

                {responseError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {responseError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={closeResponseModal}
                    disabled={submittingResponse}
                  >
                    Cancel
                  </Button>
                  <Button
                    className={cn(
                      "flex-1 gap-2",
                      responseType === 'accept'
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    )}
                    onClick={submitResponse}
                    disabled={submittingResponse}
                  >
                    {submittingResponse ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        {responseType === 'accept' ? 'Accept' : 'Decline'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function QuoteView({ entity, owner }: { entity: any; owner: any }) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="space-y-6">
      {/* Quote Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono">{entity.quoteNumber}</h1>
          <p className="text-muted-foreground">Created {formatDate(entity.createdAt)}</p>
        </div>
        <StatusBadge status={entity.status} />
      </div>

      {/* Owner & Customer Info */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* From */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">From</CardTitle>
          </CardHeader>
          <CardContent>
            {owner.company && (
              <p className="font-semibold text-lg">{owner.company}</p>
            )}
            {(owner.firstName || owner.lastName) && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                {[owner.firstName, owner.lastName].filter(Boolean).join(' ')}
              </p>
            )}
            {owner.email && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                {owner.email}
              </p>
            )}
            {owner.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {owner.phone}
              </p>
            )}
          </CardContent>
        </Card>

        {/* To */}
        {entity.customer && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">To</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{entity.customer.name}</p>
              {entity.customer.email && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {entity.customer.email}
                </p>
              )}
              {entity.customer.phone && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {entity.customer.phone}
                </p>
              )}
              {entity.customer.address && (
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  <span>
                    {entity.customer.address}
                    {entity.customer.city && (
                      <>, {entity.customer.city}</>
                    )}
                    {entity.customer.state && (
                      <>, {entity.customer.state}</>
                    )}
                    {entity.customer.zipCode && (
                      <> {entity.customer.zipCode}</>
                    )}
                  </span>
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Load Details */}
      {entity.load && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Load Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Route</p>
                <p className="font-medium">
                  {entity.load.origin} → {entity.load.destination}
                </p>
              </div>
              {entity.load.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{entity.load.description}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Dimensions (L×W×H)</p>
                <p className="font-medium">
                  {entity.load.length}' × {entity.load.width}' × {entity.load.height}'
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Weight</p>
                <p className="font-medium">
                  {entity.load.weight.toLocaleString()} lbs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-center">Qty</th>
                  <th className="pb-2 font-medium text-right">Unit Price</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {entity.lineItems.map((item: any) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-3">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </p>
                    </td>
                    <td className="py-3 text-center">{item.quantity}</td>
                    <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t">
                  <td colSpan={3} className="pt-4 text-right font-medium">Subtotal</td>
                  <td className="pt-4 text-right font-medium">{formatCurrency(entity.subtotal)}</td>
                </tr>
                {entity.taxAmount > 0 && (
                  <tr>
                    <td colSpan={3} className="py-1 text-right text-muted-foreground">
                      Tax ({entity.taxRate}%)
                    </td>
                    <td className="py-1 text-right text-muted-foreground">
                      {formatCurrency(entity.taxAmount)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="pt-2 text-right text-2xl font-bold">Total</td>
                  <td className="pt-2 text-right text-2xl font-bold">
                    {formatCurrency(entity.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Terms */}
      {(entity.notes || entity.terms) && (
        <Card>
          <CardHeader>
            <CardTitle>Notes & Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {entity.notes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                <p className="whitespace-pre-wrap">{entity.notes}</p>
              </div>
            )}
            {entity.terms && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Terms & Conditions</p>
                <p className="whitespace-pre-wrap text-sm">{entity.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Valid Until */}
      {entity.validUntil && (
        <div className="text-center text-muted-foreground">
          <p>This quote is valid until {formatDate(entity.validUntil)}</p>
        </div>
      )}
    </div>
  )
}

function LoadView({ entity, owner }: { entity: any; owner: any }) {
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="space-y-6">
      {/* Load Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-mono">{entity.loadNumber}</h1>
          <p className="text-muted-foreground">Created {formatDate(entity.createdAt)}</p>
        </div>
        <span className={cn(
          'px-3 py-1 rounded-full text-sm font-medium',
          entity.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
          entity.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
          entity.status === 'DISPATCHED' ? 'bg-purple-100 text-purple-700' :
          'bg-gray-100 text-gray-700'
        )}>
          {entity.status}
        </span>
      </div>

      {/* Route Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Route Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-lg">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Origin</p>
              <p className="font-semibold">{entity.origin}</p>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Destination</p>
              <p className="font-semibold">{entity.destination}</p>
            </div>
          </div>
          {entity.totalDistance && (
            <p className="mt-4 text-muted-foreground">
              Total Distance: {Math.round(entity.totalDistance)} miles
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cargo Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cargo Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Length</p>
              <p className="font-semibold">{entity.length} ft</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Width</p>
              <p className="font-semibold">{entity.width} ft</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Height</p>
              <p className="font-semibold">{entity.height} ft</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weight</p>
              <p className="font-semibold">{entity.weight.toLocaleString()} lbs</p>
            </div>
          </div>
          {entity.description && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{entity.description}</p>
            </div>
          )}
          {entity.trailerType && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">Trailer Type</p>
              <p className="font-medium capitalize">{entity.trailerType.replace('-', ' ')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      {entity.items && entity.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cargo Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entity.items.map((item: any, index: number) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.length}' × {item.width}' × {item.height}' - {item.weight.toLocaleString()} lbs
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact */}
      {owner && (
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            {owner.company && <p className="font-semibold">{owner.company}</p>}
            {(owner.firstName || owner.lastName) && (
              <p className="text-muted-foreground">
                {[owner.firstName, owner.lastName].filter(Boolean).join(' ')}
              </p>
            )}
            {owner.email && (
              <p className="flex items-center gap-2 text-muted-foreground mt-2">
                <Mail className="h-4 w-4" />
                {owner.email}
              </p>
            )}
            {owner.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {owner.phone}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
    SENT: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
    VIEWED: { label: 'Viewed', color: 'bg-purple-100 text-purple-700' },
    ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
    DECLINED: { label: 'Declined', color: 'bg-red-100 text-red-700' },
    EXPIRED: { label: 'Expired', color: 'bg-orange-100 text-orange-700' },
  }

  const { label, color } = config[status] || { label: status, color: 'bg-gray-100 text-gray-700' }

  return (
    <span className={cn('px-3 py-1 rounded-full text-sm font-medium', color)}>
      {label}
    </span>
  )
}
