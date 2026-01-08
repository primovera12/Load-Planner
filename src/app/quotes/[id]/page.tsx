'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  FileText,
  Send,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Loader2,
  Mail,
  Building,
  Phone,
  MapPin,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateQuotePDF } from '@/lib/pdf-generator'
import { ShareDialog } from '@/components/share/share-dialog'

interface Quote {
  id: string
  quoteNumber: string
  status: string
  validUntil: string | null
  notes: string | null
  terms: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  createdAt: string
  sentAt: string | null
  acceptedAt: string | null
  declinedAt: string | null
  customer: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
  } | null
  load: {
    id: string
    loadNumber: string
    origin: string
    destination: string
    description: string | null
  } | null
  lineItems: Array<{
    id: string
    description: string
    category: string
    quantity: number
    unitPrice: number
    total: number
    notes: string | null
  }>
}

const STATUS_ACTIONS = {
  DRAFT: [
    { label: 'Mark as Sent', status: 'SENT', icon: Send },
  ],
  SENT: [
    { label: 'Mark as Accepted', status: 'ACCEPTED', icon: CheckCircle },
    { label: 'Mark as Declined', status: 'DECLINED', icon: XCircle },
  ],
  VIEWED: [
    { label: 'Mark as Accepted', status: 'ACCEPTED', icon: CheckCircle },
    { label: 'Mark as Declined', status: 'DECLINED', icon: XCircle },
  ],
}

const CATEGORY_LABELS: Record<string, string> = {
  line_haul: 'Line Haul',
  permit: 'Permits',
  escort: 'Escorts',
  fuel: 'Fuel',
  toll: 'Tolls',
  other: 'Other',
}

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchQuote()
  }, [id])

  async function fetchQuote() {
    try {
      const response = await fetch(`/api/quotes/${id}`)
      if (response.ok) {
        const data = await response.json()
        setQuote(data)
      } else if (response.status === 404) {
        router.push('/quotes')
      }
    } catch (error) {
      console.error('Error fetching quote:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(newStatus: string) {
    if (!quote) return
    setUpdating(true)
    try {
      const response = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        const updated = await response.json()
        setQuote(updated)
      }
    } catch (error) {
      console.error('Error updating quote:', error)
    } finally {
      setUpdating(false)
    }
  }

  async function deleteQuote() {
    if (!confirm('Are you sure you want to delete this quote?')) return

    try {
      const response = await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
      if (response.ok) {
        router.push('/quotes')
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
    }
  }

  function handleGeneratePDF() {
    if (!quote) return
    generateQuotePDF(quote)
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

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!quote) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-muted-foreground">Quote not found</p>
        <Link href="/quotes">
          <Button className="mt-4">Back to Quotes</Button>
        </Link>
      </div>
    )
  }

  const statusActions = STATUS_ACTIONS[quote.status as keyof typeof STATUS_ACTIONS] || []

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-mono">{quote.quoteNumber}</h1>
              <StatusBadge status={quote.status} />
            </div>
            <p className="text-muted-foreground">Created {formatDate(quote.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusActions.map(action => (
            <Button
              key={action.status}
              variant="outline"
              onClick={() => updateStatus(action.status)}
              disabled={updating}
              className="gap-2"
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
          <Button variant="outline" onClick={handleGeneratePDF} className="gap-2">
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <ShareDialog
            entityType="QUOTE"
            entityId={quote.id}
            entityName={quote.quoteNumber}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={deleteQuote}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Customer Info */}
        {quote.customer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-lg">{quote.customer.name}</p>
                  {quote.customer.email && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {quote.customer.email}
                    </p>
                  )}
                  {quote.customer.phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {quote.customer.phone}
                    </p>
                  )}
                </div>
                {(quote.customer.address || quote.customer.city) && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-1" />
                    <div>
                      {quote.customer.address && <p>{quote.customer.address}</p>}
                      {quote.customer.city && (
                        <p>
                          {quote.customer.city}
                          {quote.customer.state && `, ${quote.customer.state}`}
                          {quote.customer.zipCode && ` ${quote.customer.zipCode}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Load Info */}
        {quote.load && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Load Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm text-muted-foreground mb-1">
                {quote.load.loadNumber}
              </p>
              <p className="font-medium">
                {quote.load.origin} → {quote.load.destination}
              </p>
              {quote.load.description && (
                <p className="text-muted-foreground mt-1">{quote.load.description}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
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
                  {quote.lineItems.map(item => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {CATEGORY_LABELS[item.category] || item.category}
                          {item.notes && ` - ${item.notes}`}
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
                    <td className="pt-4 text-right font-medium">{formatCurrency(quote.subtotal)}</td>
                  </tr>
                  {quote.taxAmount > 0 && (
                    <tr>
                      <td colSpan={3} className="py-1 text-right text-muted-foreground">
                        Tax ({quote.taxRate}%)
                      </td>
                      <td className="py-1 text-right text-muted-foreground">
                        {formatCurrency(quote.taxAmount)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="pt-2 text-right text-xl font-bold">Total</td>
                    <td className="pt-2 text-right text-xl font-bold">
                      {formatCurrency(quote.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Notes & Terms */}
        {(quote.notes || quote.terms) && (
          <Card>
            <CardHeader>
              <CardTitle>Notes & Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
              {quote.terms && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Terms & Conditions</p>
                  <p className="whitespace-pre-wrap text-sm">{quote.terms}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <TimelineItem
                icon={FileText}
                label="Created"
                date={quote.createdAt}
              />
              {quote.sentAt && (
                <TimelineItem
                  icon={Send}
                  label="Sent to customer"
                  date={quote.sentAt}
                />
              )}
              {quote.acceptedAt && (
                <TimelineItem
                  icon={CheckCircle}
                  label="Accepted"
                  date={quote.acceptedAt}
                  highlight="text-green-500"
                />
              )}
              {quote.declinedAt && (
                <TimelineItem
                  icon={XCircle}
                  label="Declined"
                  date={quote.declinedAt}
                  highlight="text-red-500"
                />
              )}
              {quote.validUntil && (
                <TimelineItem
                  icon={Clock}
                  label={new Date(quote.validUntil) < new Date() ? 'Expired' : 'Expires'}
                  date={quote.validUntil}
                  highlight={new Date(quote.validUntil) < new Date() ? 'text-orange-500' : undefined}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
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
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', color)}>
      {label}
    </span>
  )
}

function TimelineItem({
  icon: Icon,
  label,
  date,
  highlight,
}: {
  icon: any
  label: string
  date: string
  highlight?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('p-2 rounded-full bg-muted', highlight)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}
