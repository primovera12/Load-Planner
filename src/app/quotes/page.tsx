'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Plus,
  Search,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  Trash2,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Quote {
  id: string
  quoteNumber: string
  status: string
  validUntil: string | null
  total: number
  createdAt: string
  customer: {
    id: string
    name: string
    email: string | null
  } | null
  lineItems: Array<{
    id: string
    description: string
    total: number
  }>
}

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', icon: FileText, color: 'text-gray-500 bg-gray-100' },
  SENT: { label: 'Sent', icon: Send, color: 'text-blue-500 bg-blue-100' },
  VIEWED: { label: 'Viewed', icon: Eye, color: 'text-purple-500 bg-purple-100' },
  ACCEPTED: { label: 'Accepted', icon: CheckCircle, color: 'text-green-500 bg-green-100' },
  DECLINED: { label: 'Declined', icon: XCircle, color: 'text-red-500 bg-red-100' },
  EXPIRED: { label: 'Expired', icon: Clock, color: 'text-orange-500 bg-orange-100' },
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchQuotes()
  }, [statusFilter])

  async function fetchQuotes() {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/quotes?${params}`)
      if (response.ok) {
        const data = await response.json()
        setQuotes(data)
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteQuote(id: string) {
    if (!confirm('Are you sure you want to delete this quote?')) return

    try {
      const response = await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setQuotes(quotes.filter(q => q.id !== id))
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
    }
  }

  const filteredQuotes = quotes.filter(quote => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      quote.quoteNumber.toLowerCase().includes(search) ||
      quote.customer?.name.toLowerCase().includes(search) ||
      quote.customer?.email?.toLowerCase().includes(search)
    )
  })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground">Manage and track your freight quotes</p>
        </div>
        <Link href="/quotes/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Quote
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by quote number or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('')}
          >
            All
          </Button>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <Button
              key={key}
              variant={statusFilter === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(key)}
              className="gap-1"
            >
              <config.icon className="h-3 w-3" />
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No quotes found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter
                ? 'Try adjusting your search or filter'
                : 'Create your first quote to get started'}
            </p>
            {!searchTerm && !statusFilter && (
              <Link href="/quotes/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Quote
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredQuotes.map(quote => {
            const statusConfig = STATUS_CONFIG[quote.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.DRAFT
            const StatusIcon = statusConfig.icon

            return (
              <Card key={quote.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-semibold text-lg">
                          {quote.quoteNumber}
                        </span>
                        <span className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          statusConfig.color
                        )}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig.label}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground mb-3">
                        {quote.customer ? (
                          <span>
                            <span className="font-medium text-foreground">
                              {quote.customer.name}
                            </span>
                            {quote.customer.email && (
                              <span> - {quote.customer.email}</span>
                            )}
                          </span>
                        ) : (
                          <span className="italic">No customer assigned</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Created {formatDate(quote.createdAt)}</span>
                        {quote.validUntil && (
                          <span>
                            Valid until {formatDate(quote.validUntil)}
                          </span>
                        )}
                        <span>{quote.lineItems.length} line items</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {formatCurrency(quote.total)}
                        </p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteQuote(quote.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link href={`/quotes/${quote.id}`}>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="mt-8 text-center text-sm text-muted-foreground">
        {filteredQuotes.length} quote{filteredQuotes.length !== 1 ? 's' : ''} total
      </div>
    </div>
  )
}
