'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Upload,
  Table2,
  Eye,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Truck,
  AlertCircle,
} from 'lucide-react'
import { FileUpload } from '@/components/import/file-upload'
import { ColumnMapper, MappingSummary } from '@/components/import/column-mapper'
import { ImportPreview } from '@/components/import/import-preview'
import { TrailerSelector, recommendTrailer } from '@/components/import/trailer-selector'
import { SavedMappings } from '@/components/import/saved-mappings'
import { MultiTrailerPanel } from '@/components/import/multi-trailer-panel'
import { parseFile, convertToCargoItems } from '@/lib/excel-parser'
import { detectColumnMapping, validateMapping } from '@/lib/column-detector'
import type { ParseResult, ColumnMapping, CargoImportItem } from '@/lib/excel-parser'
import type { CargoItem } from '@/components/3d/cargo'
import { cn } from '@/lib/utils'

type ImportStep = 'upload' | 'map' | 'preview' | 'complete'

const STEPS: { id: ImportStep; label: string; icon: React.ReactNode }[] = [
  { id: 'upload', label: 'Upload File', icon: <Upload className="w-4 h-4" /> },
  { id: 'map', label: 'Map Columns', icon: <Table2 className="w-4 h-4" /> },
  { id: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
  { id: 'complete', label: 'Complete', icon: <CheckCircle2 className="w-4 h-4" /> },
]

export default function ImportPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload')

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  // Parsed data state
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [selectedSheet, setSelectedSheet] = useState(0)

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})

  // Preview data state
  const [previewItems, setPreviewItems] = useState<CargoImportItem[]>([])

  // Trailer selection state
  const [selectedTrailer, setSelectedTrailer] = useState('flatbed')

  // Get current sheet data
  const currentSheet = parseResult?.sheets[selectedSheet] || null

  // Validate current mapping
  const mappingValidation = useMemo(
    () => validateMapping(columnMapping),
    [columnMapping]
  )

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file)
    setFileError(null)
    setIsProcessing(true)

    try {
      const result = await parseFile(file)

      if (!result.success || result.sheets.length === 0) {
        setFileError(result.error || 'No data found in file')
        setIsProcessing(false)
        return
      }

      setParseResult(result)
      setSelectedSheet(0)

      // Auto-detect column mapping for first sheet
      const detectedMapping = detectColumnMapping(result.sheets[0])
      setColumnMapping(detectedMapping)

      setIsProcessing(false)
      setCurrentStep('map')
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Failed to parse file')
      setIsProcessing(false)
    }
  }, [])

  // Handle file clear
  const handleFileClear = useCallback(() => {
    setSelectedFile(null)
    setFileError(null)
    setParseResult(null)
    setColumnMapping({})
    setPreviewItems([])
    setCurrentStep('upload')
  }, [])

  // Handle sheet change
  const handleSheetChange = useCallback(
    (index: number) => {
      if (!parseResult) return
      setSelectedSheet(index)
      const detectedMapping = detectColumnMapping(parseResult.sheets[index])
      setColumnMapping(detectedMapping)
    },
    [parseResult]
  )

  // Handle mapping change
  const handleMappingChange = useCallback((newMapping: ColumnMapping) => {
    setColumnMapping(newMapping)
  }, [])

  // Go to preview step
  const handleGoToPreview = useCallback(() => {
    if (!currentSheet) return

    const items = convertToCargoItems(currentSheet, columnMapping)
    setPreviewItems(items)

    // Calculate recommended trailer based on cargo dimensions
    const validItems = items.filter((item) => item.height > 0 && item.width > 0)
    if (validItems.length > 0) {
      const maxHeight = Math.max(...validItems.map((item) => item.height))
      const maxWidth = Math.max(...validItems.map((item) => item.width))
      const totalWeight = validItems.reduce((sum, item) => sum + (item.weight * (item.quantity || 1)), 0)
      const recommended = recommendTrailer(maxHeight, maxWidth, totalWeight)
      setSelectedTrailer(recommended)
    }

    setCurrentStep('preview')
  }, [currentSheet, columnMapping])

  // Handle import completion - send to visualizer
  const handleImport = useCallback(() => {
    // Filter out invalid items
    const validItems = previewItems.filter(
      (item) =>
        item.length > 0 &&
        item.width > 0 &&
        item.height > 0 &&
        item.weight > 0
    )

    if (validItems.length === 0) {
      return
    }

    // Expand quantities into individual items
    const expandedItems: CargoItem[] = []
    validItems.forEach((item, baseIdx) => {
      const qty = item.quantity || 1
      for (let i = 0; i < qty; i++) {
        expandedItems.push({
          id: `import-${Date.now()}-${baseIdx}-${i}`,
          name: item.name || `Item ${baseIdx + 1}`,
          length: item.length,
          width: item.width,
          height: item.height,
          weight: item.weight,
          color: getColorForIndex(expandedItems.length),
          position: [0, 0, 0],
        })
      }
    })

    // Store in session storage and redirect to visualizer
    sessionStorage.setItem(
      'visualize-cargo',
      JSON.stringify({
        trailerType: selectedTrailer,
        cargo: expandedItems,
        source: 'import',
      })
    )

    setCurrentStep('complete')

    // Redirect after brief delay to show success state
    setTimeout(() => {
      router.push('/visualize')
    }, 1500)
  }, [previewItems, router, selectedTrailer])

  // Navigation helpers
  const canGoBack = currentStep !== 'upload' && currentStep !== 'complete'
  const canGoNext =
    (currentStep === 'upload' && parseResult !== null) ||
    (currentStep === 'map' && mappingValidation.valid) ||
    (currentStep === 'preview' && previewItems.some((item) => item.length > 0))

  const handleBack = () => {
    switch (currentStep) {
      case 'map':
        setCurrentStep('upload')
        break
      case 'preview':
        setCurrentStep('map')
        break
    }
  }

  const handleNext = () => {
    switch (currentStep) {
      case 'upload':
        setCurrentStep('map')
        break
      case 'map':
        handleGoToPreview()
        break
      case 'preview':
        handleImport()
        break
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Import Cargo</h1>
                <p className="text-sm text-slate-400">
                  Import cargo items from Excel or CSV
                </p>
              </div>
            </div>

            {/* Step indicator */}
            <div className="hidden md:flex items-center gap-2">
              {STEPS.map((step, idx) => {
                const stepIdx = STEPS.findIndex((s) => s.id === currentStep)
                const isActive = step.id === currentStep
                const isComplete = idx < stepIdx
                const isPending = idx > stepIdx

                return (
                  <div key={step.id} className="flex items-center">
                    {idx > 0 && (
                      <div
                        className={cn(
                          'w-8 h-0.5 mr-2',
                          isComplete ? 'bg-blue-500' : 'bg-slate-700'
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors',
                        isActive && 'bg-blue-500/20 text-blue-400',
                        isComplete && 'bg-green-500/20 text-green-400',
                        isPending && 'bg-slate-800 text-slate-500'
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        step.icon
                      )}
                      <span className="hidden lg:inline">{step.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Upload step */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <div className="text-center max-w-lg mx-auto mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Upload Your Spreadsheet
              </h2>
              <p className="text-slate-400">
                Upload an Excel (.xlsx, .xls) or CSV file containing your cargo
                data. We'll help you map the columns to the correct fields.
              </p>
            </div>

            <FileUpload
              onFileSelect={handleFileSelect}
              onClear={handleFileClear}
              selectedFile={selectedFile}
              isProcessing={isProcessing}
              error={fileError}
            />

            {/* Sample format info */}
            <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h3 className="text-sm font-medium text-white mb-3">
                Expected Format
              </h3>
              <p className="text-sm text-slate-400 mb-3">
                Your spreadsheet should include columns for:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-slate-300">Length (feet)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-slate-300">Width (feet)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-slate-300">Height (feet)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-slate-300">Weight (lbs)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-slate-400">Name (optional)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-slate-400">Quantity (optional)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map columns step */}
        {currentStep === 'map' && currentSheet && (
          <div className="space-y-6">
            {/* Sheet selector (if multiple sheets) */}
            {parseResult && parseResult.sheets.length > 1 && (
              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <span className="text-sm text-slate-400">Sheet:</span>
                <div className="flex gap-2">
                  {parseResult.sheets.map((sheet, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSheetChange(idx)}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-md transition-colors',
                        selectedSheet === idx
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      )}
                    >
                      {sheet.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data stats */}
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>{currentSheet.headers.length} columns found</span>
              <span className="text-slate-600">•</span>
              <span>{currentSheet.rows.length} rows found</span>
            </div>

            {/* Saved mappings */}
            <SavedMappings
              currentMapping={columnMapping}
              onLoadMapping={handleMappingChange}
            />

            {/* Column mapper */}
            <ColumnMapper
              sheet={currentSheet}
              mapping={columnMapping}
              onMappingChange={handleMappingChange}
            />
          </div>
        )}

        {/* Preview step */}
        {currentStep === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Preview Import</h2>
                <p className="text-sm text-slate-400">
                  Review the data and select a trailer type
                </p>
              </div>
              <MappingSummary mapping={columnMapping} />
            </div>

            {/* Trailer Selection */}
            <TrailerSelector
              selectedTrailer={selectedTrailer}
              onSelect={setSelectedTrailer}
              recommendedTrailer={(() => {
                const validItems = previewItems.filter((item) => item.height > 0)
                if (validItems.length === 0) return undefined
                const maxHeight = Math.max(...validItems.map((item) => item.height))
                const maxWidth = Math.max(...validItems.map((item) => item.width))
                const totalWeight = validItems.reduce((sum, item) => sum + (item.weight * (item.quantity || 1)), 0)
                return recommendTrailer(maxHeight, maxWidth, totalWeight)
              })()}
            />

            {/* Multi-Trailer Analysis */}
            <MultiTrailerPanel
              items={previewItems}
              trailerType={selectedTrailer}
              onSplitLoad={(splitLoads) => {
                // Use only the first trailer's load
                if (splitLoads.length > 0) {
                  setPreviewItems(splitLoads[0])
                }
              }}
            />

            {/* Cargo Preview */}
            <div className="pt-6 border-t border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Cargo Items</h3>
              <ImportPreview items={previewItems} maxHeight={400} />
            </div>
          </div>
        )}

        {/* Complete step */}
        {currentStep === 'complete' && (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Import Complete!
            </h2>
            <p className="text-slate-400 mb-6">
              Redirecting to 3D visualizer...
            </p>
            <div className="flex items-center justify-center gap-2 text-blue-400">
              <Truck className="w-5 h-5 animate-pulse" />
              <span>Loading visualization</span>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        {currentStep !== 'complete' && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={handleBack}
              disabled={!canGoBack}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                canGoBack
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-slate-600 cursor-not-allowed'
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className={cn(
                'inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg transition-colors',
                canGoNext
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              )}
            >
              {currentStep === 'preview' ? (
                <>
                  Import & Visualize
                  <Truck className="w-4 h-4" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

/**
 * Get a color for cargo item by index
 */
function getColorForIndex(index: number): string {
  const colors = [
    '#3b82f6', // blue
    '#22c55e', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#14b8a6', // teal
  ]
  return colors[index % colors.length]
}
