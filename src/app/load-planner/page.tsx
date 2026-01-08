'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UniversalDropzone } from '@/components/smart-loader/UniversalDropzone'
import { ExtractedItemsList } from '@/components/smart-loader/ExtractedItemsList'
import { LoadPlanVisualizer } from '@/components/smart-loader/LoadPlanVisualizer'
import { LoadItem, TruckType } from '@/types'
import { Loader2, FileText, Share2, Download } from 'lucide-react'

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

    setLoadPlan(prev => {
      if (!prev) return prev
      const newLoads = [...prev.loads]
      newLoads[loadIndex] = {
        ...newLoads[loadIndex],
        truck: newTruck,
        // Recalculate utilization
        utilization: calculateUtilization(newLoads[loadIndex].items, newTruck)
      }
      return { ...prev, loads: newLoads }
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
            })
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
