'use client'

import { Truck, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrailerOption {
  id: string
  name: string
  deckHeight: number
  deckLength: number
  deckWidth: number
  maxCargoHeight: number
  description: string
}

const TRAILER_OPTIONS: TrailerOption[] = [
  {
    id: 'flatbed',
    name: 'Flatbed',
    deckHeight: 5.0,
    deckLength: 48,
    deckWidth: 8.5,
    maxCargoHeight: 8.5,
    description: 'Standard flatbed trailer - good for most loads',
  },
  {
    id: 'step-deck',
    name: 'Step Deck',
    deckHeight: 3.5,
    deckLength: 48,
    deckWidth: 8.5,
    maxCargoHeight: 10.0,
    description: 'Lower deck height - better for taller cargo',
  },
  {
    id: 'rgn',
    name: 'RGN (Removable Gooseneck)',
    deckHeight: 2.0,
    deckLength: 48,
    deckWidth: 8.5,
    maxCargoHeight: 11.5,
    description: 'Very low deck - ideal for heavy equipment',
  },
  {
    id: 'lowboy',
    name: 'Lowboy',
    deckHeight: 1.5,
    deckLength: 24,
    deckWidth: 8.5,
    maxCargoHeight: 12.0,
    description: 'Lowest deck height - for oversized equipment',
  },
  {
    id: 'double-drop',
    name: 'Double Drop',
    deckHeight: 2.0,
    deckLength: 29,
    deckWidth: 8.5,
    maxCargoHeight: 11.5,
    description: 'Low center section - versatile for tall cargo',
  },
]

interface TrailerSelectorProps {
  selectedTrailer: string
  onSelect: (trailerId: string) => void
  recommendedTrailer?: string
}

export function TrailerSelector({
  selectedTrailer,
  onSelect,
  recommendedTrailer,
}: TrailerSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Select Trailer Type</h3>
        {recommendedTrailer && (
          <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
            Recommended: {TRAILER_OPTIONS.find((t) => t.id === recommendedTrailer)?.name}
          </span>
        )}
      </div>

      <div className="grid gap-3">
        {TRAILER_OPTIONS.map((trailer) => {
          const isSelected = selectedTrailer === trailer.id
          const isRecommended = recommendedTrailer === trailer.id

          return (
            <button
              key={trailer.id}
              onClick={() => onSelect(trailer.id)}
              className={cn(
                'relative flex items-start gap-4 p-4 rounded-lg border text-left transition-all',
                isSelected
                  ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/30'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                  isSelected ? 'bg-blue-500/20' : 'bg-slate-700'
                )}
              >
                <Truck
                  className={cn(
                    'w-5 h-5',
                    isSelected ? 'text-blue-400' : 'text-slate-400'
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-medium',
                      isSelected ? 'text-white' : 'text-slate-300'
                    )}
                  >
                    {trailer.name}
                  </span>
                  {isRecommended && (
                    <span className="text-[10px] font-medium text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                      BEST FIT
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{trailer.description}</p>

                {/* Specs */}
                <div className="flex flex-wrap gap-3 mt-2 text-xs">
                  <span className="text-slate-400">
                    Deck: {trailer.deckHeight}' high
                  </span>
                  <span className="text-slate-400">
                    Max cargo: {trailer.maxCargoHeight}' tall
                  </span>
                  <span className="text-slate-400">
                    Length: {trailer.deckLength}'
                  </span>
                </div>
              </div>

              {/* Selection indicator */}
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  isSelected
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-slate-600'
                )}
              >
                {isSelected && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-400">
          <p>Choose the trailer type that best fits your cargo dimensions.</p>
          <p className="mt-1 text-slate-500">
            Lower deck heights allow taller cargo while staying under the 13.5' legal limit.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Recommend best trailer based on cargo dimensions
 */
export function recommendTrailer(
  maxCargoHeight: number,
  maxCargoWidth: number,
  totalWeight: number
): string {
  const legalMaxHeight = 13.5

  // Find trailers that can fit the cargo
  const viableTrailers = TRAILER_OPTIONS.filter((trailer) => {
    const totalHeight = trailer.deckHeight + maxCargoHeight
    return totalHeight <= legalMaxHeight
  })

  if (viableTrailers.length === 0) {
    // All trailers will exceed height limit, recommend lowest deck
    return 'lowboy'
  }

  // Prefer flatbed if it works (most common, cheapest)
  const flatbed = viableTrailers.find((t) => t.id === 'flatbed')
  if (flatbed) {
    return 'flatbed'
  }

  // Otherwise recommend the trailer with highest deck that still fits
  // (to leave room for loading equipment, etc.)
  viableTrailers.sort((a, b) => b.deckHeight - a.deckHeight)
  return viableTrailers[0].id
}
