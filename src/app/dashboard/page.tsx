'use client'

import { useState } from 'react'
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
} from 'lucide-react'

// Mock data for dashboard - in production this would come from database
const stats = {
  loadsAnalyzed: 0,
  quotesGenerated: 0,
  avgResponseTime: '< 3s',
  parseAccuracy: '90%+',
}

const recentActivity: Array<{
  id: string
  type: 'analyze' | 'quote'
  description: string
  time: string
  status: 'success' | 'warning'
}> = []

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
    disabled: true,
  },
  {
    title: 'Create Quote',
    description: 'Generate professional freight quotes',
    href: '/quotes/new',
    icon: FileText,
    color: 'bg-orange-500',
    disabled: true,
  },
]

export default function DashboardPage() {
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
              <CardTitle className="text-sm font-medium">Loads Analyzed</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.loadsAnalyzed}</div>
              <p className="text-xs text-muted-foreground">Start analyzing to see stats</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quotes Generated</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.quotesGenerated}</div>
              <p className="text-xs text-muted-foreground">Quote feature coming soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground">Average parse time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Parse Accuracy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.parseAccuracy}</div>
              <p className="text-xs text-muted-foreground">For structured emails</p>
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
                  <Link
                    key={action.title}
                    href={action.disabled ? '#' : action.href}
                    className={action.disabled ? 'cursor-not-allowed' : ''}
                    onClick={(e) => action.disabled && e.preventDefault()}
                  >
                    <Card
                      className={`h-full transition-all ${
                        action.disabled
                          ? 'opacity-60'
                          : 'hover:shadow-md hover:border-primary/50'
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${action.color}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {action.title}
                              {action.disabled && (
                                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  Coming Soon
                                </span>
                              )}
                            </CardTitle>
                          </div>
                          {!action.disabled && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          )}
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

          {/* Recent Activity */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
            <Card>
              <CardContent className="pt-6">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start by analyzing a load
                    </p>
                    <Link href="/analyze">
                      <Button variant="outline" size="sm" className="mt-4">
                        <ScanSearch className="mr-2 h-4 w-4" />
                        Analyze Load
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        {activity.status === 'success' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

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
