'use client'

import { useMemo } from 'react'
import { ClipboardCheck, Truck, Package, Scale, AlertTriangle, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WizardNavigation } from '../WizardNavigation'
import { useWizard } from '../WizardProvider'
import { TrailerAssignment, LoadingInstruction } from '@/types/wizard'
import { cn } from '@/lib/utils'

// Generate loading instructions from placements
function generateLoadingInstructions(
  items: { id: string; description: string; weight: number }[],
  placements: { itemId: string; position: { x: number; y: number; z: number }; rotated: boolean }[],
  trailerLength: number
): LoadingInstruction[] {
  // Sort placements back-to-front (higher x first), then left-to-right
  const sorted = [...placements].sort((a, b) => {
    if (Math.abs(a.position.x - b.position.x) > 1) {
      return b.position.x - a.position.x // Back to front
    }
    return a.position.z - b.position.z // Left to right
  })

  return sorted.map((placement, index) => {
    const item = items.find(i => i.id === placement.itemId)
    if (!item) return null!

    // Generate position description
    const midpoint = trailerLength / 2
    const posX = placement.position.x
    let longitudinal = ''
    if (posX < midpoint - 5) {
      longitudinal = 'front section'
    } else if (posX > midpoint + 5) {
      longitudinal = 'rear section'
    } else {
      longitudinal = 'center section'
    }

    const posZ = placement.position.z
    let lateral = ''
    if (posZ < 2) {
      lateral = 'left side'
    } else if (posZ > 6) {
      lateral = 'right side'
    } else {
      lateral = 'center'
    }

    // Generate secure instructions based on weight
    const secureInstructions: string[] = []
    if (item.weight > 10000) {
      secureInstructions.push('Use 4-point chain securement')
      secureInstructions.push(`Min WLL: ${Math.ceil(item.weight / 4).toLocaleString()} lbs per chain`)
    } else if (item.weight > 5000) {
      secureInstructions.push('Use minimum 2 chains or 4 straps')
    } else {
      secureInstructions.push('Use minimum 2 ratchet straps')
    }

    return {
      stepNumber: index + 1,
      itemId: item.id,
      itemName: item.description,
      action: 'load' as const,
      position: {
        description: `${longitudinal}, ${lateral}`,
        coordinates: placement.position,
      },
      rotation: placement.rotated ? 'Crosswise (rotated 90°)' : 'Lengthwise',
      secureInstructions,
      notes: [],
    }
  }).filter(Boolean)
}

// Simple isometric trailer view
function IsometricTrailerView({
  trailer,
  items,
  placements,
}: {
  trailer: { deckLength: number; deckWidth: number; deckHeight: number }
  items: { id: string; description: string; length: number; width: number; height: number; color?: string }[]
  placements: { itemId: string; position: { x: number; y: number; z: number }; rotated: boolean }[]
}) {
  const scale = 4
  const isoAngle = 30
  const cosA = Math.cos((isoAngle * Math.PI) / 180)
  const sinA = Math.sin((isoAngle * Math.PI) / 180)

  // Convert 3D to isometric 2D
  const toIso = (x: number, y: number, z: number) => ({
    x: (x - z) * cosA * scale + 300,
    y: (x + z) * sinA * scale - y * scale + 150,
  })

  const deckL = trailer.deckLength
  const deckW = trailer.deckWidth
  const deckH = trailer.deckHeight

  // Deck corners
  const deck = {
    frontLeft: toIso(0, 0, 0),
    frontRight: toIso(0, 0, deckW),
    backLeft: toIso(deckL, 0, 0),
    backRight: toIso(deckL, 0, deckW),
  }

  // Cargo colors
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  return (
    <svg width="600" height="250" className="mx-auto">
      {/* Deck */}
      <polygon
        points={`${deck.frontLeft.x},${deck.frontLeft.y} ${deck.frontRight.x},${deck.frontRight.y} ${deck.backRight.x},${deck.backRight.y} ${deck.backLeft.x},${deck.backLeft.y}`}
        fill="#e2e8f0"
        stroke="#64748b"
        strokeWidth={1}
      />

      {/* Cargo items */}
      {placements.map((placement, index) => {
        const item = items.find(i => i.id === placement.itemId)
        if (!item) return null

        const length = placement.rotated ? item.width : item.length
        const width = placement.rotated ? item.length : item.width
        const height = item.height
        const { x, z } = placement.position
        const color = item.color || colors[index % colors.length]

        // Box corners
        const p1 = toIso(x, 0, z)
        const p2 = toIso(x + length, 0, z)
        const p3 = toIso(x + length, 0, z + width)
        const p4 = toIso(x, 0, z + width)
        const p5 = toIso(x, height, z)
        const p6 = toIso(x + length, height, z)
        const p7 = toIso(x + length, height, z + width)
        const p8 = toIso(x, height, z + width)

        return (
          <g key={item.id}>
            {/* Top face */}
            <polygon
              points={`${p5.x},${p5.y} ${p6.x},${p6.y} ${p7.x},${p7.y} ${p8.x},${p8.y}`}
              fill={color}
              fillOpacity={0.9}
              stroke="#000"
              strokeWidth={0.5}
            />
            {/* Front face */}
            <polygon
              points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p6.x},${p6.y} ${p5.x},${p5.y}`}
              fill={color}
              fillOpacity={0.7}
              stroke="#000"
              strokeWidth={0.5}
            />
            {/* Side face */}
            <polygon
              points={`${p2.x},${p2.y} ${p3.x},${p3.y} ${p7.x},${p7.y} ${p6.x},${p6.y}`}
              fill={color}
              fillOpacity={0.5}
              stroke="#000"
              strokeWidth={0.5}
            />
          </g>
        )
      })}

      {/* Labels */}
      <text x={10} y={20} fontSize={12} fill="#64748b">
        Isometric View
      </text>
    </svg>
  )
}

export function ReviewPlanStep() {
  const { state, dispatch, nextStep } = useWizard()

  // Generate loading instructions
  const loadingInstructions = useMemo(() => {
    if (!state.selectedTrailers[0]) return []
    return generateLoadingInstructions(
      state.items,
      state.placements,
      state.selectedTrailers[0].deckLength
    )
  }, [state.items, state.placements, state.selectedTrailers])

  // Store loading instructions in state
  useMemo(() => {
    if (loadingInstructions.length > 0) {
      dispatch({ type: 'SET_LOADING_INSTRUCTIONS', payload: loadingInstructions })
    }
  }, [loadingInstructions, dispatch])

  // Calculate totals
  const totals = useMemo(() => {
    const totalWeight = state.items.reduce((sum, item) => sum + item.weight * item.quantity, 0)
    const totalPieces = state.items.reduce((sum, item) => sum + item.quantity, 0)
    const placedItems = state.placements.length
    return { totalWeight, totalPieces, placedItems }
  }, [state.items, state.placements])

  // Check for warnings
  const warnings = useMemo(() => {
    const w: string[] = []
    const unplacedCount = state.items.length - state.placements.length
    if (unplacedCount > 0) {
      w.push(`${unplacedCount} item(s) could not be placed on the selected trailer(s)`)
    }
    if (state.selectedTrailers.length === 0) {
      w.push('No trailer selected')
    }
    return w
  }, [state.items, state.placements, state.selectedTrailers])

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <ClipboardCheck className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Review Load Plan</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Review your load plan before exporting. Everything look good?
        </p>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-yellow-400 bg-yellow-50">
          <CardContent className="py-4">
            {warnings.map((warning, index) => (
              <div key={index} className="flex items-center gap-3 text-yellow-800">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <p>{warning}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <Truck className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{state.selectedTrailers.length}</p>
            <p className="text-sm text-muted-foreground">
              Trailer{state.selectedTrailers.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totals.placedItems}</p>
            <p className="text-sm text-muted-foreground">
              Items Loaded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <Scale className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{totals.totalWeight.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">
              Total lbs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shipment info */}
      {(state.origin || state.destination) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Shipment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {state.origin && (
                <div>
                  <span className="text-muted-foreground">Origin:</span>{' '}
                  <span className="font-medium">{state.origin}</span>
                </div>
              )}
              {state.destination && (
                <div>
                  <span className="text-muted-foreground">Destination:</span>{' '}
                  <span className="font-medium">{state.destination}</span>
                </div>
              )}
              {state.loadDescription && (
                <div>
                  <span className="text-muted-foreground">Description:</span>{' '}
                  <span className="font-medium">{state.loadDescription}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Isometric view */}
      {state.selectedTrailers[0] && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4" />
              {state.selectedTrailers[0].name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IsometricTrailerView
              trailer={state.selectedTrailers[0]}
              items={state.items}
              placements={state.placements}
            />
          </CardContent>
        </Card>
      )}

      {/* Loading instructions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Loading Sequence</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Orientation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingInstructions.map((instruction) => (
                <TableRow key={instruction.stepNumber}>
                  <TableCell className="font-medium">{instruction.stepNumber}</TableCell>
                  <TableCell>{instruction.itemName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {instruction.position.description}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {instruction.rotation}
                  </TableCell>
                </TableRow>
              ))}
              {loadingInstructions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No items placed yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Items summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Items Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">L × W × H (ft)</TableHead>
                <TableHead className="text-right">Weight (lbs)</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.items.map((item) => {
                const isPlaced = state.placements.some(p => p.itemId === item.id)
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {item.length} × {item.width} × {item.height}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.weight.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {isPlaced ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Check className="w-3 h-3 mr-1" />
                          Loaded
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Unplaced
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Navigation */}
      <WizardNavigation nextLabel="Export & Share" />
    </div>
  )
}
