'use client'

import { useState, useEffect, useMemo } from 'react'
import { Truck, Check, Star, AlertTriangle, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WizardNavigation } from '../WizardNavigation'
import { useWizard } from '../WizardProvider'
import { trucks, getCategories } from '@/data/trucks'
import { TruckType, TrailerCategory } from '@/types/truck'
import { cn } from '@/lib/utils'

// Calculate if an item fits on a trailer
function calculateFit(item: { length: number; width: number; height: number; weight: number }, truck: TruckType) {
  const totalHeight = item.height + truck.deckHeight
  const fits =
    item.length <= truck.deckLength &&
    item.width <= truck.deckWidth &&
    item.weight <= truck.maxCargoWeight
  const isLegal = totalHeight <= 13.5 && item.width <= 8.5

  return {
    fits,
    isLegal,
    totalHeight,
    heightClearance: 13.5 - totalHeight,
    widthClearance: 8.5 - item.width,
    weightClearance: truck.maxCargoWeight - item.weight,
  }
}

// Score a truck for a load
function scoreTruck(items: { length: number; width: number; height: number; weight: number }[], truck: TruckType): number {
  let score = 100

  // Find max dimensions across all items
  const maxLength = Math.max(...items.map(i => i.length))
  const maxWidth = Math.max(...items.map(i => i.width))
  const maxHeight = Math.max(...items.map(i => i.height))
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0)

  // Check if all items fit
  const allFit = items.every(item => {
    const fit = calculateFit(item, truck)
    return fit.fits
  })

  if (!allFit) return 0

  // Calculate total height with deck
  const totalHeightWithDeck = maxHeight + truck.deckHeight

  // Penalize overheight
  if (totalHeightWithDeck > 13.5) {
    score -= Math.min(40, (totalHeightWithDeck - 13.5) * 10)
  }

  // Penalize overwidth
  if (maxWidth > 8.5) {
    score -= Math.min(25, (maxWidth - 8.5) * 5)
  }

  // Bonus for perfect fit (good clearance without overkill)
  const heightClearance = 13.5 - totalHeightWithDeck
  if (heightClearance >= 0 && heightClearance <= 1) {
    score += 10
  } else if (heightClearance > 3) {
    score -= 5 // Overkill - using more trailer than needed
  }

  // Bonus for legal loads
  if (totalHeightWithDeck <= 13.5 && maxWidth <= 8.5 && totalWeight <= 80000) {
    score += 20
  }

  return Math.max(0, Math.min(100, score))
}

// Trailer card component
function TrailerCard({
  truck,
  score,
  isSelected,
  isRecommended,
  onSelect,
  onDeselect,
  maxItemHeight,
}: {
  truck: TruckType
  score: number
  isSelected: boolean
  isRecommended: boolean
  onSelect: () => void
  onDeselect: () => void
  maxItemHeight: number
}) {
  const [expanded, setExpanded] = useState(false)
  const totalHeight = maxItemHeight + truck.deckHeight
  const isLegal = totalHeight <= 13.5

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer',
        isSelected && 'ring-2 ring-primary',
        isRecommended && !isSelected && 'border-yellow-400'
      )}
      onClick={() => (isSelected ? onDeselect() : onSelect())}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{truck.name}</h3>
              {isRecommended && (
                <Badge variant="outline" className="border-yellow-400 text-yellow-600">
                  <Star className="w-3 h-3 mr-1" />
                  Recommended
                </Badge>
              )}
              {!isLegal && (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Permit Required
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{truck.description}</p>

            {/* Quick specs */}
            <div className="flex flex-wrap gap-3 mt-3 text-sm">
              <span className="text-muted-foreground">
                Deck: <span className="text-foreground">{truck.deckHeight}&apos; H</span>
              </span>
              <span className="text-muted-foreground">
                Length: <span className="text-foreground">{truck.deckLength}&apos;</span>
              </span>
              <span className="text-muted-foreground">
                Capacity: <span className="text-foreground">{truck.maxCargoWeight.toLocaleString()} lbs</span>
              </span>
            </div>

            {/* Total height calculation */}
            <div className={cn(
              'mt-2 text-sm font-medium',
              isLegal ? 'text-green-600' : 'text-red-600'
            )}>
              Total Height: {totalHeight.toFixed(1)}&apos; ({isLegal ? 'Legal' : 'Overheight'})
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Score */}
            <div className={cn(
              'text-2xl font-bold',
              score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {score}
            </div>
            <span className="text-xs text-muted-foreground">Score</span>

            {/* Selection indicator */}
            {isSelected && (
              <div className="bg-primary text-primary-foreground rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Expandable details */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" /> Less Details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" /> More Details
            </>
          )}
        </Button>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2 text-sm">
            <div>
              <span className="font-medium">Best For:</span>
              <ul className="list-disc list-inside text-muted-foreground ml-2">
                {truck.bestFor.slice(0, 3).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-medium">Features:</span>
              <ul className="list-disc list-inside text-muted-foreground ml-2">
                {truck.features.slice(0, 3).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-medium">Loading Method:</span>{' '}
              <span className="text-muted-foreground capitalize">{truck.loadingMethod}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TrailerSelectionStep() {
  const { state, dispatch, nextStep } = useWizard()
  const [categoryFilter, setCategoryFilter] = useState<TrailerCategory | 'all'>('all')
  const [showAll, setShowAll] = useState(false)

  // Calculate max dimensions from items
  const maxDimensions = useMemo(() => {
    const items = state.items
    return {
      length: Math.max(...items.map(i => i.length), 0),
      width: Math.max(...items.map(i => i.width), 0),
      height: Math.max(...items.map(i => i.height), 0),
      weight: items.reduce((sum, i) => sum + i.weight * i.quantity, 0),
    }
  }, [state.items])

  // Score and sort trucks
  const scoredTrucks = useMemo(() => {
    return trucks
      .map(truck => ({
        truck,
        score: scoreTruck(state.items, truck),
      }))
      .sort((a, b) => b.score - a.score)
  }, [state.items])

  // Get recommended trucks (top 5 with score > 50)
  const recommendedTrucks = useMemo(() => {
    return scoredTrucks.filter(t => t.score >= 50).slice(0, 5)
  }, [scoredTrucks])

  // Filter trucks by category
  const filteredTrucks = useMemo(() => {
    if (categoryFilter === 'all') return scoredTrucks
    return scoredTrucks.filter(t => t.truck.category === categoryFilter)
  }, [scoredTrucks, categoryFilter])

  const displayedTrucks = showAll ? filteredTrucks : filteredTrucks.slice(0, 10)

  const handleSelectTrailer = (truck: TruckType) => {
    dispatch({ type: 'SELECT_TRAILER', payload: truck })
  }

  const handleDeselectTrailer = (truckId: string) => {
    dispatch({ type: 'REMOVE_TRAILER', payload: truckId })
  }

  const handleNext = () => {
    if (state.selectedTrailers.length === 0) {
      alert('Please select at least one trailer.')
      return false
    }
    return true
  }

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Truck className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Select Trailer</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose the best trailer for your cargo. We&apos;ve ranked options based on fit and legal compliance.
        </p>
      </div>

      {/* Load summary */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Max Length:</span>{' '}
              <span className="font-medium">{maxDimensions.length}&apos;</span>
            </div>
            <div>
              <span className="text-muted-foreground">Max Width:</span>{' '}
              <span className="font-medium">{maxDimensions.width}&apos;</span>
            </div>
            <div>
              <span className="text-muted-foreground">Max Height:</span>{' '}
              <span className="font-medium">{maxDimensions.height}&apos;</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Weight:</span>{' '}
              <span className="font-medium">{maxDimensions.weight.toLocaleString()} lbs</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected trailers */}
      {state.selectedTrailers.length > 0 && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              Selected Trailer{state.selectedTrailers.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {state.selectedTrailers.map(truck => (
                <Badge key={truck.id} variant="secondary" className="text-sm py-1 px-3">
                  {truck.name}
                  <button
                    onClick={() => handleDeselectTrailer(truck.id)}
                    className="ml-2 hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended section */}
      {recommendedTrucks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Recommended Trailers
          </h2>
          <div className="grid gap-3">
            {recommendedTrucks.map(({ truck, score }) => (
              <TrailerCard
                key={truck.id}
                truck={truck}
                score={score}
                isSelected={state.selectedTrailers.some(t => t.id === truck.id)}
                isRecommended={true}
                onSelect={() => handleSelectTrailer(truck)}
                onDeselect={() => handleDeselectTrailer(truck.id)}
                maxItemHeight={maxDimensions.height}
              />
            ))}
          </div>
        </div>
      )}

      {/* All trailers section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">All Trailers</h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as TrailerCategory | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {getCategories().map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3">
          {displayedTrucks.map(({ truck, score }) => (
            <TrailerCard
              key={truck.id}
              truck={truck}
              score={score}
              isSelected={state.selectedTrailers.some(t => t.id === truck.id)}
              isRecommended={recommendedTrucks.some(r => r.truck.id === truck.id)}
              onSelect={() => handleSelectTrailer(truck)}
              onDeselect={() => handleDeselectTrailer(truck.id)}
              maxItemHeight={maxDimensions.height}
            />
          ))}
        </div>

        {filteredTrucks.length > 10 && !showAll && (
          <Button variant="outline" className="w-full" onClick={() => setShowAll(true)}>
            Show All ({filteredTrucks.length - 10} more)
          </Button>
        )}
      </div>

      {/* Navigation */}
      <WizardNavigation
        onNextClick={handleNext}
        nextDisabled={state.selectedTrailers.length === 0}
        nextLabel="Organize Load"
      />
    </div>
  )
}
