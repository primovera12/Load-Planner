'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  ScanSearch,
  Truck,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Package,
  DollarSign,
  Route,
  Users,
  Send,
  Eye,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardStats {
  customersCount: number
  quotesCount: number
  loadsCount: number
  pendingQuotes: number
  acceptedQuotes: number
  totalQuoteValue: number
}

interface RecentQuote {
  id: string
  quoteNumber: string
  status: string
  total: number
  createdAt: string
  customer: { name: string } | null
}

interface RecentLoad {
  id: string
  loadNumber: string
  status: string
  origin: string
  destination: string
  createdAt: string
}

const quickActions = [
  {
    title: 'Analyze Load',
    description: 'Parse freight email and get truck recommendations',
    href: '/analyze',
    icon: ScanSearch,
    color: 'bg-blue-500',
  },
  {
    title: 'View Trucks',
    description: 'Browse all 10 trailer types with specifications',
    href: '/trucks',
    icon: Truck,
    color: 'bg-green-500',
  },
  {
    title: 'Route Planner',
    description: 'Calculate routes and permit costs',
    href: '/routes',
    icon: Route,
    color: 'bg-purple-500',
  },
  {
    title: 'Create Quote',
    description: 'Generate professional freight quotes',
    href: '/quotes/new',
    icon: FileText,
    color: 'bg-orange-500',
  },
]

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    customersCount: 0,
    quotesCount: 0,
    loadsCount: 0,
    pendingQuotes: 0,
    acceptedQuotes: 0,
    totalQuoteValue: 0,
  })
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([])
  const [recentLoads, setRecentLoads] = useState<RecentLoad[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const [quotesRes, customersRes, loadsRes] = await Promise.all([
        fetch('/api/quotes').catch(() => null),
        fetch('/api/customers').catch(() => null),
        fetch('/api/loads').catch(() => null),
      ])

      const quotes = quotesRes?.ok ? await quotesRes.json() : []
      const customers = customersRes?.ok ? await customersRes.json() : []
      const loads = loadsRes?.ok ? await loadsRes.json() : []

      const pendingQuotes = quotes.filter((q: any) =>
        ['DRAFT', 'SENT', 'VIEWED'].includes(q.status)
      ).length
      const acceptedQuotes = quotes.filter((q: any) => q.status === 'ACCEPTED').length
      const totalQuoteValue = quotes.reduce((sum: number, q: any) => sum + (q.total || 0), 0)

      setStats({
        customersCount: customers.length,
        quotesCount: quotes.length,
        loadsCount: loads.length,
        pendingQuotes,
        acceptedQuotes,
        totalQuoteValue,
      })

      setRecentQuotes(quotes.slice(0, 5))
      setRecentLoads(loads.slice(0, 5))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'SENT':
        return <Send className="h-4 w-4 text-blue-500" />
      case 'VIEWED':
        return <Eye className="h-4 w-4 text-purple-500" />
      default:
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Welcome to Load Planner - your AI-powered freight optimization tool
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.customersCount}</div>
                  <p className="text-xs text-muted-foreground">Active customers</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quotes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.quotesCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingQuotes} pending, {stats.acceptedQuotes} accepted
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loads</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.loadsCount}</div>
                  <p className="text-xs text-muted-foreground">Total loads tracked</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quote Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalQuoteValue)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total quote value</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.title} href={action.href}>
                    <Card className="h-full transition-all hover:shadow-md hover:border-primary/50">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${action.color}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{action.title}</CardTitle>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{action.description}</CardDescription>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent Quotes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Quotes</h2>
              <Link href="/quotes" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentQuotes.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No quotes yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create your first quote
                    </p>
                    <Link href="/quotes/new">
                      <Button variant="outline" size="sm" className="mt-4">
                        <FileText className="mr-2 h-4 w-4" />
                        New Quote
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentQuotes.map((quote) => (
                      <Link
                        key={quote.id}
                        href={`/quotes/${quote.id}`}
                        className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                      >
                        {getStatusIcon(quote.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {quote.quoteNumber}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {quote.customer?.name || 'No customer'} - {formatDate(quote.createdAt)}
                          </p>
                        </div>
                        <span className="text-sm font-medium">
                          {formatCurrency(quote.total)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Loads */}
        {recentLoads.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Loads</h2>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="divide-y">
                  {recentLoads.map((load) => (
                    <div key={load.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm">{load.loadNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {load.origin} → {load.destination}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            'text-xs px-2 py-1 rounded-full',
                            load.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                            load.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {load.status}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(load.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feature Overview */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Platform Features</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 mb-2">
                  <ScanSearch className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-base">AI Email Parsing</CardTitle>
                <CardDescription>
                  Automatically extract cargo dimensions, weight, and locations from freight
                  request emails with high accuracy.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 mb-2">
                  <Truck className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-base">Smart Truck Selection</CardTitle>
                <CardDescription>
                  Get intelligent trailer recommendations based on cargo dimensions, deck
                  heights, and legal limits.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 mb-2">
                  <Route className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-base">Route & Permits</CardTitle>
                <CardDescription>
                  Calculate routes, identify state crossings, and estimate permit costs with
                  our 50-state database.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
