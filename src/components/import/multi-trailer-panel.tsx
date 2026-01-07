'use client'

import { useState, useMemo } from 'react'
import {
  Truck,
  Package,
  Scale,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { estimateTrailersNeeded } from '@/lib/load-optimizer'
import { TRAILER_SPECS } from '@/components/3d/trailer-models'
import { AXLE_LIMITS } from '@/components/3d/weight-distribution'
import type { CargoItem } from '@/components/3d/cargo'
import type { CargoImportItem } from '@/lib/excel-parser'
import { cn } from '@/lib/utils'

interface MultiTrailerPanelProps {
  items: CargoImportItem[]
  trailerType: string
  onSplitLoad: (splitLoads: CargoImportItem[][]) => void
}

export function MultiTrailerPanel({
  items,
  trailerType,
  onSplitLoad,
}: MultiTrailerPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showSplitWizard, setShowSplitWizard] = useState(false)

  // Calculate total stats and trailer estimate
  const analysis = useMemo(() => {
    // Expand items by quantity for accurate analysis
    const expandedItems: CargoItem[] = []
    items.forEach((item, idx) => {
      const qty = item.quantity || 1
      for (let i = 0; i < qty; i++) {
        expandedItems.push({
          id: `temp-${idx}-${i}`,
          name: item.name || `Item ${idx + 1}`,
          length: item.length,
          width: item.width,
          height: item.height,
          weight: item.weight,
          color: '#3b82f6',
          position: [0, 0, 0],
        })
      }
    })

    const validItems = expandedItems.filter(
      (item) => item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
    )

    if (validItems.length === 0) {
      return null
    }

    const totalWeight = validItems.reduce((sum, item) => sum + item.weight, 0)
    const totalVolume = validItems.reduce(
      (sum, item) => sum + item.length * item.width * item.height,
      0
    )
    const totalFootprint = validItems.reduce(
      (sum, item) => sum + item.length * item.width,
      0
    )

    const spec = TRAILER_SPECS[trailerType] || TRAILER_SPECS.flatbed
    const maxWeight = AXLE_LIMITS.grossWeight - 29000 // Available cargo weight
    const deckArea = spec.deckLength * spec.deckWidth
    const maxVolume = spec.deckLength * spec.deckWidth * (13.5 - spec.deckHeight)

    const estimate = estimateTrailersNeeded(validItems, trailerType)

    // Check for oversize items
    const oversizeItems = validItems.filter(
      (item) =>
        item.height > (13.5 - spec.deckHeight) ||
        item.width > spec.deckWidth ||
        item.length > spec.deckLength
    )

    // Check for overweight items
    const overweightItems = validItems.filter((item) => item.weight > maxWeight)

    return {
      itemCount: validItems.length,
      totalWeight,
      totalVolume,
      totalFootprint,
      maxWeight,
      deckArea,
      maxVolume,
      estimate,
      oversizeItems,
      overweightItems,
      needsMultipleTrailers: estimate.count > 1,
      spec,
    }
  }, [items, trailerType])

  if (!analysis) {
    return null
  }

  const {
    itemCount,
    totalWeight,
    totalFootprint,
    deckArea,
    maxWeight,
    estimate,
    oversizeItems,
    overweightItems,
    needsMultipleTrailers,
  } = analysis

  // Determine status
  const hasIssues = oversizeItems.length > 0 || overweightItems.length > 0
  const statusColor = hasIssues
    ? 'text-red-400'
    : needsMultipleTrailers
    ? 'text-amber-400'
    : 'text-green-400'

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Load Analysis</span>
          {needsMultipleTrailers && (
            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
              {estimate.count} Trailers Needed
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Package className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wide">Total Items</span>
              </div>
              <div className="text-lg font-semibold text-white">{itemCount}</div>
            </div>

            <div className="p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Scale className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wide">Total Weight</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn('text-lg font-semibold', totalWeight > maxWeight ? 'text-red-400' : 'text-white')}>
                  {totalWeight.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">lbs</span>
              </div>
            </div>
          </div>

          {/* Trailer estimate */}
          <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className={cn('w-5 h-5', statusColor)} />
                <span className="text-sm font-medium text-white">Trailer Estimate</span>
              </div>
              <span className={cn('text-2xl font-bold', statusColor)}>
                {estimate.count}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>By weight capacity:</span>
                <span>{estimate.byWeight} trailer{estimate.byWeight !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>By deck space:</span>
                <span>{estimate.bySpace} trailer{estimate.bySpace !== 1 ? 's' : ''}</span>
              </div>

              {/* Capacity bars */}
              <div className="mt-3 space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Weight</span>
                    <span>{Math.round((totalWeight / maxWeight) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        totalWeight > maxWeight ? 'bg-red-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${Math.min((totalWeight / maxWeight) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Deck Space</span>
                    <span>{Math.round((totalFootprint / deckArea) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        totalFootprint > deckArea ? 'bg-red-500' : 'bg-green-500'
                      )}
                      style={{ width: `${Math.min((totalFootprint / deckArea) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {(oversizeItems.length > 0 || overweightItems.length > 0) && (
            <div className="space-y-2">
              {oversizeItems.length > 0 && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 rounded-lg text-xs text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    {oversizeItems.length} item{oversizeItems.length !== 1 ? 's' : ''} exceed trailer dimensions
                  </span>
                </div>
              )}
              {overweightItems.length > 0 && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 rounded-lg text-xs text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    {overweightItems.length} item{overweightItems.length !== 1 ? 's' : ''} exceed weight capacity
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Single trailer confirmation or split wizard button */}
          {estimate.count === 1 ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              All cargo fits on a single {trailerType.replace(/_/g, ' ')} trailer
            </div>
          ) : (
            <button
              onClick={() => setShowSplitWizard(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Layers className="w-4 h-4" />
              Split Load Across Trailers
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Split Load Wizard Modal */}
      {showSplitWizard && (
        <SplitLoadWizard
          items={items}
          trailerType={trailerType}
          estimatedTrailers={estimate.count}
          onClose={() => setShowSplitWizard(false)}
          onSplit={onSplitLoad}
        />
      )}
    </div>
  )
}

/**
 * Split Load Wizard - Divides cargo across multiple trailers
 */
interface SplitLoadWizardProps {
  items: CargoImportItem[]
  trailerType: string
  estimatedTrailers: number
  onClose: () => void
  onSplit: (splitLoads: CargoImportItem[][]) => void
}

function SplitLoadWizard({
  items,
  trailerType,
  estimatedTrailers,
  onClose,
  onSplit,
}: SplitLoadWizardProps) {
  const [splitMethod, setSplitMethod] = useState<'auto' | 'manual'>('auto')
  const [numTrailers, setNumTrailers] = useState(estimatedTrailers)

  // Auto-split the load
  const autoSplit = useMemo(() => {
    const spec = TRAILER_SPECS[trailerType] || TRAILER_SPECS.flatbed
    const maxWeight = AXLE_LIMITS.grossWeight - 29000
    const deckArea = spec.deckLength * spec.deckWidth * 0.8 // 80% efficiency

    // Expand items by quantity
    const expandedItems: (CargoImportItem & { originalIndex: number })[] = []
    items.forEach((item, idx) => {
      const qty = item.quantity || 1
      for (let i = 0; i < qty; i++) {
        expandedItems.push({
          ...item,
          quantity: 1,
          originalIndex: idx,
        })
      }
    })

    // Sort by weight (heaviest first for better distribution)
    const sortedItems = [...expandedItems].sort((a, b) => b.weight - a.weight)

    // Create trailer loads using first-fit decreasing
    const trailerLoads: CargoImportItem[][] = []

    for (const item of sortedItems) {
      const footprint = item.length * item.width

      // Find first trailer that can fit this item
      let placed = false
      for (const load of trailerLoads) {
        const loadWeight = load.reduce((sum, i) => sum + i.weight, 0)
        const loadFootprint = load.reduce((sum, i) => sum + i.length * i.width, 0)

        if (loadWeight + item.weight <= maxWeight && loadFootprint + footprint <= deckArea) {
          load.push(item)
          placed = true
          break
        }
      }

      // Create new trailer if item doesn't fit anywhere
      if (!placed) {
        trailerLoads.push([item])
      }
    }

    return trailerLoads
  }, [items, trailerType])

  const handleApplySplit = () => {
    onSplit(autoSplit)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 rounded-xl border border-slate-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Split Load Wizard</h2>
              <p className="text-sm text-slate-400">
                Divide cargo across {autoSplit.length} trailers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Split preview */}
          <div className="space-y-4">
            {autoSplit.map((load, trailerIdx) => {
              const loadWeight = load.reduce((sum, item) => sum + item.weight, 0)
              const loadFootprint = load.reduce((sum, item) => sum + item.length * item.width, 0)

              return (
                <div
                  key={trailerIdx}
                  className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-400" />
                      <span className="font-medium text-white">
                        Trailer {trailerIdx + 1}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({load.length} items)
                      </span>
                    </div>
                    <div className="text-sm text-slate-400">
                      {loadWeight.toLocaleString()} lbs
                    </div>
                  </div>

                  {/* Item list */}
                  <div className="space-y-1">
                    {load.slice(0, 5).map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-slate-300 truncate">
                          {item.name || `Item ${itemIdx + 1}`}
                        </span>
                        <span className="text-slate-500">
                          {item.length}' × {item.width}' × {item.height}'
                        </span>
                      </div>
                    ))}
                    {load.length > 5 && (
                      <div className="text-xs text-slate-500">
                        +{load.length - 5} more items
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <div className="text-sm text-slate-400">
            {autoSplit.length} trailers required
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplySplit}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Export First Trailer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
