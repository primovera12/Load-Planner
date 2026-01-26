'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UniversalDropzone } from '@/components/smart-loader/UniversalDropzone'
import { ExtractedItemsList } from '@/components/smart-loader/ExtractedItemsList'
import { LoadPlanVisualizer } from '@/components/smart-loader/LoadPlanVisualizer'
import { CustomerInfoSection } from '@/components/load-planner/CustomerInfoSection'
import { MultiStopRouteBuilder } from '@/components/load-planner/MultiStopRouteBuilder'
import { CostEstimatePanel } from '@/components/load-planner/CostEstimatePanel'
import { LoadItem, TruckType } from '@/types'
import { replanForNewTruck, PlannedLoad as LibPlannedLoad } from '@/lib/load-planner'
import { LoadCustomer, RouteStop, MultiStopRoute, StatePermitInfo, CostEstimate } from '@/types/route-planning'
import { Loader2, FileText, Share2, Download, MapPin, DollarSign } from 'lucide-react'

export interface PlannedLoad {
  id: string
  items: LoadItem[]
  truck: TruckType
  placements: ItemPlacement[]
  utilization: {
    weight: number // percentage
    space: number // percentage
  }
  warnings: string[]
}

export interface ItemPlacement {
  itemId: string
  x: number // position from front (feet)
  z: number // position from left (feet)
  rotated: boolean
}

export interface LoadPlanResult {
  loads: PlannedLoad[]
  totalTrucks: number
  totalWeight: number
  totalItems: number
  warnings: string[]
}

export default function LoadPlannerPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<LoadItem[]>([])
  const [loadPlan, setLoadPlan] = useState<LoadPlanResult | null>(null)
  const [parseMethod, setParseMethod] = useState<'AI' | 'pattern' | null>(null)
  const [analysisStatus, setAnalysisStatus] = useState('')

  // New state for customer, route, and costs
  const [customer, setCustomer] = useState<LoadCustomer | null>(null)
  const [stops, setStops] = useState<RouteStop[]>([])
  const [route, setRoute] = useState<MultiStopRoute | null>(null)
  const [permits, setPermits] = useState<StatePermitInfo[]>([])
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const [activeTab, setActiveTab] = useState<'cargo' | 'route'>('cargo')

  // Split feedback for notifications
  const [splitFeedback, setSplitFeedback] = useState<{
    message: string
    type: 'info' | 'warning'
  } | null>(null)

  const handleFileAnalyzed = useCallback((result: {
    items: LoadItem[]
    loadPlan: LoadPlanResult
    parseMethod: 'AI' | 'pattern'
  }) => {
    setItems(result.items)
    setLoadPlan(result.loadPlan)
    setParseMethod(result.parseMethod)
    setError(null)
  }, [])

  const handleItemsChange = useCallback((updatedItems: LoadItem[]) => {
    setItems(updatedItems)
    // Re-plan with updated items
    replanLoad(updatedItems)
  }, [])

  const handleTruckChange = useCallback((loadIndex: number, newTruck: TruckType) => {
    if (!loadPlan) return

    // Convert LoadPlanResult loads to load-planner format for replanForNewTruck
    const libLoads: LibPlannedLoad[] = loadPlan.loads.map(load => ({
      id: load.id,
      items: load.items,
      length: Math.max(...load.items.map(i => i.length), 0),
      width: Math.max(...load.items.map(i => i.width), 0),
      height: Math.max(...load.items.map(i => i.height), 0),
      weight: load.items.reduce((sum, i) => sum + i.weight * (i.quantity || 1), 0),
      recommendedTruck: load.truck,
      truckScore: 80,
      placements: load.placements,
      permitsRequired: [],
      warnings: load.warnings,
      isLegal: true,
    }))

    // Use replanForNewTruck to handle potential splitting
    const result = replanForNewTruck(libLoads, loadIndex, newTruck)

    // Show feedback if split occurred
    if (result.splitOccurred) {
      setSplitFeedback({
        message: result.splitMessage || `Load split into ${result.loads.length} trucks`,
        type: 'info'
      })
      // Auto-dismiss after 5 seconds
      setTimeout(() => setSplitFeedback(null), 5000)
    }

    // Show warning for oversized items
    if (result.oversizedItems.length > 0) {
      setSplitFeedback({
        message: `Warning: ${result.oversizedItems.length} item(s) exceed ${newTruck.name} dimensions`,
        type: 'warning'
      })
    }

    // Convert back to LoadPlanResult format
    const newLoads: PlannedLoad[] = result.loads.map(load => ({
      id: load.id,
      items: load.items,
      truck: load.recommendedTruck,
      placements: load.placements,
      utilization: calculateUtilization(load.items, load.recommendedTruck),
      warnings: load.warnings,
    }))

    setLoadPlan(prev => {
      if (!prev) return prev
      return {
        ...prev,
        loads: newLoads,
        totalTrucks: newLoads.length,
        totalWeight: newLoads.reduce((sum, l) =>
          sum + l.items.reduce((s, i) => s + i.weight * (i.quantity || 1), 0), 0
        ),
      }
    })
  }, [loadPlan])

  const replanLoad = async (itemsToUse: LoadItem[]) => {
    if (itemsToUse.length === 0) {
      setLoadPlan(null)
      return
    }

    try {
      const response = await fetch('/api/plan-load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToUse })
      })

      if (response.ok) {
        const result = await response.json()
        setLoadPlan(result.loadPlan)
      }
    } catch (err) {
      console.error('Failed to re-plan load:', err)
    }
  }

  // Handle route calculation
  const handleRouteCalculated = useCallback((calculatedRoute: MultiStopRoute) => {
    setRoute(calculatedRoute)
    // Fetch permits for states in route
    if (calculatedRoute.statesTraversed.length > 0 && loadPlan) {
      fetchPermits(calculatedRoute.statesTraversed)
    }
  }, [loadPlan])

  // Fetch permit requirements based on route states
  const fetchPermits = async (states: string[]) => {
    try {
      // Calculate max dimensions from load plan
      const maxWidth = loadPlan?.loads.reduce((max, load) =>
        Math.max(max, ...load.items.map(i => i.width)), 0) || 0
      const maxHeight = loadPlan?.loads.reduce((max, load) =>
        Math.max(max, ...load.items.map(i => i.height)), 0) || 0
      const maxWeight = loadPlan?.totalWeight || 0

      const response = await fetch('/api/permits/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          states,
          cargo: {
            width: maxWidth,
            height: maxHeight,
            weight: maxWeight
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPermits(data.permits || [])
      }
    } catch (err) {
      console.error('Failed to fetch permits:', err)
    }
  }

  // Calculate cargo specs for cost estimate
  const cargoSpecs = {
    width: loadPlan?.loads.reduce((max, load) =>
      Math.max(max, ...load.items.map(i => i.width)), 0) || 0,
    height: loadPlan?.loads.reduce((max, load) =>
      Math.max(max, ...load.items.map(i => i.height)), 0) || 0,
    length: loadPlan?.loads.reduce((max, load) =>
      Math.max(max, ...load.items.map(i => i.length)), 0) || 0,
    grossWeight: loadPlan?.totalWeight || 0
  }

  const handleDownloadPDF = async () => {
    if (!loadPlan || items.length === 0) return

    try {
      // Generate a reference number
      const reference = `LP-${Date.now().toString(36).toUpperCase()}`

      const response = await fetch('/api/generate-load-plan-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loadPlan,
          options: {
            title: 'Load Plan',
            reference,
            date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            // Include customer, route, and cost info
            customer,
            route,
            stops,
            permits,
            costEstimate
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const blob = await response.blob()
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty')
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `load-plan-${reference}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate PDF')
    }
  }

  const handleShare = async () => {
    if (!loadPlan || items.length === 0) return

    try {
      const response = await fetch('/api/load-plan-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, loadPlan })
      })

      if (response.ok) {
        const { token } = await response.json()
        const shareUrl = `${window.location.origin}/plan/${token}`
        await navigator.clipboard.writeText(shareUrl)
        alert('Share link copied to clipboard!')
      }
    } catch (err) {
      console.error('Failed to create share link:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Universal Load Planner</h1>
            <p className="text-sm text-gray-500">Drop any file - we&apos;ll figure out the rest</p>
          </div>
          {loadPlan && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={activeTab === 'cargo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('cargo')}
          >
            <FileText className="w-4 h-4 mr-2" />
            Cargo & Load Plan
          </Button>
          <Button
            variant={activeTab === 'route' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('route')}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Route & Pricing
          </Button>
        </div>

        {activeTab === 'cargo' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - Input & Items */}
            <div className="lg:col-span-5 space-y-6">
              {/* Dropzone */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Upload or Paste</CardTitle>
                  <CardDescription>
                    PDF, Excel, CSV, Image, or plain text - we handle it all
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UniversalDropzone
                    onAnalyzed={handleFileAnalyzed}
                    onLoading={setIsLoading}
                    onError={setError}
                    onStatusChange={setAnalysisStatus}
                  />
                </CardContent>
              </Card>

              {/* Error Display */}
              {error && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-4">
                    <p className="text-red-600 text-sm">{error}</p>
                  </CardContent>
                </Card>
              )}

              {/* Loading */}
              {isLoading && (
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
                  <CardContent className="py-8">
                    <div className="flex items-start gap-4">
                      {/* Animated AI indicator */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                      </div>

                      {/* Status messages */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-blue-900">Claude Opus 4.5</span>
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">Working</span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">
                          {analysisStatus || 'Initializing...'}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-xs text-gray-500">Processing your data intelligently</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Extracted Items */}
              {items.length > 0 && !isLoading && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Extracted Items</CardTitle>
                        <CardDescription>
                          {items.length} items found
                          {parseMethod && (
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              parseMethod === 'AI'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {parseMethod === 'AI' ? 'AI Parsed' : 'Pattern Matched'}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ExtractedItemsList
                      items={items}
                      onChange={handleItemsChange}
                    />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Panel - Load Plan Visualization */}
            <div className="lg:col-span-7">
              {/* Split Feedback Notification */}
              {splitFeedback && (
                <div
                  className={`mb-4 p-4 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 ${
                    splitFeedback.type === 'info'
                      ? 'bg-blue-50 border border-blue-200 text-blue-800'
                      : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  }`}
                >
                  <p className="text-sm font-medium">{splitFeedback.message}</p>
                  <button
                    onClick={() => setSplitFeedback(null)}
                    className="ml-4 text-current opacity-60 hover:opacity-100"
                  >
                    &times;
                  </button>
                </div>
              )}

              {loadPlan ? (
                <LoadPlanVisualizer
                  loadPlan={loadPlan}
                  items={items}
                  onTruckChange={handleTruckChange}
                />
              ) : (
                <Card className="h-full min-h-[400px] flex items-center justify-center">
                  <CardContent className="text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500">No Load Plan Yet</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Upload a file or paste cargo details to generate a load plan
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          /* Route & Pricing Tab */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - Customer & Route */}
            <div className="lg:col-span-5 space-y-4">
              {/* Customer Info */}
              <CustomerInfoSection
                customer={customer}
                onChange={setCustomer}
              />

              {/* Multi-Stop Route Builder */}
              <MultiStopRouteBuilder
                stops={stops}
                items={items}
                onStopsChange={setStops}
                onRouteCalculated={handleRouteCalculated}
              />

              {/* Cost Estimate */}
              <CostEstimatePanel
                route={route}
                permits={permits}
                cargo={cargoSpecs}
                onCostEstimateChange={setCostEstimate}
              />
            </div>

            {/* Right Panel - Summary & Visualization */}
            <div className="lg:col-span-7 space-y-4">
              {/* Route Summary Card */}
              {route && (
                <Card className="border-purple-100">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-600" />
                      Route Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{route.totalDistance.toFixed(0)}</p>
                        <p className="text-xs text-gray-500">Miles</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">
                          {Math.floor(route.totalDuration / 60)}h {Math.round(route.totalDuration % 60)}m
                        </p>
                        <p className="text-xs text-gray-500">Duration</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900">{stops.length}</p>
                        <p className="text-xs text-gray-500">Stops</p>
                      </div>
                    </div>
                    {route.statesTraversed.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">States: </span>
                          {route.statesTraversed.join(' → ')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Load Plan Preview */}
              {loadPlan ? (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Cargo Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-900">{loadPlan.totalTrucks}</p>
                        <p className="text-xs text-blue-600">Trucks</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-900">{loadPlan.totalItems}</p>
                        <p className="text-xs text-blue-600">Items</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-900">
                          {(loadPlan.totalWeight / 1000).toFixed(1)}k
                        </p>
                        <p className="text-xs text-blue-600">Lbs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-[200px] flex items-center justify-center">
                  <CardContent className="text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">
                      Upload cargo to see load summary
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Permit Warnings */}
              {permits.length > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                      <DollarSign className="h-4 w-4" />
                      Permit Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {permits.map((permit, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-amber-800">
                            {permit.stateCode} - {permit.distanceInState.toFixed(0)} mi
                          </span>
                          <span className="font-medium text-amber-900">
                            ${permit.permitFee.toFixed(0)}
                            {permit.escortCost > 0 && ` + $${permit.escortCost.toFixed(0)} escort`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Instructions when no route */}
              {!route && (
                <Card className="h-[300px] flex items-center justify-center">
                  <CardContent className="text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-500">No Route Calculated</h3>
                    <p className="text-sm text-gray-400 mt-1 max-w-xs">
                      Add pickup and delivery stops, then click &quot;Calculate Route&quot; to see your route summary and costs
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function calculateUtilization(items: LoadItem[], truck: TruckType): { weight: number; space: number } {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0)
  const totalArea = items.reduce((sum, item) => sum + (item.length * item.width * item.quantity), 0)
  const truckArea = truck.deckLength * truck.deckWidth

  return {
    weight: Math.round((totalWeight / truck.maxCargoWeight) * 100),
    space: Math.round((totalArea / truckArea) * 100)
  }
}
