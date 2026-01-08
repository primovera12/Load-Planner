'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Route,
  MapPin,
  Truck,
  AlertTriangle,
  DollarSign,
  Shield,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Navigation,
  Fuel,
  ToggleLeft,
  ToggleRight,
  Save,
  Star,
  History,
  Trash2,
  Share2,
  Printer,
  Download,
  ExternalLink,
  Copy,
  Check,
  X,
  Coins,
  Package,
} from 'lucide-react'
import { RoutePermitSummary, PermitRequirement } from '@/types'
import {
  getSavedRoutes,
  saveRoute,
  deleteRoute,
  toggleFavorite,
  formatRouteDate,
  generateShareableUrl,
  parseRouteFromUrl,
  CARGO_PRESETS,
  estimateTolls,
  checkSeasonalRestrictions,
  type SavedRoute,
  type CargoPreset,
} from '@/lib/route-storage'
import { printPermitSummary, downloadPermitSummary } from '@/lib/permit-pdf'
import { statePermits } from '@/data/state-permits'
import { RouteComparison } from '@/components/route-comparison'

// Dynamically import the map component (client-side only)
const RouteMap = dynamic(
  () => import('@/components/route-map').then((mod) => mod.RouteMap),
  { ssr: false, loading: () => <MapPlaceholder /> }
)

function MapPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Navigation className="h-5 w-5" />
          Route Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full rounded-lg border bg-slate-100 flex items-center justify-center animate-pulse">
          <div className="text-muted-foreground">Loading map...</div>
        </div>
      </CardContent>
    </Card>
  )
}

// US State codes
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

interface RouteData {
  origin: { lat: number; lng: number; address?: string }
  destination: { lat: number; lng: number; address?: string }
  totalDistance: number
  totalDuration: number
  statesTraversed: string[]
  stateDistances: Record<string, number>
  polyline: string
  bounds: {
    northeast: { lat: number; lng: number }
    southwest: { lat: number; lng: number }
  }
}

interface CostBreakdown {
  permits: number
  escorts: number
  fuel: number
  tolls: number
  total: number
}

// Wrap the main component to use searchParams
export default function RoutesPage() {
  return (
    <Suspense fallback={<div className="container mx-auto px-4 py-8">Loading...</div>}>
      <RoutesPageContent />
    </Suspense>
  )
}

function RoutesPageContent() {
  const searchParams = useSearchParams()

  // Mode toggle
  const [useAutoRoute, setUseAutoRoute] = useState(true)

  // Route inputs
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedStates, setSelectedStates] = useState<string[]>([])

  // Cargo specs
  const [width, setWidth] = useState('10')
  const [height, setHeight] = useState('12.5')
  const [length, setLength] = useState('32')
  const [weight, setWeight] = useState('72000')

  // Fuel price input
  const [fuelPrice, setFuelPrice] = useState('4.00')
  const [showFuelSettings, setShowFuelSettings] = useState(false)

  // Results
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<RoutePermitSummary | null>(null)
  const [routeData, setRouteData] = useState<RouteData | null>(null)
  const [costs, setCosts] = useState<CostBreakdown | null>(null)
  const [mapPoints, setMapPoints] = useState<{ lat: number; lng: number }[]>([])
  const [expandedState, setExpandedState] = useState<string | null>(null)

  // UI state
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load saved routes and URL params on mount
  useEffect(() => {
    setSavedRoutes(getSavedRoutes())

    // Check for shared route in URL
    const urlData = parseRouteFromUrl(searchParams)
    if (urlData) {
      if (urlData.origin) setOrigin(urlData.origin)
      if (urlData.destination) setDestination(urlData.destination)
      if (urlData.width) setWidth(urlData.width.toString())
      if (urlData.height) setHeight(urlData.height.toString())
      if (urlData.length) setLength(urlData.length.toString())
      if (urlData.weight) setWeight(urlData.weight.toString())
      if (urlData.states && urlData.states.length > 0) {
        setSelectedStates(urlData.states)
        setUseAutoRoute(false)
      }
    }

    // Check for cargo from analyze page
    const analyzeData = sessionStorage.getItem('route-cargo')
    if (analyzeData) {
      try {
        const data = JSON.parse(analyzeData)
        // Set origin/destination if available
        if (data.origin) setOrigin(data.origin)
        if (data.destination) setDestination(data.destination)
        // Set cargo dimensions
        if (data.cargo) {
          if (data.cargo.width) setWidth(data.cargo.width.toString())
          if (data.cargo.height) setHeight(data.cargo.height.toString())
          if (data.cargo.length) setLength(data.cargo.length.toString())
          if (data.cargo.weight) setWeight(data.cargo.weight.toString())
        }
        sessionStorage.removeItem('route-cargo')
      } catch (e) {
        console.error('Failed to parse analyze cargo data')
      }
    }
  }, [searchParams])

  // Check seasonal restrictions
  const seasonalStatus = useMemo(() => {
    if (!results) return null
    return checkSeasonalRestrictions(results.overallRestrictions)
  }, [results])

  const toggleState = (code: string) => {
    setSelectedStates(prev =>
      prev.includes(code)
        ? prev.filter(s => s !== code)
        : [...prev, code]
    )
  }

  // Calculate route with Google Maps
  const calculateAutoRoute = async () => {
    if (!origin || !destination) {
      setError('Please enter origin and destination addresses')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          width: parseFloat(width),
          height: parseFloat(height),
          length: parseFloat(length),
          grossWeight: parseFloat(weight),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.fallback) {
          // API not configured, switch to manual mode
          setError('Google Maps API not configured. Please use manual state selection.')
          setUseAutoRoute(false)
        } else {
          setError(data.message || data.error || 'Failed to calculate route')
        }
        return
      }

      if (data.success) {
        setRouteData(data.data.route)
        setResults(data.data.permits)

        // Calculate tolls based on state distances
        const tollEstimate = estimateTolls(data.data.route.stateDistances || {})

        // Recalculate fuel with custom price
        const distance = data.data.route.totalDistance
        const fuelCost = Math.round((distance / 6) * parseFloat(fuelPrice))

        setCosts({
          permits: data.data.costs.permits,
          escorts: data.data.costs.escorts,
          fuel: fuelCost,
          tolls: tollEstimate,
          total: data.data.costs.permits + data.data.costs.escorts + fuelCost + tollEstimate,
        })
        setMapPoints(data.data.mapPoints || [])
        setSelectedStates(data.data.route.statesTraversed)
      }
    } catch (err) {
      setError('Failed to calculate route. Please try again.')
      console.error('Route calculation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate permits for manual state selection
  const calculateManualPermits = async () => {
    if (selectedStates.length === 0) {
      setError('Please select at least one state')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          states: selectedStates,
          width: parseFloat(width),
          height: parseFloat(height),
          length: parseFloat(length),
          grossWeight: parseFloat(weight),
        }),
      })

      const data = await response.json()
      if (data.success) {
        setResults(data.data)
        setRouteData(null)
        setCosts({
          permits: data.data.totalPermitFees,
          escorts: data.data.totalEscortCost,
          fuel: 0,
          tolls: 0,
          total: data.data.totalPermitFees + data.data.totalEscortCost,
        })
        setMapPoints([])
      }
    } catch (err) {
      setError('Error calculating permits')
      console.error('Permit calculation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Save current route
  const handleSaveRoute = () => {
    if (!results || !costs) return

    const saved = saveRoute({
      name: `${origin || selectedStates[0]} to ${destination || selectedStates[selectedStates.length - 1]}`,
      origin: origin || selectedStates[0],
      destination: destination || selectedStates[selectedStates.length - 1],
      states: routeData?.statesTraversed || selectedStates,
      cargo: {
        width: parseFloat(width),
        height: parseFloat(height),
        length: parseFloat(length),
        weight: parseFloat(weight),
      },
      costs: {
        permits: costs.permits,
        escorts: costs.escorts,
        fuel: costs.fuel,
        tolls: costs.tolls,
        total: costs.total,
      },
      routeData: routeData ? {
        totalDistance: routeData.totalDistance,
        totalDuration: routeData.totalDuration,
        stateDistances: routeData.stateDistances,
      } : undefined,
      isFavorite: false,
    })

    setSavedRoutes(getSavedRoutes())
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  // Load a saved route
  const handleLoadRoute = (route: SavedRoute) => {
    setOrigin(route.origin)
    setDestination(route.destination)
    setWidth(route.cargo.width.toString())
    setHeight(route.cargo.height.toString())
    setLength(route.cargo.length.toString())
    setWeight(route.cargo.weight.toString())
    setSelectedStates(route.states)
    setShowHistory(false)

    if (route.origin.length > 2 && route.destination.length > 2) {
      setUseAutoRoute(true)
    } else {
      setUseAutoRoute(false)
    }
  }

  // Delete a saved route
  const handleDeleteRoute = (id: string) => {
    deleteRoute(id)
    setSavedRoutes(getSavedRoutes())
  }

  // Apply cargo preset
  const applyPreset = (preset: CargoPreset) => {
    setWidth(preset.width.toString())
    setHeight(preset.height.toString())
    setLength(preset.length.toString())
    setWeight(preset.weight.toString())
    setShowPresets(false)
  }

  // Copy share link
  const handleCopyShareLink = async () => {
    if (!results || !costs) return

    const shareUrl = generateShareableUrl({
      id: '',
      name: '',
      createdAt: '',
      origin,
      destination,
      states: routeData?.statesTraversed || selectedStates,
      cargo: {
        width: parseFloat(width),
        height: parseFloat(height),
        length: parseFloat(length),
        weight: parseFloat(weight),
      },
      costs: costs,
      isFavorite: false,
    })

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Print/download permit summary
  const handlePrint = () => {
    if (!results || !costs) return

    printPermitSummary({
      origin: origin || selectedStates[0],
      destination: destination || selectedStates[selectedStates.length - 1],
      cargo: {
        width: parseFloat(width),
        height: parseFloat(height),
        length: parseFloat(length),
        weight: parseFloat(weight),
      },
      route: routeData ? {
        totalDistance: routeData.totalDistance,
        totalDuration: routeData.totalDuration,
        statesTraversed: routeData.statesTraversed,
      } : undefined,
      permits: results,
      costs: costs,
      fuelPrice: parseFloat(fuelPrice),
    })
  }

  const handleDownload = () => {
    if (!results || !costs) return

    downloadPermitSummary({
      origin: origin || selectedStates[0],
      destination: destination || selectedStates[selectedStates.length - 1],
      cargo: {
        width: parseFloat(width),
        height: parseFloat(height),
        length: parseFloat(length),
        weight: parseFloat(weight),
      },
      route: routeData ? {
        totalDistance: routeData.totalDistance,
        totalDuration: routeData.totalDuration,
        statesTraversed: routeData.statesTraversed,
      } : undefined,
      permits: results,
      costs: costs,
      fuelPrice: parseFloat(fuelPrice),
    })
  }

  const handleCalculate = () => {
    if (useAutoRoute) {
      calculateAutoRoute()
    } else {
      calculateManualPermits()
    }
  }

  const clearAll = () => {
    setSelectedStates([])
    setResults(null)
    setRouteData(null)
    setCosts(null)
    setMapPoints([])
    setError(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Route className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Route Planner</h1>
                <p className="text-sm text-muted-foreground">
                  Calculate permit requirements and costs for multi-state routes
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Route History */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  className="gap-2"
                >
                  <History className="h-4 w-4" />
                  History
                  {savedRoutes.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                      {savedRoutes.length}
                    </Badge>
                  )}
                </Button>

                {showHistory && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border shadow-lg z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b">
                      <div className="font-medium">Saved Routes</div>
                    </div>
                    {savedRoutes.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No saved routes yet
                      </div>
                    ) : (
                      <div className="divide-y">
                        {savedRoutes.map((route) => (
                          <div
                            key={route.id}
                            className="p-3 hover:bg-slate-50 cursor-pointer"
                            onClick={() => handleLoadRoute(route)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {route.isFavorite && (
                                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                  )}
                                  <span className="font-medium text-sm truncate">
                                    {route.origin} → {route.destination}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {route.states.join(' → ')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ${route.costs.total.toLocaleString()} • {formatRouteDate(route.createdAt)}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteRoute(route.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Route Comparison - show when 2+ saved routes */}
              {savedRoutes.length >= 2 && (
                <RouteComparison savedRoutes={savedRoutes} />
              )}

              {/* Results Actions - only show when results exist */}
              {results && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveRoute}
                    className="gap-2"
                  >
                    {saveSuccess ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyShareLink}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="h-4 w-4" />
                        Share
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-1 space-y-6">
            {/* Mode Toggle */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Route Mode</div>
                    <div className="text-sm text-muted-foreground">
                      {useAutoRoute ? 'Auto-detect states from addresses' : 'Manually select states'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseAutoRoute(!useAutoRoute)}
                    className="gap-2"
                  >
                    {useAutoRoute ? (
                      <>
                        <ToggleRight className="h-5 w-5 text-primary" />
                        Auto
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-5 w-5" />
                        Manual
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Route Inputs - Auto Mode */}
            {useAutoRoute && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Route Addresses
                  </CardTitle>
                  <CardDescription>
                    Enter addresses to auto-detect route states
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="origin">Origin</Label>
                    <Input
                      id="origin"
                      placeholder="e.g., Houston, TX"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="destination">Destination</Label>
                    <Input
                      id="destination"
                      placeholder="e.g., Chicago, IL"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Route Inputs - Manual Mode */}
            {!useAutoRoute && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Route States
                  </CardTitle>
                  <CardDescription>
                    Select states your route passes through (in order)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {US_STATES.map((code) => (
                      <button
                        key={code}
                        onClick={() => toggleState(code)}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          selectedStates.includes(code)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-slate-100 hover:bg-slate-200'
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>

                  {selectedStates.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Selected route ({selectedStates.length} states):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedStates.map((code, idx) => (
                          <span key={code} className="flex items-center">
                            <Badge variant="secondary">{code}</Badge>
                            {idx < selectedStates.length - 1 && (
                              <span className="mx-1 text-muted-foreground">→</span>
                            )}
                          </span>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cargo Specifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Truck className="h-5 w-5" />
                    Cargo Specifications
                  </CardTitle>
                  {/* Presets dropdown */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPresets(!showPresets)}
                      className="gap-1 text-xs"
                    >
                      <Package className="h-3 w-3" />
                      Presets
                      <ChevronDown className="h-3 w-3" />
                    </Button>

                    {showPresets && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border shadow-lg z-50 max-h-80 overflow-y-auto">
                        <div className="p-2 border-b text-xs font-medium text-muted-foreground">
                          Quick-fill cargo dimensions
                        </div>
                        {(['construction', 'industrial', 'agriculture'] as const).map((category) => (
                          <div key={category}>
                            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-slate-50 capitalize">
                              {category}
                            </div>
                            {CARGO_PRESETS.filter(p => p.category === category).map((preset) => (
                              <button
                                key={preset.id}
                                onClick={() => applyPreset(preset)}
                                className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                              >
                                <div className="font-medium text-sm">{preset.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {preset.width}&apos; × {preset.height}&apos; × {preset.length}&apos; • {preset.weight.toLocaleString()} lbs
                                </div>
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="width">Width (ft)</Label>
                    <Input
                      id="width"
                      type="number"
                      step="0.5"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Height (ft)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.5"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="length">Length (ft)</Label>
                    <Input
                      id="length"
                      type="number"
                      step="1"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Gross Weight (lbs)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="1000"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick permit check */}
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="font-medium mb-2">Permit Status</div>
                  <div className="space-y-1 text-muted-foreground">
                    {parseFloat(width) > 8.5 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Width exceeds 8.5&apos; - Oversize
                      </div>
                    )}
                    {parseFloat(height) > 13.5 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Height exceeds 13.5&apos; - Oversize
                      </div>
                    )}
                    {parseFloat(length) > 65 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Length exceeds 65&apos; - Oversize
                      </div>
                    )}
                    {parseFloat(weight) > 80000 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        Weight exceeds 80,000 lbs - Overweight
                      </div>
                    )}
                    {parseFloat(width) <= 8.5 &&
                     parseFloat(height) <= 13.5 &&
                     parseFloat(length) <= 65 &&
                     parseFloat(weight) <= 80000 && (
                      <div className="text-green-600">
                        ✓ Within legal limits - No permits needed
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fuel Price Settings */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Fuel Price</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.10"
                      min="1"
                      max="10"
                      value={fuelPrice}
                      onChange={(e) => setFuelPrice(e.target.value)}
                      className="w-20 h-8 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">/gal</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Fuel estimate based on 6 MPG average
                </p>
              </CardContent>
            </Card>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              onClick={handleCalculate}
              disabled={isLoading || (useAutoRoute ? (!origin || !destination) : selectedStates.length === 0)}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  {useAutoRoute ? 'Calculate Route & Permits' : 'Calculate Permits'}
                </>
              )}
            </Button>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map */}
            {(routeData || mapPoints.length > 0) && (
              <RouteMap
                origin={routeData?.origin}
                destination={routeData?.destination}
                routePoints={mapPoints}
                statesTraversed={routeData?.statesTraversed || selectedStates}
                bounds={routeData?.bounds}
              />
            )}

            {results ? (
              <>
                {/* Route Summary (if auto mode) */}
                {routeData && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Navigation className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-blue-800 mb-2">Route Summary</div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-blue-600">Distance:</span>{' '}
                              <span className="font-medium">{routeData.totalDistance.toLocaleString()} miles</span>
                            </div>
                            <div>
                              <span className="text-blue-600">Duration:</span>{' '}
                              <span className="font-medium">
                                {Math.floor(routeData.totalDuration / 60)}h {routeData.totalDuration % 60}m
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-blue-600">Route:</span>{' '}
                              <span className="font-medium">{routeData.statesTraversed.join(' → ')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cost Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-5">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Permits</p>
                          <p className="text-2xl font-bold">
                            ${costs?.permits.toLocaleString() || 0}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Escorts</p>
                          <p className="text-2xl font-bold">
                            ${costs?.escorts.toLocaleString() || 0}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  {costs?.fuel ? (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Fuel</p>
                            <p className="text-2xl font-bold">
                              ${costs.fuel.toLocaleString()}
                            </p>
                          </div>
                          <Fuel className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                  {costs?.tolls ? (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Tolls</p>
                            <p className="text-2xl font-bold">
                              ${costs.tolls.toLocaleString()}
                            </p>
                          </div>
                          <Coins className="h-8 w-8 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ) : null}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total</p>
                          <p className="text-2xl font-bold text-primary">
                            ${costs?.total.toLocaleString() || 0}
                          </p>
                        </div>
                        <Shield className="h-8 w-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Seasonal Restrictions Alert */}
                {seasonalStatus && seasonalStatus.active.length > 0 && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-red-800 mb-2">Active Travel Restrictions</div>
                          <ul className="space-y-1 text-sm text-red-700">
                            {seasonalStatus.active.map((r, idx) => (
                              <li key={idx}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Upcoming Restrictions */}
                {seasonalStatus && seasonalStatus.upcoming.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-amber-800 mb-2">Upcoming Restrictions</div>
                          <ul className="space-y-1 text-sm text-amber-700">
                            {seasonalStatus.upcoming.map((r, idx) => (
                              <li key={idx}>• {r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Warnings */}
                {results.warnings.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-amber-800 mb-2">Warnings</div>
                          <ul className="space-y-1 text-sm text-amber-700">
                            {results.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Travel Restrictions */}
                {results.overallRestrictions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5" />
                        Travel Restrictions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {results.overallRestrictions.map((r, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Note</Badge>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* State-by-State Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">State-by-State Breakdown</CardTitle>
                    <CardDescription>
                      Click a state to see detailed requirements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.states.map((state) => (
                        <StatePermitCard
                          key={state.stateCode}
                          permit={state}
                          distance={routeData?.stateDistances?.[state.stateCode]}
                          expanded={expandedState === state.stateCode}
                          onToggle={() =>
                            setExpandedState(
                              expandedState === state.stateCode ? null : state.stateCode
                            )
                          }
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center">
                  <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">No Route Calculated</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {useAutoRoute
                      ? 'Enter origin and destination addresses, then click "Calculate Route & Permits" to see the route, requirements, and costs.'
                      : 'Select the states your route passes through, then click "Calculate Permits" to see requirements and costs.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatePermitCard({
  permit,
  distance,
  expanded,
  onToggle
}: {
  permit: PermitRequirement
  distance?: number
  expanded: boolean
  onToggle: () => void
}) {
  const hasIssues = permit.oversizeRequired || permit.overweightRequired || permit.escortsRequired > 0

  // Get state permit info for application link
  const stateInfo = statePermits.find(s => s.stateCode === permit.stateCode)

  return (
    <div className={`rounded-lg border ${hasIssues ? 'border-amber-200' : 'border-slate-200'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge variant={hasIssues ? 'destructive' : 'secondary'} className="font-mono">
            {permit.stateCode}
          </Badge>
          <span className="font-medium">{permit.state}</span>
          {distance && (
            <span className="text-sm text-muted-foreground">({distance} mi)</span>
          )}
          {permit.isSuperload && (
            <Badge variant="destructive" className="text-xs">SUPERLOAD</Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            ${permit.estimatedFee.toLocaleString()}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 bg-slate-50 space-y-3">
          {/* Permit Requirements */}
          <div className="flex flex-wrap gap-2">
            {permit.oversizeRequired && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Oversize Permit Required
              </Badge>
            )}
            {permit.overweightRequired && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Overweight Permit Required
              </Badge>
            )}
            {!permit.oversizeRequired && !permit.overweightRequired && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                No Permit Required
              </Badge>
            )}
          </div>

          {/* Escorts */}
          {(permit.escortsRequired > 0 || permit.poleCarRequired || permit.policeEscortRequired) && (
            <div className="text-sm">
              <span className="font-medium">Escorts: </span>
              {permit.escortsRequired > 0 && `${permit.escortsRequired} escort vehicle(s)`}
              {permit.poleCarRequired && ' + Pole car'}
              {permit.policeEscortRequired && ' + Police escort'}
            </div>
          )}

          {/* Reasons */}
          {permit.reasons.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-1">Reasons:</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {permit.reasons.map((r, idx) => (
                  <li key={idx}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Travel Restrictions */}
          {permit.travelRestrictions.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-1">Travel Restrictions:</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {permit.travelRestrictions.map((r, idx) => (
                  <li key={idx}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Permit Application Link */}
          {stateInfo?.contact && (permit.oversizeRequired || permit.overweightRequired) && (
            <div className="pt-2 border-t border-slate-200">
              <div className="text-sm font-medium mb-2">Apply for Permit</div>
              <div className="flex flex-wrap gap-2">
                {stateInfo.contact.website && (
                  <a
                    href={stateInfo.contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {stateInfo.contact.agency || `${permit.stateCode} DOT`}
                  </a>
                )}
                {stateInfo.contact.phone && (
                  <a
                    href={`tel:${stateInfo.contact.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
                  >
                    {stateInfo.contact.phone}
                  </a>
                )}
              </div>
              {stateInfo?.oversizePermits?.singleTrip?.processingTime && (
                <p className="text-xs text-muted-foreground mt-2">
                  Processing time: {stateInfo.oversizePermits.singleTrip.processingTime}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
