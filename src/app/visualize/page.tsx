'use client'

import { useState, useCallback, useEffect } from 'react'
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
  Keyboard,
  Save,
  FolderOpen,
  X,
  Scale,
  Ruler,
} from 'lucide-react'
import type { ViewMode, CargoItem, TrailerSpec } from '@/components/3d'
import { TRAILER_SPECS } from '@/components/3d/trailer-models'
import { useKeyboardShortcuts, getShortcutHint } from '@/hooks/use-keyboard-shortcuts'
import {
  CARGO_TEMPLATES,
  getCategories,
  getCategoryLabel,
  getTemplatesByCategory,
  type CargoTemplate,
} from '@/components/3d/cargo-templates'
import {
  getSavedScenes,
  saveScene,
  deleteScene,
  formatSceneDate,
  type SavedScene,
} from '@/lib/scene-storage'
import {
  calculateWeightDistribution,
  getStatusBgColor,
  getStatusTextColor,
} from '@/components/3d/weight-distribution'
import { useMeasurements, formatDistance } from '@/components/3d/measurement-tool'
import { OptimizationPanel } from '@/components/visualize/optimization-panel'
import { LoadingInstructions } from '@/components/visualize/loading-instructions'

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

  // Template selection
  const [selectedCategory, setSelectedCategory] = useState<CargoTemplate['category']>('construction')

  // View controls
  const [viewMode, setViewMode] = useState<ViewMode>('3d')
  const [showLegalLimits, setShowLegalLimits] = useState(true)
  const [showDimensions, setShowDimensions] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showCenterOfGravity, setShowCenterOfGravity] = useState(true)
  const [showTractor, setShowTractor] = useState(true)

  // Selection state
  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(null)

  // Save/Load state
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showLoadDialog, setShowLoadDialog] = useState(false)
  const [sceneName, setSceneName] = useState('')
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>([])

  // Measurement tool
  const {
    measurements,
    pendingPoint,
    measureMode,
    handleMeasureClick,
    clearMeasurements,
    toggleMeasureMode,
  } = useMeasurements()

  // Load saved scenes on mount
  useEffect(() => {
    setSavedScenes(getSavedScenes())
  }, [])

  // Check for incoming cargo data from analyze or import page
  useEffect(() => {
    const storedData = sessionStorage.getItem('visualize-cargo')
    if (storedData) {
      try {
        const data = JSON.parse(storedData) as {
          trailerType: string
          cargo: CargoItem[]
          source: string
        }
        // Accept cargo from both 'analyze' and 'import' sources
        if ((data.source === 'analyze' || data.source === 'import') && data.cargo.length > 0) {
          setTrailerType(data.trailerType)
          setCargoItems(data.cargo)
        }
        // Clear the stored data so it doesn't reload on refresh
        sessionStorage.removeItem('visualize-cargo')
      } catch (error) {
        console.error('Failed to load cargo:', error)
      }
    }
  }, [])

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

  // Calculate weight distribution
  const weightDist = calculateWeightDistribution(cargoItems, trailerSpec.deckLength)

  // Delete selected cargo
  const deleteSelectedCargo = useCallback(() => {
    if (selectedCargoId) {
      setCargoItems((prev) => prev.filter((item) => item.id !== selectedCargoId))
      setSelectedCargoId(null)
    }
  }, [selectedCargoId])

  // Export scene as image
  const exportSceneImage = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const link = document.createElement('a')
      link.download = `load-${trailerType}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }, [trailerType])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onViewChange: setViewMode,
    onDeleteSelected: deleteSelectedCargo,
    onExportImage: exportSceneImage,
    onDeselect: () => setSelectedCargoId(null),
    onToggleTractor: () => setShowTractor((prev) => !prev),
    onToggleLimits: () => setShowLegalLimits((prev) => !prev),
    enabled: true,
  })

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
    if (selectedCargoId === id) {
      setSelectedCargoId(null)
    }
  }, [selectedCargoId])

  // Add cargo from template
  const addFromTemplate = useCallback((template: CargoTemplate) => {
    const item: CargoItem = {
      id: Date.now().toString(),
      name: template.name,
      width: template.width,
      height: template.height,
      length: template.length,
      weight: template.weight,
      position: [0, 0, 0],
    }
    setCargoItems((prev) => [...prev, item])
  }, [])

  // Update cargo position (drag and drop)
  const handleCargoPositionChange = useCallback((id: string, position: [number, number, number]) => {
    setCargoItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, position } : item
      )
    )
  }, [])

  // Apply optimization results
  const handleApplyOptimization = useCallback((optimizedItems: CargoItem[]) => {
    setCargoItems(optimizedItems)
    setSelectedCargoId(null)
  }, [])

  // Save current scene
  const handleSaveScene = useCallback(() => {
    if (!sceneName.trim()) return

    try {
      saveScene({
        name: sceneName.trim(),
        trailerType,
        cargo: cargoItems,
        viewMode,
        settings: {
          showLegalLimits,
          showDimensions,
          showLabels,
          showCenterOfGravity,
          showTractor,
        },
      })
      setSavedScenes(getSavedScenes())
      setShowSaveDialog(false)
      setSceneName('')
    } catch (error) {
      console.error('Failed to save scene:', error)
    }
  }, [sceneName, trailerType, cargoItems, viewMode, showLegalLimits, showDimensions, showLabels, showCenterOfGravity, showTractor])

  // Load a saved scene
  const handleLoadScene = useCallback((scene: SavedScene) => {
    setTrailerType(scene.trailerType)
    setCargoItems(scene.cargo)
    setViewMode(scene.viewMode)
    setShowLegalLimits(scene.settings.showLegalLimits)
    setShowDimensions(scene.settings.showDimensions)
    setShowLabels(scene.settings.showLabels)
    setShowCenterOfGravity(scene.settings.showCenterOfGravity)
    setShowTractor(scene.settings.showTractor)
    setSelectedCargoId(null)
    setShowLoadDialog(false)
  }, [])

  // Delete a saved scene
  const handleDeleteScene = useCallback((id: string) => {
    deleteScene(id)
    setSavedScenes(getSavedScenes())
  }, [])

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
        <div className="flex gap-2">
          <Button
            onClick={toggleMeasureMode}
            variant={measureMode ? 'default' : 'outline'}
            className="gap-2"
          >
            <Ruler className="h-4 w-4" />
            Measure
          </Button>
          <Button onClick={() => setShowLoadDialog(true)} variant="outline" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Load
          </Button>
          <Button onClick={() => setShowSaveDialog(true)} variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            Save
            <kbd className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{getShortcutHint('save')}</kbd>
          </Button>
          <Button onClick={exportSceneImage} variant="outline" className="gap-2">
            <Camera className="h-4 w-4" />
            Export
            <kbd className="ml-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{getShortcutHint('export')}</kbd>
          </Button>
        </div>
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
                  title="3D View (1)"
                  className="flex-col h-auto py-2"
                >
                  <Move3d className="h-4 w-4" />
                  <span className="text-[10px]">1</span>
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'front' ? 'default' : 'outline'}
                  onClick={() => setViewMode('front')}
                  title="Front View (2)"
                  className="flex-col h-auto py-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span className="text-[10px]">2</span>
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'side' ? 'default' : 'outline'}
                  onClick={() => setViewMode('side')}
                  title="Side View (3)"
                  className="flex-col h-auto py-2"
                >
                  <ArrowUp className="h-4 w-4" />
                  <span className="text-[10px]">3</span>
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'top' ? 'default' : 'outline'}
                  onClick={() => setViewMode('top')}
                  title="Top View (4)"
                  className="flex-col h-auto py-2"
                >
                  <ArrowDown className="h-4 w-4" />
                  <span className="text-[10px]">4</span>
                </Button>
              </div>

              {/* Toggle controls */}
              <div className="space-y-2">
                <ToggleButton
                  label="Tractor"
                  checked={showTractor}
                  onChange={setShowTractor}
                  shortcut={getShortcutHint('tractor')}
                />
                <ToggleButton
                  label="Legal Limits"
                  checked={showLegalLimits}
                  onChange={setShowLegalLimits}
                  shortcut={getShortcutHint('limits')}
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

          {/* Weight Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Weight Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Gross Weight */}
              <div className={`p-2 rounded-lg border ${getStatusBgColor(weightDist.grossStatus)}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">Gross Weight</span>
                  <span className={`text-sm font-bold ${getStatusTextColor(weightDist.grossStatus)}`}>
                    {weightDist.grossPercentage}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      weightDist.grossStatus === 'safe' ? 'bg-green-500' :
                      weightDist.grossStatus === 'caution' ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(weightDist.grossPercentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{weightDist.totalWeight.toLocaleString()} lbs</span>
                  <span>/ {weightDist.grossLimit.toLocaleString()} lbs</span>
                </div>
              </div>

              {/* Axle Weights */}
              <div className="space-y-2">
                {[weightDist.steerAxle, weightDist.driveAxle, weightDist.trailerAxle].map((axle) => (
                  <div key={axle.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">{axle.name}</span>
                      <span className={`text-xs font-medium ${getStatusTextColor(axle.status)}`}>
                        {axle.weight.toLocaleString()} / {axle.limit.toLocaleString()} lbs
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          axle.status === 'safe' ? 'bg-green-500' :
                          axle.status === 'caution' ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(axle.percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Balance Indicator */}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-muted-foreground">Balance (Front/Rear)</span>
                  <span className="text-xs font-medium">
                    {Math.round((1 - weightDist.balanceRatio) * 100)}% / {Math.round(weightDist.balanceRatio * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${(1 - weightDist.balanceRatio) * 100}%` }}
                  />
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{ width: `${weightDist.balanceRatio * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                  <span>Tractor</span>
                  <span>Trailer</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Load Optimizer */}
          <OptimizationPanel
            cargoItems={cargoItems}
            trailerType={trailerType}
            onApplyOptimization={handleApplyOptimization}
          />

          {/* Loading Instructions */}
          <LoadingInstructions
            cargoItems={cargoItems}
            trailerType={trailerType}
          />

          {/* Measurements */}
          {(measureMode || measurements.length > 0) && (
            <Card className={measureMode ? 'border-amber-500/50' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Ruler className="h-5 w-5" />
                    Measurements
                  </span>
                  {measurements.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-muted-foreground hover:text-red-500"
                      onClick={clearMeasurements}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {measureMode && (
                  <div className="text-sm text-amber-600 bg-amber-500/10 rounded-lg p-2 mb-2">
                    {pendingPoint
                      ? 'Click to set end point'
                      : 'Click on the trailer to set start point'}
                  </div>
                )}
                {measurements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No measurements yet
                  </p>
                ) : (
                  measurements.map((m, index) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"
                    >
                      <span className="text-sm text-muted-foreground">
                        Measurement {index + 1}
                      </span>
                      <span className="font-medium text-amber-600">
                        {formatDistance(m.distance)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
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
                showTractor={showTractor}
                selectedCargoId={selectedCargoId}
                onCargoSelect={setSelectedCargoId}
                onCargoPositionChange={handleCargoPositionChange}
                enableDrag={!measureMode}
                measureMode={measureMode}
                measurements={measurements}
                pendingMeasurePoint={pendingPoint}
                onMeasureClick={handleMeasureClick}
              />
            </CardContent>
          </Card>
          <div className="text-sm text-muted-foreground mt-2 text-center space-y-1">
            <p>{viewMode === '3d' ? 'Drag to rotate • Scroll to zoom • Click cargo to select • Drag selected cargo to move' : 'Scroll to zoom • Click cargo to select • Drag selected cargo to move'}</p>
            <p className="text-xs flex items-center justify-center gap-2">
              <Keyboard className="h-3 w-3" />
              Keys: 1-4 views • T tractor • L limits • Del delete • Esc deselect
            </p>
          </div>
        </div>

        {/* Right Panel - Cargo */}
        <div className="lg:col-span-1 space-y-4">
          {/* Cargo Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Box className="h-5 w-5" />
                Quick Add from Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1">
                {getCategories().map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {getCategoryLabel(cat)}
                  </button>
                ))}
              </div>
              {/* Template buttons */}
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                {getTemplatesByCategory(selectedCategory).map((template) => {
                  const totalHeight = trailerSpec.deckHeight + template.height
                  const isOversize = template.width > 8.5 || totalHeight > 13.5
                  return (
                    <button
                      key={template.name}
                      onClick={() => addFromTemplate(template)}
                      className="w-full text-left p-2 rounded-lg border hover:bg-muted/80 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{template.name}</span>
                        {isOversize && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1 text-orange-500 border-orange-500/30">
                            OS
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {template.length}' x {template.width}' x {template.height}' | {template.weight.toLocaleString()} lbs
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Custom Add Cargo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Custom Cargo
              </CardTitle>
              <CardDescription>Enter custom dimensions</CardDescription>
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
                  const isSelected = selectedCargoId === item.id

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedCargoId(isSelected ? null : item.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                          : itemOverHeight || itemOverWidth
                          ? 'border-orange-500/50 bg-orange-500/5 hover:bg-orange-500/10'
                          : 'bg-muted/50 hover:bg-muted'
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

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5" />
                  Save Scene
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={() => setShowSaveDialog(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Save your current load configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scene-name">Scene Name</Label>
                <Input
                  id="scene-name"
                  placeholder="e.g., Excavator Load - Job #1234"
                  value={sceneName}
                  onChange={(e) => setSceneName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveScene()}
                  autoFocus
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>This will save:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Trailer type: {TRAILER_OPTIONS.find(t => t.value === trailerType)?.label}</li>
                  <li>{cargoItems.length} cargo item{cargoItems.length !== 1 ? 's' : ''}</li>
                  <li>Current view settings</li>
                </ul>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveScene} disabled={!sceneName.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Scene
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Load Scene
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={() => setShowLoadDialog(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Load a previously saved scene</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {savedScenes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No saved scenes yet</p>
                  <p className="text-sm">Save your first scene to see it here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedScenes.map((scene) => (
                    <div
                      key={scene.id}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => handleLoadScene(scene)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{scene.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {TRAILER_OPTIONS.find(t => t.value === scene.trailerType)?.label} •
                            {' '}{scene.cargo.length} item{scene.cargo.length !== 1 ? 's' : ''} •
                            {' '}{formatSceneDate(scene.updatedAt)}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteScene(scene.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
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
  shortcut,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  shortcut?: string
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors ${
        checked ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
      }`}
    >
      <span className="text-sm flex items-center gap-2">
        {label}
        {shortcut && (
          <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{shortcut}</kbd>
        )}
      </span>
      {checked ? (
        <Eye className="h-4 w-4 text-primary" />
      ) : (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  )
}
