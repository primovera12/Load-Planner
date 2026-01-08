'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AnalyzeResponse, LoadItem } from '@/types/load'
import { PlannedLoad } from '@/lib/load-planner'
import {
  Loader2,
  ArrowLeft,
  Download,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// Color palette matching Cargo-Planner
const ITEM_COLORS = [
  '#9B59B6', // Purple
  '#1ABC9C', // Teal
  '#3498DB', // Blue
  '#E74C3C', // Red
  '#F39C12', // Orange
  '#2ECC71', // Green
  '#E91E63', // Pink
  '#00BCD4', // Cyan
  '#FF5722', // Deep Orange
  '#795548', // Brown
]

export default function LoadPlanPage() {
  const router = useRouter()
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTrailers, setExpandedTrailers] = useState<Set<number>>(new Set())

  // Origin/destination state
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)

  // Load data from session storage on mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('load-plan-result')
    if (storedData) {
      try {
        const data = JSON.parse(storedData) as AnalyzeResponse
        setResult(data)
        // Check if origin/destination is missing
        const hasOrigin = data.parsedLoad?.origin && data.parsedLoad.origin.trim() !== ''
        const hasDest = data.parsedLoad?.destination && data.parsedLoad.destination.trim() !== ''
        if (!hasOrigin || !hasDest) {
          setShowLocationPrompt(true)
          if (hasOrigin) setOrigin(data.parsedLoad?.origin || '')
          if (hasDest) setDestination(data.parsedLoad?.destination || '')
        } else {
          setOrigin(data.parsedLoad?.origin || '')
          setDestination(data.parsedLoad?.destination || '')
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

  const toggleTrailerExpanded = (index: number) => {
    const newExpanded = new Set(expandedTrailers)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedTrailers(newExpanded)
  }

  // Download PDF
  const downloadPDF = async () => {
    if (!result?.loadPlan || result.loadPlan.loads.length === 0) return

    setIsDownloadingPDF(true)
    setError(null)
    try {
      const response = await fetch('/api/generate-load-plan-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loadPlan: result.loadPlan,
          options: {
            title: result.parsedLoad?.description || 'Load Plan',
            reference: `LP-${Date.now()}`,
            date: new Date().toLocaleDateString(),
            origin: origin || result.parsedLoad?.origin || 'Not specified',
            destination: destination || result.parsedLoad?.destination || 'Not specified',
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to generate PDF')
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

  // Calculate totals
  const totalItems = result?.loadPlan?.totalItems || 0
  const totalWeight = result?.loadPlan?.totalWeight || 0
  const totalTrucks = result?.loadPlan?.totalTrucks || 0
  const oogCount = result?.loadPlan?.loads.filter(l => !l.isLegal).length || 0

  // Calculate total volume
  const totalVolume = result?.loadPlan?.loads.reduce((sum, load) => {
    return sum + load.items.reduce((v, item) => v + (item.length * item.width * item.height), 0)
  }, 0) || 0

  // Count trailer types
  const trailerTypeCounts: Record<string, number> = {}
  result?.loadPlan?.loads.forEach(load => {
    const type = load.recommendedTruck.name
    trailerTypeCounts[type] = (trailerTypeCounts[type] || 0) + 1
  })

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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 mb-6">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Summary Header - Cargo-Planner Style */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            {/* Left side - Title and details */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Button variant="ghost" size="icon" onClick={() => router.push('/analyze')} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">
                  {result?.parsedLoad?.description || 'Load Plan'}
                </h1>
              </div>
              {(origin || destination) && (
                <p className="text-muted-foreground ml-11">
                  {origin && destination ? `${origin} - ${destination}` : origin || destination}
                </p>
              )}
            </div>

            {/* Right side - Summary stats */}
            <div className="text-right space-y-1">
              <p className="font-semibold">
                {totalTrucks} trailer{totalTrucks !== 1 ? 's' : ''} used
                {oogCount > 0 && <span className="text-amber-600"> ({oogCount} OoG)</span>}
              </p>
              {Object.entries(trailerTypeCounts).map(([type, count]) => (
                <p key={type} className="text-sm text-muted-foreground">{count} x {type}</p>
              ))}
              <p className="text-sm mt-2">
                <span className="text-green-600 font-medium">{totalItems} items loaded</span>
                <CheckCircle2 className="inline h-4 w-4 text-green-600 ml-1" />
              </p>
              <p className="text-sm font-medium">{totalWeight.toLocaleString()} LB</p>
              <p className="text-sm text-muted-foreground">{totalVolume.toFixed(1)} FT³</p>
            </div>
          </div>

          {/* Download button */}
          <div className="flex justify-end mt-4 pt-4 border-t">
            <Button
              onClick={downloadPDF}
              disabled={isDownloadingPDF || !result?.loadPlan}
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
        </CardContent>
      </Card>

      {/* Origin/Destination Prompt */}
      {showLocationPrompt && (
        <Card className="border-amber-200 bg-amber-50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <MapPin className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Add Route Information</p>
                <p className="text-sm text-amber-600">
                  Origin and destination weren&apos;t found in the document. Add them for route planning.
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

      {/* Trailer Summary Table - Cargo-Planner Style */}
      {result?.loadPlan && result.loadPlan.loads.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b text-sm font-medium text-muted-foreground">
              <div className="col-span-1"></div>
              <div className="col-span-2">Type</div>
              <div className="col-span-1 text-center">Pcs</div>
              <div className="col-span-2">Weight (net)</div>
              <div className="col-span-2">Volume</div>
              <div className="col-span-2">Used space</div>
              <div className="col-span-2">View</div>
            </div>

            {/* Table Rows */}
            {result.loadPlan.loads.map((load, index) => (
              <TrailerRow
                key={load.id}
                load={load}
                index={index}
                isExpanded={expandedTrailers.has(index)}
                onToggle={() => toggleTrailerExpanded(index)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {result?.loadPlan?.warnings && result.loadPlan.warnings.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 mb-6">
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
        <Card className="border-red-200 bg-red-50 mb-6">
          <CardContent className="p-4">
            <p className="font-medium text-red-800 mb-2">Items Requiring Special Transport</p>
            <ul className="text-sm text-red-700 space-y-1">
              {result.loadPlan.unassignedItems.map((item, i) => (
                <li key={i}>
                  • {item.description} ({(item.length * 12).toFixed(0)}&quot;L × {(item.width * 12).toFixed(0)}&quot;W × {(item.height * 12).toFixed(0)}&quot;H, {item.weight.toLocaleString()} lbs)
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground mt-8">
        Generated by Load Planner
      </div>
    </div>
  )
}

// Trailer Row Component
function TrailerRow({
  load,
  index,
  isExpanded,
  onToggle
}: {
  load: PlannedLoad
  index: number
  isExpanded: boolean
  onToggle: () => void
}) {
  const volume = load.items.reduce((v, item) => v + (item.length * item.width * item.height), 0)
  const weightPct = Math.round((load.weight / load.recommendedTruck.maxCargoWeight) * 100)

  return (
    <div className="border-b last:border-b-0">
      {/* Summary Row */}
      <div
        className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 cursor-pointer"
        onClick={onToggle}
      >
        {/* Number */}
        <div className="col-span-1 font-bold text-lg">{index + 1}</div>

        {/* Type */}
        <div className="col-span-2">
          <p className="font-medium">{load.recommendedTruck.name}</p>
        </div>

        {/* Pcs */}
        <div className="col-span-1 text-center">{load.items.length}</div>

        {/* Weight */}
        <div className="col-span-2">
          <p className="font-medium">{load.weight.toLocaleString()} LB</p>
          <p className="text-sm text-muted-foreground">({weightPct}%)</p>
        </div>

        {/* Volume */}
        <div className="col-span-2">
          <p>{volume.toFixed(1)} FT³</p>
        </div>

        {/* Used Space + OoG indicator */}
        <div className="col-span-2">
          {!load.isLegal && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded mb-1">
              <Info className="h-3 w-3" />
              OoG
            </span>
          )}
          <p className="text-sm">L: {(load.length * 12).toFixed(1)} IN</p>
          <p className="text-sm">W: {(load.width * 12).toFixed(1)} IN</p>
          <p className="text-sm">H: {(load.height * 12).toFixed(1)} IN</p>
        </div>

        {/* View - Mini trailer preview */}
        <div className="col-span-2 flex items-center gap-2">
          <MiniTrailerView load={load} />
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Detail Section */}
      {isExpanded && (
        <TrailerDetailSection load={load} index={index} />
      )}
    </div>
  )
}

// Mini Trailer View (isometric preview)
function MiniTrailerView({ load }: { load: PlannedLoad }) {
  return (
    <div className="relative w-24 h-16 bg-slate-100 rounded overflow-hidden">
      {/* Trailer deck */}
      <div className="absolute bottom-2 left-1 right-6 h-3 bg-slate-400 rounded-sm" />

      {/* Wheels */}
      <div className="absolute bottom-0 right-2 flex gap-1">
        <div className="w-2 h-2 bg-slate-600 rounded-full" />
        <div className="w-2 h-2 bg-slate-600 rounded-full" />
      </div>

      {/* Gooseneck */}
      <div className="absolute bottom-2 -left-1 w-4 h-2 bg-slate-300 rounded-sm" />

      {/* Cargo items */}
      <div className="absolute bottom-5 left-2 right-8 flex gap-0.5 h-8 items-end">
        {load.items.slice(0, 4).map((item, idx) => {
          const color = ITEM_COLORS[idx % ITEM_COLORS.length]
          const heightRatio = Math.min(item.height / 12, 1)
          return (
            <div
              key={item.id}
              className="flex-1 rounded-sm"
              style={{
                backgroundColor: color,
                height: `${heightRatio * 100}%`,
                minWidth: '8px',
              }}
            />
          )
        })}
        {load.items.length > 4 && (
          <div className="text-xs text-muted-foreground">...</div>
        )}
      </div>
    </div>
  )
}

// Trailer Detail Section
function TrailerDetailSection({ load, index }: { load: PlannedLoad; index: number }) {
  const volume = load.items.reduce((v, item) => v + (item.length * item.width * item.height), 0)
  const weightPct = Math.round((load.weight / load.recommendedTruck.maxCargoWeight) * 100)
  const totalHeight = load.height + load.recommendedTruck.deckHeight
  const widthOverhang = Math.max(0, load.width - load.recommendedTruck.deckWidth)

  // Axle weight estimates (45/55 distribution)
  const frontAxle = Math.round(load.weight * 0.45)
  const rearAxle = Math.round(load.weight * 0.55)

  return (
    <div className="px-6 py-6 bg-slate-50 border-t">
      {/* Header */}
      <h3 className="text-xl font-bold mb-6">{index + 1} : {load.recommendedTruck.name}</h3>

      {/* Large Isometric View */}
      <div className="bg-white rounded-lg p-6 mb-6 border">
        <IsometricTrailerView load={load} />
      </div>

      {/* Three Views: Top, Side, Front */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs font-medium text-center mb-2 text-muted-foreground">Top View</p>
          <TopView load={load} />
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs font-medium text-center mb-2 text-muted-foreground">Side View</p>
          <SideView load={load} />
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <p className="text-xs font-medium text-center mb-2 text-muted-foreground">Front View</p>
          <FrontView load={load} />
        </div>
      </div>

      {/* Specs Grid - 4 Columns like Cargo-Planner */}
      <div className="grid grid-cols-4 gap-6 mb-6 p-4 bg-white rounded-lg border">
        {/* Column 1: Trailer specs */}
        <div>
          <h4 className="font-semibold mb-3">{load.recommendedTruck.name}</h4>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Inside Length:</span> {(load.recommendedTruck.deckLength * 12).toFixed(0)} IN</p>
            <p><span className="text-muted-foreground">Inside Width:</span> {(load.recommendedTruck.deckWidth * 12).toFixed(0)} IN</p>
            <p><span className="text-muted-foreground">Total height:</span> {(load.recommendedTruck.deckHeight * 12).toFixed(0)} IN</p>
            <p><span className="text-muted-foreground">Payload:</span> {load.recommendedTruck.maxCargoWeight.toLocaleString()} LB</p>
          </div>
        </div>

        {/* Column 2: Utilization */}
        <div>
          <h4 className="font-semibold mb-3">Utilization</h4>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Length:</span> {(load.length * 12).toFixed(1)} IN</p>
            <p><span className="text-muted-foreground">Width:</span> {(load.width * 12).toFixed(1)} IN</p>
            <p><span className="text-muted-foreground">Height:</span> {(load.height * 12).toFixed(1)} IN</p>
            <p><span className="text-muted-foreground">Net Wt:</span> {load.weight.toLocaleString()} LB ({weightPct}%)</p>
            <p><span className="text-muted-foreground">Volume:</span> {volume.toFixed(3)} FT³</p>
          </div>
        </div>

        {/* Column 3: Total */}
        <div>
          <h4 className="font-semibold mb-3">Total</h4>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Length:</span> {(load.recommendedTruck.deckLength * 12).toFixed(0)} IN</p>
            <p><span className="text-muted-foreground">Width:</span> {(load.width * 12).toFixed(1)} IN</p>
            <p><span className="text-muted-foreground">Height:</span> {(totalHeight * 12).toFixed(1)} IN</p>
            {widthOverhang > 0 && (
              <>
                <p><span className="text-muted-foreground">Overhang Side 1:</span> {(widthOverhang * 12 / 2).toFixed(0)} IN</p>
                <p><span className="text-muted-foreground">Overhang Side 2:</span> {(widthOverhang * 12 / 2).toFixed(0)} IN</p>
              </>
            )}
          </div>
        </div>

        {/* Column 4: Axle Weights */}
        <div>
          <h4 className="font-semibold mb-3">Axle Weights (Net)</h4>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Front:</span> {frontAxle.toLocaleString()} LB</p>
            <p><span className="text-muted-foreground">Rear:</span> {rearAxle.toLocaleString()} LB</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="px-4 py-3 text-left w-8"></th>
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-center">Quantity</th>
              <th className="px-4 py-3 text-right">Length</th>
              <th className="px-4 py-3 text-right">Width</th>
              <th className="px-4 py-3 text-right">Height</th>
              <th className="px-4 py-3 text-right">Weight/pc.</th>
              <th className="px-4 py-3 text-center">Not Stackable</th>
            </tr>
          </thead>
          <tbody>
            {load.items.map((item, idx) => (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: ITEM_COLORS[idx % ITEM_COLORS.length] }}
                  />
                </td>
                <td className="px-4 py-3">{item.sku || idx + 1}</td>
                <td className="px-4 py-3">{item.description || `Item ${idx + 1}`}</td>
                <td className="px-4 py-3 text-center">{item.quantity}</td>
                <td className="px-4 py-3 text-right">{(item.length * 12).toFixed(0)}</td>
                <td className="px-4 py-3 text-right">{(item.width * 12).toFixed(0)}</td>
                <td className="px-4 py-3 text-right">{(item.height * 12).toFixed(0)}</td>
                <td className="px-4 py-3 text-right">{item.weight.toLocaleString()}</td>
                <td className="px-4 py-3 text-center">{!item.stackable ? '✓' : ''}</td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-slate-50 font-medium">
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3">TOTAL</td>
              <td className="px-4 py-3 text-center">{load.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-right">{load.items.reduce((sum, i) => sum + i.weight, 0).toLocaleString()}</td>
              <td className="px-4 py-3"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Isometric Trailer View Component
function IsometricTrailerView({ load }: { load: PlannedLoad }) {
  const maxItemLength = Math.max(...load.items.map(i => i.length), 1)

  return (
    <div className="relative h-48 flex items-center justify-center">
      {/* SVG Isometric View */}
      <svg viewBox="0 0 400 200" className="w-full max-w-lg h-full">
        {/* Gooseneck */}
        <polygon points="30,120 60,120 60,140 30,140" fill="#9CA3AF" />
        <circle cx="35" cy="140" r="6" fill="#374151" />

        {/* Trailer deck */}
        <rect x="55" y="115" width="280" height="30" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="1" />

        {/* Wheels */}
        <circle cx="300" cy="155" r="10" fill="#374151" />
        <circle cx="320" cy="155" r="10" fill="#374151" />
        <circle cx="340" cy="155" r="10" fill="#374151" />

        {/* Cargo items - isometric boxes */}
        {load.items.slice(0, 6).map((item, idx) => {
          const color = ITEM_COLORS[idx % ITEM_COLORS.length]
          const xOffset = 65 + idx * 40
          const boxWidth = Math.min((item.length / maxItemLength) * 60, 50)
          const boxHeight = Math.min(item.height * 6, 70)

          return (
            <g key={item.id}>
              {/* Front face */}
              <rect
                x={xOffset}
                y={115 - boxHeight}
                width={boxWidth}
                height={boxHeight}
                fill={color}
                stroke={color}
                strokeWidth="1"
              />
              {/* Top face (lighter) */}
              <polygon
                points={`${xOffset},${115 - boxHeight} ${xOffset + 10},${105 - boxHeight} ${xOffset + boxWidth + 10},${105 - boxHeight} ${xOffset + boxWidth},${115 - boxHeight}`}
                fill={color}
                opacity="0.7"
              />
              {/* Right face (darker) */}
              <polygon
                points={`${xOffset + boxWidth},${115 - boxHeight} ${xOffset + boxWidth + 10},${105 - boxHeight} ${xOffset + boxWidth + 10},${105} ${xOffset + boxWidth},${115}`}
                fill={color}
                opacity="0.5"
              />
              {/* Label */}
              <text
                x={xOffset + boxWidth / 2}
                y={115 - boxHeight / 2}
                textAnchor="middle"
                fill="white"
                fontSize="8"
                fontWeight="bold"
              >
                {idx + 1}
              </text>
              <text
                x={xOffset + boxWidth / 2}
                y={115 - boxHeight / 2 + 10}
                textAnchor="middle"
                fill="white"
                fontSize="6"
              >
                {(item.length * 12).toFixed(0)}x{(item.width * 12).toFixed(0)}x{(item.height * 12).toFixed(0)}
              </text>
            </g>
          )
        })}

        {load.items.length > 6 && (
          <text x="350" y="100" fontSize="12" fill="#6B7280">...</text>
        )}
      </svg>
    </div>
  )
}

// Top View Component
function TopView({ load }: { load: PlannedLoad }) {
  return (
    <div className="relative h-20 bg-slate-200 rounded">
      <div className="absolute inset-2 flex gap-1">
        {load.items.slice(0, 5).map((item, idx) => {
          const color = ITEM_COLORS[idx % ITEM_COLORS.length]
          const widthRatio = Math.min(item.length / load.recommendedTruck.deckLength, 0.3)
          return (
            <div
              key={item.id}
              className="h-full rounded-sm flex items-center justify-center"
              style={{
                backgroundColor: color,
                width: `${widthRatio * 100}%`,
                minWidth: '15px',
              }}
            >
              <span className="text-white text-xs font-medium">{idx + 1}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Side View Component
function SideView({ load }: { load: PlannedLoad }) {
  return (
    <div className="relative h-20">
      {/* Deck */}
      <div className="absolute bottom-2 left-0 right-8 h-2 bg-slate-400 rounded-sm" />

      {/* Wheels */}
      <div className="absolute bottom-0 right-2 flex gap-1">
        <div className="w-3 h-3 bg-slate-600 rounded-full" />
        <div className="w-3 h-3 bg-slate-600 rounded-full" />
      </div>

      {/* Gooseneck */}
      <div className="absolute bottom-2 -left-1 w-4 h-2 bg-slate-300 rounded-sm" />

      {/* Cargo */}
      <div className="absolute bottom-4 left-2 right-10 flex gap-1 items-end h-12">
        {load.items.slice(0, 5).map((item, idx) => {
          const color = ITEM_COLORS[idx % ITEM_COLORS.length]
          const heightRatio = Math.min(item.height / 12, 1)
          return (
            <div
              key={item.id}
              className="flex-1 rounded-sm flex items-center justify-center"
              style={{
                backgroundColor: color,
                height: `${heightRatio * 100}%`,
                minWidth: '12px',
              }}
            >
              <span className="text-white text-xs">{idx + 1}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Front View Component
function FrontView({ load }: { load: PlannedLoad }) {
  // Show the widest item
  const widestItem = load.items.reduce((max, item) => item.width > max.width ? item : max, load.items[0])
  const idx = load.items.indexOf(widestItem)
  const color = ITEM_COLORS[idx % ITEM_COLORS.length]

  return (
    <div className="relative h-20">
      {/* Deck */}
      <div className="absolute bottom-2 left-2 right-2 h-2 bg-slate-400 rounded-sm" />

      {/* Wheels */}
      <div className="absolute bottom-0 left-3">
        <div className="w-3 h-3 bg-slate-600 rounded-full" />
      </div>
      <div className="absolute bottom-0 right-3">
        <div className="w-3 h-3 bg-slate-600 rounded-full" />
      </div>

      {/* Cargo - widest item */}
      {widestItem && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-sm flex items-center justify-center"
          style={{
            backgroundColor: color,
            width: `${Math.min(widestItem.width / load.recommendedTruck.deckWidth, 1) * 70}%`,
            height: `${Math.min(widestItem.height / 12, 1) * 50}px`,
            minWidth: '30px',
          }}
        >
          <span className="text-white text-xs font-medium">{idx + 1}</span>
        </div>
      )}
    </div>
  )
}
