'use client'

import { useState, useCallback } from 'react'
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
  Box,
  Eye,
  EyeOff,
  Camera,
  Truck,
  Plus,
  Trash2,
  Move3d,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  RotateCcw,
  AlertTriangle,
  Check,
} from 'lucide-react'
import type { ViewMode, CargoItem, TrailerSpec } from '@/components/3d'
import { TRAILER_SPECS } from '@/components/3d/trailer-models'

// Dynamically import the 3D scene (client-side only)
const LoadScene = dynamic(
  () => import('@/components/3d/load-scene').then((mod) => mod.LoadScene),
  { ssr: false, loading: () => <ScenePlaceholder /> }
)

function ScenePlaceholder() {
  return (
    <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center">
      <div className="text-center text-slate-400">
        <Box className="h-12 w-12 mx-auto mb-2 animate-pulse" />
        <p>Loading 3D Scene...</p>
      </div>
    </div>
  )
}

// Trailer type options
const TRAILER_OPTIONS = [
  { value: 'flatbed', label: 'Flatbed', deckHeight: 5.0 },
  { value: 'step-deck', label: 'Step Deck', deckHeight: 3.5 },
  { value: 'rgn', label: 'RGN', deckHeight: 2.0 },
  { value: 'lowboy', label: 'Lowboy', deckHeight: 1.5 },
  { value: 'double-drop', label: 'Double Drop', deckHeight: 2.0 },
]

// Default cargo for demo
const DEFAULT_CARGO: CargoItem[] = [
  {
    id: '1',
    name: 'Excavator',
    width: 10,
    height: 10,
    length: 25,
    weight: 45000,
    color: '#f59e0b',
    position: [0, 0, 0],
  },
]

export default function VisualizePage() {
  // Trailer selection
  const [trailerType, setTrailerType] = useState('step-deck')

  // Cargo items
  const [cargoItems, setCargoItems] = useState<CargoItem[]>(DEFAULT_CARGO)

  // New cargo form
  const [newCargo, setNewCargo] = useState({
    name: '',
    width: '',
    height: '',
    length: '',
    weight: '',
  })

  // View controls
  const [viewMode, setViewMode] = useState<ViewMode>('3d')
  const [showLegalLimits, setShowLegalLimits] = useState(true)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showCenterOfGravity, setShowCenterOfGravity] = useState(true)

  // Get current trailer spec
  const trailerSpec = TRAILER_SPECS[trailerType] || TRAILER_SPECS.flatbed

  // Calculate load summary
  const totalWeight = cargoItems.reduce((sum, item) => sum + item.weight, 0)
  const maxCargoHeight = Math.max(...cargoItems.map((c) => c.height), 0)
  const maxCargoWidth = Math.max(...cargoItems.map((c) => c.width), 0)
  const totalHeight = trailerSpec.deckHeight + maxCargoHeight

  // Check limits
  const isOverHeight = totalHeight > 13.5
  const isOverWidth = maxCargoWidth > 8.5
  const isOverWeight = totalWeight > 48000 // Typical cargo limit

  // Add new cargo item
  const addCargoItem = useCallback(() => {
    if (!newCargo.name || !newCargo.width || !newCargo.height || !newCargo.length || !newCargo.weight) {
      return
    }

    const item: CargoItem = {
      id: Date.now().toString(),
      name: newCargo.name,
      width: parseFloat(newCargo.width),
      height: parseFloat(newCargo.height),
      length: parseFloat(newCargo.length),
      weight: parseFloat(newCargo.weight),
      position: [0, 0, 0],
    }

    setCargoItems((prev) => [...prev, item])
    setNewCargo({ name: '', width: '', height: '', length: '', weight: '' })
  }, [newCargo])

  // Remove cargo item
  const removeCargoItem = useCallback((id: string) => {
    setCargoItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  // Export scene as image
  const exportScene = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const link = document.createElement('a')
      link.download = `load-${trailerType}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }, [trailerType])

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Box className="h-8 w-8" />
            3D Load Visualization
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize cargo on different trailer types with legal limit overlays
          </p>
        </div>
        <Button onClick={exportScene} variant="outline" className="gap-2">
          <Camera className="h-4 w-4" />
          Export Image
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel - Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* Trailer Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Trailer Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TRAILER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTrailerType(option.value)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    trailerType === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-muted-foreground">
                    Deck: {option.deckHeight}' | Max cargo: {(13.5 - option.deckHeight).toFixed(1)}'
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* View Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Move3d className="h-5 w-5" />
                View
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* View mode buttons */}
              <div className="grid grid-cols-4 gap-2">
                <Button
                  size="sm"
                  variant={viewMode === '3d' ? 'default' : 'outline'}
                  onClick={() => setViewMode('3d')}
                  title="3D View"
                >
                  <Move3d className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'front' ? 'default' : 'outline'}
                  onClick={() => setViewMode('front')}
                  title="Front View"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'side' ? 'default' : 'outline'}
                  onClick={() => setViewMode('side')}
                  title="Side View"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'top' ? 'default' : 'outline'}
                  onClick={() => setViewMode('top')}
                  title="Top View"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>

              {/* Toggle controls */}
              <div className="space-y-2">
                <ToggleButton
                  label="Legal Limits"
                  checked={showLegalLimits}
                  onChange={setShowLegalLimits}
                />
                <ToggleButton
                  label="Dimensions"
                  checked={showDimensions}
                  onChange={setShowDimensions}
                />
                <ToggleButton
                  label="Labels"
                  checked={showLabels}
                  onChange={setShowLabels}
                />
                <ToggleButton
                  label="Center of Gravity"
                  checked={showCenterOfGravity}
                  onChange={setShowCenterOfGravity}
                />
              </div>
            </CardContent>
          </Card>

          {/* Load Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Load Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Height</span>
                <span className={`font-medium ${isOverHeight ? 'text-red-500' : ''}`}>
                  {totalHeight.toFixed(1)}' {isOverHeight && <AlertTriangle className="inline h-4 w-4" />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Max Width</span>
                <span className={`font-medium ${isOverWidth ? 'text-orange-500' : ''}`}>
                  {maxCargoWidth.toFixed(1)}' {isOverWidth && <AlertTriangle className="inline h-4 w-4" />}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Weight</span>
                <span className={`font-medium ${isOverWeight ? 'text-orange-500' : ''}`}>
                  {totalWeight.toLocaleString()} lbs
                </span>
              </div>
              <div className="pt-2 border-t">
                {!isOverHeight && !isOverWidth ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                    <Check className="h-3 w-3 mr-1" />
                    Within Legal Limits
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Permits Required
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main 3D View */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <CardContent className="p-0 h-full">
              <LoadScene
                trailerType={trailerType}
                cargo={cargoItems}
                viewMode={viewMode}
                showLegalLimits={showLegalLimits}
                showDimensions={showDimensions}
                showLabels={showLabels}
                showCenterOfGravity={showCenterOfGravity}
              />
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            {viewMode === '3d' ? 'Drag to rotate • Scroll to zoom • Right-click to pan' : 'Scroll to zoom • Right-click to pan'}
          </p>
        </div>

        {/* Right Panel - Cargo */}
        <div className="lg:col-span-1 space-y-4">
          {/* Add Cargo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Cargo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="cargo-name">Name</Label>
                <Input
                  id="cargo-name"
                  placeholder="e.g., Excavator"
                  value={newCargo.name}
                  onChange={(e) => setNewCargo({ ...newCargo, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cargo-length">Length (ft)</Label>
                  <Input
                    id="cargo-length"
                    type="number"
                    placeholder="25"
                    value={newCargo.length}
                    onChange={(e) => setNewCargo({ ...newCargo, length: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cargo-width">Width (ft)</Label>
                  <Input
                    id="cargo-width"
                    type="number"
                    placeholder="10"
                    value={newCargo.width}
                    onChange={(e) => setNewCargo({ ...newCargo, width: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cargo-height">Height (ft)</Label>
                  <Input
                    id="cargo-height"
                    type="number"
                    placeholder="10"
                    value={newCargo.height}
                    onChange={(e) => setNewCargo({ ...newCargo, height: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cargo-weight">Weight (lbs)</Label>
                  <Input
                    id="cargo-weight"
                    type="number"
                    placeholder="45000"
                    value={newCargo.weight}
                    onChange={(e) => setNewCargo({ ...newCargo, weight: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={addCargoItem} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add to Load
              </Button>
            </CardContent>
          </Card>

          {/* Cargo List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Cargo Items
                </span>
                <Badge variant="secondary">{cargoItems.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {cargoItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No cargo items. Add one above.
                </p>
              ) : (
                cargoItems.map((item) => {
                  const itemTotalHeight = trailerSpec.deckHeight + item.height
                  const itemOverHeight = itemTotalHeight > 13.5
                  const itemOverWidth = item.width > 8.5

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border ${
                        itemOverHeight || itemOverWidth ? 'border-orange-500/50 bg-orange-500/5' : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.length}' x {item.width}' x {item.height}' | {item.weight.toLocaleString()} lbs
                          </div>
                          <div className="text-xs mt-1">
                            Total height: <span className={itemOverHeight ? 'text-red-500 font-medium' : ''}>
                              {itemTotalHeight.toFixed(1)}'
                            </span>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => removeCargoItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}

              {cargoItems.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setCargoItems([])}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/**
 * Toggle button component
 */
function ToggleButton({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors ${
        checked ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
      }`}
    >
      <span className="text-sm">{label}</span>
      {checked ? (
        <Eye className="h-4 w-4 text-primary" />
      ) : (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  )
}
