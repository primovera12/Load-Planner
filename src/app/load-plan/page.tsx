'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EditableCargoTable } from '@/components/editable-cargo-table'
import { AnalyzeResponse, LoadItem } from '@/types/load'
import {
  Loader2,
  ArrowLeft,
  Box,
  Route,
  Truck,
  Download,
  MapPin,
  Ruler,
  FileWarning,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Package,
  Weight,
  RefreshCw,
} from 'lucide-react'

export default function LoadPlanPage() {
  const router = useRouter()
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Origin/destination state
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)

  // Editable items state
  const [editedItems, setEditedItems] = useState<LoadItem[] | null>(null)
  const [hasEdits, setHasEdits] = useState(false)

  // Load data from session storage on mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('load-plan-result')
    if (storedData) {
      try {
        const data = JSON.parse(storedData) as AnalyzeResponse
        setResult(data)
        if (data.parsedLoad?.items) {
          setEditedItems(data.parsedLoad.items)
        }
        // Check if origin/destination is missing
        const hasOrigin = data.parsedLoad?.origin && data.parsedLoad.origin.trim() !== ''
        const hasDest = data.parsedLoad?.destination && data.parsedLoad.destination.trim() !== ''
        if (!hasOrigin || !hasDest) {
          setShowLocationPrompt(true)
          if (hasOrigin) setOrigin(data.parsedLoad?.origin || '')
          if (hasDest) setDestination(data.parsedLoad?.destination || '')
        }
      } catch (e) {
        console.error('Failed to parse load plan data:', e)
        setError('Failed to load analysis results')
      }
    } else {
      setError('No analysis data found. Please analyze a file first.')
    }
    setIsLoading(false)
  }, [])

  const currentItems = editedItems || result?.parsedLoad?.items || []

  // Handle items being edited
  const handleItemsChange = (newItems: LoadItem[]) => {
    setEditedItems(newItems)
    setHasEdits(true)
  }

  // Recalculate load plan with edited items
  const recalculateLoadPlan = async () => {
    if (!editedItems || editedItems.length === 0) return

    setIsRecalculating(true)
    try {
      const formData = new FormData()
      // Send items as JSON text for re-analysis
      const itemsText = editedItems.map(item =>
        `${item.description}: ${item.length}'L x ${item.width}'W x ${item.height}'H, ${item.weight} lbs, qty ${item.quantity}`
      ).join('\n')
      formData.append('text', itemsText)

      const response = await fetch('/api/analyze-file', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        setResult(data)
        setEditedItems(data.parsedLoad?.items || editedItems)
        setHasEdits(false)
        // Update session storage
        sessionStorage.setItem('load-plan-result', JSON.stringify(data))
      }
    } catch (err) {
      setError('Failed to recalculate load plan')
    } finally {
      setIsRecalculating(false)
    }
  }

  // Download PDF
  const downloadPDF = async () => {
    if (!result?.loadPlan || result.loadPlan.loads.length === 0) return

    setIsDownloadingPDF(true)
    try {
      const response = await fetch('/api/generate-load-plan-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loadPlan: result.loadPlan,
          options: {
            title: 'Load Plan',
            reference: `LP-${Date.now()}`,
            date: new Date().toLocaleDateString(),
            origin: origin || result.parsedLoad?.origin || 'Not specified',
            destination: destination || result.parsedLoad?.destination || 'Not specified',
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `load-plan-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF')
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  // Navigate to 3D visualization
  const visualizeLoad = (loadIndex?: number) => {
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']

    let trailerType: 'flatbed' | 'step-deck' | 'rgn' | 'lowboy' | 'double-drop' = 'step-deck'
    let itemsToVisualize = currentItems

    if (result?.loadPlan && result.loadPlan.loads.length > 0) {
      const loadIdx = loadIndex ?? 0
      const load = result.loadPlan.loads[loadIdx]
      trailerType = load.recommendedTruck.category.toLowerCase().replace('_', '-') as typeof trailerType
      itemsToVisualize = load.items
    }

    const cargoItems = itemsToVisualize.map((item, index) => ({
      id: item.id || `cargo-${Date.now()}-${index}`,
      name: item.description || `Item ${index + 1}`,
      width: item.width,
      height: item.height,
      length: item.length,
      weight: item.weight,
      color: item.color || colors[index % colors.length],
      position: [0, 0, 0] as [number, number, number],
    }))

    sessionStorage.setItem('visualize-cargo', JSON.stringify({
      trailerType,
      cargo: cargoItems,
      loadPlan: result?.loadPlan,
      source: 'load-plan',
    }))

    router.push('/visualize')
  }

  // Navigate to route planning
  const planRoute = () => {
    if (!result?.parsedLoad) return

    const cargo = currentItems.length > 0
      ? {
          width: Math.max(...currentItems.map(i => i.width)),
          height: Math.max(...currentItems.map(i => i.height)),
          length: currentItems.reduce((sum, i) => sum + i.length, 0),
          weight: currentItems.reduce((sum, i) => sum + i.weight, 0),
        }
      : {
          width: result.parsedLoad.width,
          height: result.parsedLoad.height,
          length: result.parsedLoad.length,
          weight: result.parsedLoad.weight,
        }

    sessionStorage.setItem('route-cargo', JSON.stringify({
      source: 'load-plan',
      cargo,
      origin: origin || result.parsedLoad.origin || '',
      destination: destination || result.parsedLoad.destination || '',
    }))

    router.push('/routes')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading load plan...</p>
        </div>
      </div>
    )
  }

  if (error && !result) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push('/analyze')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Analyze
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/analyze')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Load Plan</h1>
            <p className="text-muted-foreground">
              {result?.loadPlan?.totalTrucks || 0} truck(s) • {result?.loadPlan?.totalWeight?.toLocaleString() || 0} lbs total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {result?.metadata?.parseMethod === 'AI' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              <Sparkles className="h-4 w-4 mr-1" />
              AI Parsed
            </span>
          )}
          <Button
            onClick={downloadPDF}
            disabled={isDownloadingPDF || !result?.loadPlan}
            variant="outline"
          >
            {isDownloadingPDF ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 mb-6">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Origin/Destination Prompt */}
      {showLocationPrompt && (
        <Card className="border-amber-200 bg-amber-50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Add Route Information</p>
                <p className="text-sm text-amber-600">
                  Origin and destination weren&apos;t found in the document. Add them for route planning and permits.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="origin" className="text-amber-800">Origin (Pickup)</Label>
                <Input
                  id="origin"
                  placeholder="e.g., Houston, TX"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination" className="text-amber-800">Destination (Delivery)</Label>
                <Input
                  id="destination"
                  placeholder="e.g., Dallas, TX"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLocationPrompt(false)}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{result?.loadPlan?.totalTrucks || 0}</p>
              <p className="text-sm text-muted-foreground">Trucks Needed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{result?.loadPlan?.totalItems || currentItems.length}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Weight className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(result?.loadPlan?.totalWeight || 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Weight (lbs)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{result?.parsedLoad?.confidence || 0}%</p>
              <p className="text-sm text-muted-foreground">Confidence</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Truck Cards */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Trailer Assignments</h2>
            {hasEdits && (
              <Button onClick={recalculateLoadPlan} disabled={isRecalculating} variant="outline" size="sm">
                {isRecalculating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recalculating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recalculate Plan
                  </>
                )}
              </Button>
            )}
          </div>

          {result?.loadPlan && result.loadPlan.loads.length > 0 ? (
            <div className="space-y-4">
              {result.loadPlan.loads.map((load, index) => {
                const colors = ['#9B59B6', '#1ABC9C', '#3498DB', '#E74C3C', '#F39C12', '#2ECC71']
                const utilizationPct = Math.round((load.weight / load.recommendedTruck.maxCargoWeight) * 100)
                const totalHeight = load.height + load.recommendedTruck.deckHeight

                return (
                  <Card key={load.id} className="overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 border-b">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{load.recommendedTruck.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {load.items.length} item{load.items.length > 1 ? 's' : ''} • {load.weight.toLocaleString()} lbs ({utilizationPct}% capacity)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {!load.isLegal && (
                          <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                            OoG - Permits Required
                          </span>
                        )}
                        {load.isLegal && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Legal
                          </span>
                        )}
                        <Button size="sm" onClick={() => visualizeLoad(index)}>
                          <Box className="h-4 w-4 mr-1" />
                          View 3D
                        </Button>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-4">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Specs */}
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Trailer Specs</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Deck Length:</span>
                                <span className="ml-2 font-medium">{load.recommendedTruck.deckLength}&apos;</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Deck Width:</span>
                                <span className="ml-2 font-medium">{load.recommendedTruck.deckWidth}&apos;</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Deck Height:</span>
                                <span className="ml-2 font-medium">{load.recommendedTruck.deckHeight}&apos;</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Max Payload:</span>
                                <span className="ml-2 font-medium">{load.recommendedTruck.maxCargoWeight.toLocaleString()} lbs</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Load Dimensions</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Length:</span>
                                <span className="ml-2 font-medium">{load.length.toFixed(1)}&apos;</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Width:</span>
                                <span className={`ml-2 font-medium ${load.width > 8.5 ? 'text-amber-600' : ''}`}>
                                  {load.width.toFixed(1)}&apos;
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Cargo Height:</span>
                                <span className="ml-2 font-medium">{load.height.toFixed(1)}&apos;</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total Height:</span>
                                <span className={`ml-2 font-medium ${totalHeight > 13.5 ? 'text-red-600' : ''}`}>
                                  {totalHeight.toFixed(1)}&apos;
                                </span>
                              </div>
                            </div>
                          </div>

                          {load.permitsRequired.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">Permits Required</p>
                              <ul className="text-sm text-amber-700 space-y-1">
                                {load.permitsRequired.map((permit, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <FileWarning className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    {permit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Items */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Cargo Items</p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {load.items.map((item, itemIdx) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-2 bg-slate-50 rounded text-sm"
                              >
                                <div
                                  className="w-4 h-4 rounded flex-shrink-0"
                                  style={{ backgroundColor: colors[itemIdx % colors.length] }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{item.description || `Item ${itemIdx + 1}`}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.length}&apos;L × {item.width}&apos;W × {item.height}&apos;H • {item.weight.toLocaleString()} lbs
                                    {item.quantity > 1 && ` × ${item.quantity}`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Mini visualization */}
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Load Preview</p>
                        <div className="relative h-14 bg-slate-200 rounded-lg overflow-hidden">
                          <div className="absolute inset-0 flex items-center px-3">
                            {load.items.map((item, itemIdx) => {
                              const widthPct = Math.min((item.length / load.recommendedTruck.deckLength) * 100, 40)
                              return (
                                <div
                                  key={item.id}
                                  className="h-10 rounded mr-1 flex items-center justify-center text-white text-xs font-medium shadow-sm"
                                  style={{
                                    backgroundColor: colors[itemIdx % colors.length],
                                    width: `${Math.max(widthPct, 8)}%`,
                                    minWidth: '35px'
                                  }}
                                >
                                  {itemIdx + 1}
                                </div>
                              )
                            })}
                          </div>
                          <div className="absolute bottom-0 right-3 flex gap-1.5">
                            <div className="w-4 h-4 bg-slate-600 rounded-full" />
                            <div className="w-4 h-4 bg-slate-600 rounded-full" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No load plan generated yet.</p>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {result?.loadPlan?.warnings && result.loadPlan.warnings.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <p className="font-medium text-amber-800 mb-2">Warnings</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  {result.loadPlan.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Unassigned Items */}
          {result?.loadPlan?.unassignedItems && result.loadPlan.unassignedItems.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="font-medium text-red-800 mb-2">Items Requiring Special Transport</p>
                <ul className="text-sm text-red-700 space-y-1">
                  {result.loadPlan.unassignedItems.map((item, i) => (
                    <li key={i}>
                      • {item.description} ({item.length}&apos;L × {item.width}&apos;W × {item.height}&apos;H, {item.weight.toLocaleString()} lbs)
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions & Edit */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold">Quick Actions</h3>
              <Button onClick={() => visualizeLoad()} className="w-full" size="lg">
                <Box className="h-5 w-5 mr-2" />
                Visualize in 3D
              </Button>
              <Button onClick={planRoute} variant="outline" className="w-full" size="lg">
                <Route className="h-5 w-5 mr-2" />
                Plan Route
              </Button>
              <Button
                onClick={downloadPDF}
                disabled={isDownloadingPDF || !result?.loadPlan}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isDownloadingPDF ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Download PDF
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Route Info */}
          {(origin || destination) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Route
                </h3>
                <div className="space-y-2 text-sm">
                  {origin && (
                    <div>
                      <span className="text-muted-foreground">From:</span>
                      <span className="ml-2 font-medium">{origin}</span>
                    </div>
                  )}
                  {destination && (
                    <div>
                      <span className="text-muted-foreground">To:</span>
                      <span className="ml-2 font-medium">{destination}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto mt-2"
                  onClick={() => setShowLocationPrompt(true)}
                >
                  Edit route info
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Edit Items */}
          <div>
            <h3 className="font-semibold mb-3">Edit Cargo Items</h3>
            <EditableCargoTable
              items={currentItems}
              onItemsChange={handleItemsChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
