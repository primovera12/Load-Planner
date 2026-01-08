'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Layers, Sparkles, RotateCcw, Scale, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrailerCanvas } from '@/components/svg-visualizer/TrailerCanvas'
import { WizardNavigation } from '../WizardNavigation'
import { useWizard } from '../WizardProvider'
import { ItemPlacement, TrailerAssignment } from '@/types/wizard'
import { cn } from '@/lib/utils'

// Simple bin-packing optimization algorithm
function optimizePlacements(
  items: { id: string; length: number; width: number; height: number; weight: number }[],
  trailerLength: number,
  trailerWidth: number
): ItemPlacement[] {
  const placements: ItemPlacement[] = []

  // Sort items by area (largest first) for better packing
  const sortedItems = [...items].sort((a, b) => b.length * b.width - a.length * a.width)

  // Track occupied regions
  const occupied: { x: number; z: number; length: number; width: number }[] = []

  const doesOverlap = (
    x: number,
    z: number,
    length: number,
    width: number
  ): boolean => {
    for (const region of occupied) {
      if (
        x < region.x + region.length &&
        x + length > region.x &&
        z < region.z + region.width &&
        z + width > region.z
      ) {
        return true
      }
    }
    return false
  }

  const findPosition = (
    length: number,
    width: number
  ): { x: number; z: number; rotated: boolean } | null => {
    // Try both orientations
    const orientations = [
      { l: length, w: width, rotated: false },
      { l: width, w: length, rotated: true },
    ]

    for (const { l, w, rotated } of orientations) {
      // Search from front to back, left to right
      for (let x = 0; x <= trailerLength - l; x += 0.5) {
        for (let z = 0; z <= trailerWidth - w; z += 0.5) {
          if (!doesOverlap(x, z, l, w)) {
            return { x, z, rotated }
          }
        }
      }
    }
    return null
  }

  for (const item of sortedItems) {
    const pos = findPosition(item.length, item.width)
    if (pos) {
      const length = pos.rotated ? item.width : item.length
      const width = pos.rotated ? item.length : item.width

      placements.push({
        itemId: item.id,
        trailerId: '', // Will be set by caller
        position: { x: pos.x, y: 0, z: pos.z },
        rotated: pos.rotated,
        layer: 0,
      })

      occupied.push({ x: pos.x, z: pos.z, length, width })
    }
  }

  return placements
}

// Calculate weight distribution (simplified)
function calculateWeightDistribution(
  items: { id: string; weight: number }[],
  placements: ItemPlacement[],
  trailerLength: number
): { frontWeight: number; rearWeight: number; balance: number } {
  let frontWeight = 0
  let rearWeight = 0
  const midpoint = trailerLength / 2

  for (const placement of placements) {
    const item = items.find(i => i.id === placement.itemId)
    if (!item) continue

    if (placement.position.x < midpoint) {
      frontWeight += item.weight
    } else {
      rearWeight += item.weight
    }
  }

  const totalWeight = frontWeight + rearWeight
  const balance = totalWeight > 0 ? frontWeight / totalWeight : 0.5

  return { frontWeight, rearWeight, balance }
}

// Weight distribution bar component
function WeightDistributionBar({
  frontWeight,
  rearWeight,
  balance,
}: {
  frontWeight: number
  rearWeight: number
  balance: number
}) {
  const isBalanced = balance >= 0.4 && balance <= 0.6
  const isFrontHeavy = balance > 0.6
  const isRearHeavy = balance < 0.4

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="w-4 h-4" />
          Weight Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Front: {frontWeight.toLocaleString()} lbs</span>
            <span>Rear: {rearWeight.toLocaleString()} lbs</span>
          </div>

          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'absolute left-0 top-0 h-full transition-all',
                isBalanced && 'bg-green-500',
                isFrontHeavy && 'bg-yellow-500',
                isRearHeavy && 'bg-yellow-500'
              )}
              style={{ width: `${balance * 100}%` }}
            />
            {/* Center marker */}
            <div className="absolute left-1/2 top-0 h-full w-0.5 bg-gray-400 -translate-x-1/2" />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>FRONT</span>
            <span
              className={cn(
                'font-medium',
                isBalanced && 'text-green-600',
                !isBalanced && 'text-yellow-600'
              )}
            >
              {isBalanced ? 'Balanced' : isFrontHeavy ? 'Front Heavy' : 'Rear Heavy'}
            </span>
            <span>REAR</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function OrganizeStep() {
  const { state, dispatch, nextStep } = useWizard()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [activeTrailerId, setActiveTrailerId] = useState<string>(
    state.selectedTrailers[0]?.id || ''
  )

  // Initialize placements if empty
  useEffect(() => {
    if (state.placements.length === 0 && state.items.length > 0 && state.selectedTrailers.length > 0) {
      // Auto-optimize on first load
      handleOptimize()
    }
  }, [])

  // Get active trailer
  const activeTrailer = useMemo(() => {
    return state.selectedTrailers.find(t => t.id === activeTrailerId) || state.selectedTrailers[0]
  }, [state.selectedTrailers, activeTrailerId])

  // Get placements for active trailer
  const activePlacements = useMemo(() => {
    return state.placements.filter(p => p.trailerId === activeTrailerId)
  }, [state.placements, activeTrailerId])

  // Get items for active trailer
  const activeItems = useMemo(() => {
    const placedItemIds = activePlacements.map(p => p.itemId)
    return state.items.filter(item => placedItemIds.includes(item.id))
  }, [state.items, activePlacements])

  // Calculate weight distribution
  const weightDist = useMemo(() => {
    if (!activeTrailer) return { frontWeight: 0, rearWeight: 0, balance: 0.5 }
    return calculateWeightDistribution(
      state.items,
      activePlacements,
      activeTrailer.deckLength
    )
  }, [state.items, activePlacements, activeTrailer])

  // Calculate utilization
  const utilization = useMemo(() => {
    if (!activeTrailer) return { length: 0, width: 0, weight: 0, area: 0 }

    const totalWeight = activeItems.reduce((sum, item) => sum + item.weight, 0)
    const totalArea = activePlacements.reduce((sum, p) => {
      const item = state.items.find(i => i.id === p.itemId)
      if (!item) return sum
      const length = p.rotated ? item.width : item.length
      const width = p.rotated ? item.length : item.width
      return sum + length * width
    }, 0)

    const trailerArea = activeTrailer.deckLength * activeTrailer.deckWidth

    return {
      weight: (totalWeight / activeTrailer.maxCargoWeight) * 100,
      area: (totalArea / trailerArea) * 100,
    }
  }, [activeTrailer, activeItems, activePlacements, state.items])

  // Handle optimization
  const handleOptimize = useCallback(() => {
    if (!activeTrailer) return

    // Get items that aren't yet placed on any trailer
    const unplacedItems = state.items.filter(
      item => !state.placements.some(p => p.itemId === item.id)
    )

    // If all items are placed, optimize the current trailer's items
    const itemsToOptimize = unplacedItems.length > 0 ? unplacedItems : activeItems

    const newPlacements = optimizePlacements(
      itemsToOptimize,
      activeTrailer.deckLength,
      activeTrailer.deckWidth
    )

    // Add trailer ID and merge with existing placements from other trailers
    const placementsWithTrailer = newPlacements.map(p => ({
      ...p,
      trailerId: activeTrailerId,
    }))

    const otherPlacements = state.placements.filter(p => p.trailerId !== activeTrailerId)

    dispatch({
      type: 'SET_PLACEMENTS',
      payload: [...otherPlacements, ...placementsWithTrailer],
    })
    dispatch({ type: 'SET_OPTIMIZATION_RUN', payload: true })
    dispatch({ type: 'SET_MANUAL_ADJUSTMENTS', payload: false })
  }, [activeTrailer, activeTrailerId, state.items, state.placements, activeItems, dispatch])

  // Handle placement change (drag)
  const handlePlacementChange = useCallback(
    (itemId: string, position: { x: number; y: number; z: number }) => {
      dispatch({ type: 'MOVE_ITEM', payload: { itemId, position } })
    },
    [dispatch]
  )

  // Handle item rotation
  const handleRotateItem = useCallback(
    (itemId: string) => {
      dispatch({ type: 'ROTATE_ITEM', payload: itemId })
    },
    [dispatch]
  )

  // Handle reset
  const handleReset = () => {
    dispatch({ type: 'SET_PLACEMENTS', payload: [] })
    dispatch({ type: 'SET_OPTIMIZATION_RUN', payload: false })
    dispatch({ type: 'SET_MANUAL_ADJUSTMENTS', payload: false })
  }

  // Unplaced items
  const unplacedItems = useMemo(() => {
    return state.items.filter(item => !state.placements.some(p => p.itemId === item.id))
  }, [state.items, state.placements])

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Layers className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Organize Cargo</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Position your cargo on the trailer. Drag items to reposition or click Auto-Optimize.
        </p>
      </div>

      {/* Trailer tabs (if multiple) */}
      {state.selectedTrailers.length > 1 ? (
        <Tabs value={activeTrailerId} onValueChange={setActiveTrailerId}>
          <TabsList className="w-full">
            {state.selectedTrailers.map(trailer => (
              <TabsTrigger key={trailer.id} value={trailer.id} className="flex-1">
                {trailer.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        <div className="text-center">
          <Badge variant="outline" className="text-base py-1 px-4">
            {activeTrailer?.name}
          </Badge>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button onClick={handleOptimize} variant="default">
          <Sparkles className="w-4 h-4 mr-2" />
          Auto-Optimize
        </Button>
        <Button onClick={handleReset} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Canvas */}
      {activeTrailer && (
        <div className="flex justify-center">
          <TrailerCanvas
            trailer={activeTrailer}
            items={state.items}
            placements={activePlacements}
            onPlacementChange={handlePlacementChange}
            onRotateItem={handleRotateItem}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            showGrid={true}
            snapToGrid={true}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Utilization */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Utilization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Deck Area</span>
                <span>{utilization.area.toFixed(1)}%</span>
              </div>
              <Progress value={utilization.area} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Weight Capacity</span>
                <span>{utilization.weight.toFixed(1)}%</span>
              </div>
              <Progress
                value={utilization.weight}
                className={cn('h-2', utilization.weight > 100 && '[&>div]:bg-red-500')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Weight Distribution */}
        <WeightDistributionBar {...weightDist} />
      </div>

      {/* Unplaced items warning */}
      {unplacedItems.length > 0 && (
        <Card className="border-yellow-400 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">
                  {unplacedItems.length} item{unplacedItems.length > 1 ? 's' : ''} not placed
                </p>
                <p className="text-sm text-yellow-700">
                  Click Auto-Optimize or add another trailer to fit all items.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <WizardNavigation
        nextDisabled={state.placements.length === 0}
        nextLabel="Review Plan"
      />
    </div>
  )
}
