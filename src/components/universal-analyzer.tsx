'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ParsedLoadDisplay } from './parsed-load-display'
import { TruckRecommendationList } from './truck-recommendation'
import { AnalyzeResponse } from '@/types'
import { sampleEmails } from '@/data/sample-emails'
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  FileText,
  Image,
  File,
  X,
  Box,
  Route,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Truck,
  Download,
  MapPin,
  Weight,
  Ruler,
  FileWarning,
} from 'lucide-react'
import { FilePreview } from '@/components/analyze/file-preview'
import { EditableCargoTable } from '@/components/editable-cargo-table'
import { LoadItem } from '@/types/load'

const ACCEPTED_TYPES = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.ms-excel': 'Excel',
  'text/csv': 'CSV',
  'application/pdf': 'PDF',
  'image/png': 'Image',
  'image/jpeg': 'Image',
  'image/gif': 'Image',
  'image/webp': 'Image',
  'text/plain': 'Text',
  'message/rfc822': 'Email',
}

function getFileIcon(type: string) {
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
    return <FileSpreadsheet className="h-8 w-8 text-green-600" />
  }
  if (type.includes('pdf')) {
    return <FileText className="h-8 w-8 text-red-500" />
  }
  if (type.includes('image')) {
    return <Image className="h-8 w-8 text-blue-500" />
  }
  return <File className="h-8 w-8 text-gray-500" />
}

export function UniversalAnalyzer() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload')
  // Origin/destination state (for when not in parsed data)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  // Editable items state (modified version of parsed items)
  const [editedItems, setEditedItems] = useState<LoadItem[] | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setError(null)
      setResult(null)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const clearFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const analyze = async () => {
    if (inputMode === 'upload' && !file) {
      setError('Please upload a file to analyze')
      return
    }
    if (inputMode === 'text' && !textInput.trim()) {
      setError('Please enter some text to analyze')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()

      if (inputMode === 'upload' && file) {
        formData.append('file', file)
      } else if (inputMode === 'text' && textInput) {
        formData.append('text', textInput)
      }

      const response = await fetch('/api/analyze-file', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze')
      }

      setResult(data)
      // Initialize edited items from parsed result
      if (data.success && data.parsedLoad?.items) {
        setEditedItems(data.parsedLoad.items)
      }

      if (data.error && !data.success) {
        setError(data.error)
      }

      // Check if origin/destination is missing - show prompt
      if (data.success && data.parsedLoad) {
        const hasOrigin = data.parsedLoad.origin && data.parsedLoad.origin.trim() !== ''
        const hasDest = data.parsedLoad.destination && data.parsedLoad.destination.trim() !== ''
        if (!hasOrigin || !hasDest) {
          setShowLocationPrompt(true)
          // Pre-fill if partial data exists
          if (hasOrigin) setOrigin(data.parsedLoad.origin || '')
          if (hasDest) setDestination(data.parsedLoad.destination || '')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle items being edited - this will update the result with new items
  const handleItemsChange = (newItems: LoadItem[]) => {
    setEditedItems(newItems)
    // Note: To recalculate load plan, user would need to re-analyze
    // For now, we just update the display items
  }

  // Get the current items (edited or original)
  const currentItems = editedItems || result?.parsedLoad?.items || []

  const downloadPDF = async () => {
    if (!result?.loadPlan || result.loadPlan.loads.length === 0) return

    setIsDownloadingPDF(true)
    try {
      const response = await fetch('/api/generate-load-plan-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loadPlan: result.loadPlan,
          options: {
            title: 'Load Plan',
            reference: `LP-${Date.now()}`,
            date: new Date().toLocaleDateString(),
            origin: origin || result.parsedLoad?.origin || 'Not specified',
            destination: destination || result.parsedLoad?.destination || 'Not specified',
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
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

  const visualizeLoad = () => {
    // Use edited items if available, otherwise loadPlan or recommendations
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']

    // Get trailer type from loadPlan or recommendations
    let trailerType: 'flatbed' | 'step-deck' | 'rgn' | 'lowboy' | 'double-drop' = 'step-deck'
    if (result?.loadPlan && result.loadPlan.loads.length > 0) {
      trailerType = result.loadPlan.loads[0].recommendedTruck.category.toLowerCase().replace('_', '-') as typeof trailerType
    } else if (result?.recommendations?.length) {
      const bestRec = result.recommendations.find(r => r.isBestChoice) || result.recommendations[0]
      trailerType = bestRec.truck.category.toLowerCase().replace('_', '-') as typeof trailerType
    }

    // Use edited items, or fall back to loadPlan items, or parsedLoad items
    const itemsToVisualize = currentItems.length > 0
      ? currentItems
      : result?.loadPlan?.loads[0]?.items || result?.parsedLoad?.items || []

    if (itemsToVisualize.length === 0) {
      // Create single cargo from parsed load summary
      if (result?.parsedLoad) {
        const cargoItems = [{
          id: `cargo-${Date.now()}`,
          name: result.parsedLoad.description || 'Cargo',
          width: result.parsedLoad.width,
          height: result.parsedLoad.height,
          length: result.parsedLoad.length,
          weight: result.parsedLoad.weight,
          color: '#3b82f6',
          position: [0, 0, 0] as [number, number, number],
        }]

        sessionStorage.setItem('visualize-cargo', JSON.stringify({
          trailerType,
          cargo: cargoItems,
          source: 'analyze',
        }))

        router.push('/visualize')
      }
      return
    }

    const cargoItems = itemsToVisualize.map((item, index) => ({
      id: item.id || `cargo-${Date.now()}-${index}`,
      name: item.description || `Item ${index + 1}`,
      width: item.width,
      height: item.height,
      length: item.length,
      weight: item.weight,
      color: item.color || colors[index % colors.length],
      position: [0, 0, 0] as [number, number, number],
    }))

    sessionStorage.setItem('visualize-cargo', JSON.stringify({
      trailerType,
      cargo: cargoItems,
      loadPlan: result?.loadPlan,
      source: 'analyze',
    }))

    router.push('/visualize')
  }

  const planRoute = () => {
    if (!result?.parsedLoad) return

    const cargo = result.parsedLoad.items.length > 0
      ? {
          width: Math.max(...result.parsedLoad.items.map(i => i.width)),
          height: Math.max(...result.parsedLoad.items.map(i => i.height)),
          length: result.parsedLoad.items.reduce((sum, i) => sum + i.length, 0),
          weight: result.parsedLoad.items.reduce((sum, i) => sum + i.weight, 0),
        }
      : {
          width: result.parsedLoad.width,
          height: result.parsedLoad.height,
          length: result.parsedLoad.length,
          weight: result.parsedLoad.weight,
        }

    sessionStorage.setItem('route-cargo', JSON.stringify({
      source: 'analyze',
      cargo,
      origin: result.parsedLoad.origin || '',
      destination: result.parsedLoad.destination || '',
    }))

    router.push('/routes')
  }

  const loadSampleEmail = (index: number) => {
    const sample = sampleEmails[index]
    if (sample) {
      setTextInput(sample.email)
      setInputMode('text')
      setResult(null)
      setError(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg w-fit mx-auto">
        <button
          onClick={() => setInputMode('upload')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            inputMode === 'upload'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Upload className="h-4 w-4 inline mr-2" />
          Upload File
        </button>
        <button
          onClick={() => setInputMode('text')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            inputMode === 'text'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          Paste Text
        </button>
      </div>

      {/* Upload Mode */}
      {inputMode === 'upload' && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.eml"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!file ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  cursor-pointer p-12 border-2 border-dashed rounded-lg m-4 transition-all
                  ${isDragging
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`
                    p-4 rounded-full mb-4 transition-colors
                    ${isDragging ? 'bg-primary/10' : 'bg-muted'}
                  `}>
                    <Upload className={`h-10 w-10 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Drop your file here
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    or click to browse
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Excel', 'CSV', 'PDF', 'Images', 'Text'].map((type) => (
                      <span
                        key={type}
                        className="px-2 py-1 bg-muted rounded text-xs text-muted-foreground"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      clearFile()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {/* File Preview for spreadsheets */}
                {(file.name.toLowerCase().endsWith('.xlsx') ||
                  file.name.toLowerCase().endsWith('.xls') ||
                  file.name.toLowerCase().endsWith('.csv')) && (
                  <FilePreview file={file} maxRows={5} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Text Mode */}
      {inputMode === 'text' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <Textarea
              placeholder="Paste your freight request email, packing list, or cargo details here...

Example:
We need a quote to move a CAT 320 Excavator.
Dimensions: 32' L x 10' W x 10'6&quot; H
Weight: 52,000 lbs
From: Houston, TX
To: Dallas, TX"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Try a sample:</span>
              {sampleEmails.slice(0, 4).map((sample, index) => (
                <Button
                  key={sample.id}
                  variant="outline"
                  size="sm"
                  onClick={() => loadSampleEmail(index)}
                >
                  {sample.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PROMINENT ANALYZE BUTTON */}
      <div className="flex justify-center">
        <Button
          onClick={analyze}
          disabled={isLoading || (inputMode === 'upload' && !file) || (inputMode === 'text' && !textInput.trim())}
          size="lg"
          className="h-14 px-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 bg-gradient-to-r from-primary to-primary/80"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-3 h-6 w-6 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-3 h-6 w-6" />
              Analyze Now
            </>
          )}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Warning Message */}
      {result?.warning && !error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{result.warning}</p>
        </div>
      )}

      {/* Results Section */}
      {result && result.parsedLoad && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Analysis Complete!</p>
              <p className="text-sm text-green-600">
                Found {result.parsedLoad.items.length || 1} cargo item(s)
                {result.loadPlan && result.loadPlan.totalTrucks > 0 && (
                  <span className="ml-1">
                    requiring {result.loadPlan.totalTrucks} truck{result.loadPlan.totalTrucks > 1 ? 's' : ''}
                  </span>
                )}
                {result.metadata?.parseMethod === 'AI' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Parsed
                  </span>
                )}
              </p>
            </div>
            {result.parsedLoad.confidence > 0 && (
              <div className="text-right">
                <div className="text-xs text-green-600">Confidence</div>
                <div className={`text-lg font-bold ${
                  result.parsedLoad.confidence >= 75 ? 'text-green-700' :
                  result.parsedLoad.confidence >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {result.parsedLoad.confidence}%
                </div>
              </div>
            )}
          </div>

          {/* Origin/Destination Prompt */}
          {showLocationPrompt && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Add Route Information</p>
                    <p className="text-sm text-amber-600">
                      Origin and destination weren&apos;t found in the document. Add them for route planning and permits.
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
                    Skip for Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Load Plan Summary - Multi-truck display */}
          {result.loadPlan && result.loadPlan.loads.length > 0 && (
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <Truck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Load Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        {result.loadPlan.totalTrucks} truck{result.loadPlan.totalTrucks > 1 ? 's' : ''} • {result.loadPlan.totalWeight.toLocaleString()} lbs total
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={downloadPDF}
                    disabled={isDownloadingPDF}
                    variant="outline"
                    className="gap-2"
                  >
                    {isDownloadingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Download PDF
                      </>
                    )}
                  </Button>
                </div>

                {/* Truck cards - expanded with item details */}
                <div className="space-y-4">
                  {result.loadPlan.loads.map((load, index) => {
                    const colors = ['#9B59B6', '#1ABC9C', '#3498DB', '#E74C3C', '#F39C12', '#2ECC71']
                    const utilizationPct = Math.round((load.weight / load.recommendedTruck.maxCargoWeight) * 100)
                    const totalHeight = load.height + load.recommendedTruck.deckHeight

                    return (
                      <div
                        key={load.id}
                        className="bg-white rounded-lg border shadow-sm overflow-hidden"
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 border-b">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{load.recommendedTruck.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {load.items.length} item{load.items.length > 1 ? 's' : ''} • {load.weight.toLocaleString()} lbs ({utilizationPct}% capacity)
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {!load.isLegal && (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                                OoG - Permits Required
                              </span>
                            )}
                            {load.isLegal && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Legal
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Left: Specs */}
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Trailer Specs</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Deck Length:</span>
                                    <span className="ml-2 font-medium">{load.recommendedTruck.deckLength}&apos;</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Deck Width:</span>
                                    <span className="ml-2 font-medium">{load.recommendedTruck.deckWidth}&apos;</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Deck Height:</span>
                                    <span className="ml-2 font-medium">{load.recommendedTruck.deckHeight}&apos;</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Max Payload:</span>
                                    <span className="ml-2 font-medium">{load.recommendedTruck.maxCargoWeight.toLocaleString()} lbs</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Load Dimensions</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Length Used:</span>
                                    <span className="ml-2 font-medium">{load.length.toFixed(1)}&apos;</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Width Used:</span>
                                    <span className={`ml-2 font-medium ${load.width > 8.5 ? 'text-amber-600' : ''}`}>
                                      {load.width.toFixed(1)}&apos;
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Cargo Height:</span>
                                    <span className="ml-2 font-medium">{load.height.toFixed(1)}&apos;</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Total Height:</span>
                                    <span className={`ml-2 font-medium ${totalHeight > 13.5 ? 'text-red-600' : ''}`}>
                                      {totalHeight.toFixed(1)}&apos;
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Permits */}
                              {load.permitsRequired.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-2">Permits Required</p>
                                  <ul className="text-sm text-amber-700 space-y-1">
                                    {load.permitsRequired.map((permit, i) => (
                                      <li key={i} className="flex items-start gap-2">
                                        <FileWarning className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        {permit}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Right: Items list */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Cargo Items</p>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {load.items.map((item, itemIdx) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-3 p-2 bg-slate-50 rounded text-sm"
                                  >
                                    <div
                                      className="w-4 h-4 rounded flex-shrink-0"
                                      style={{ backgroundColor: colors[itemIdx % colors.length] }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{item.description || `Item ${itemIdx + 1}`}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {item.length}&apos;L × {item.width}&apos;W × {item.height}&apos;H • {item.weight.toLocaleString()} lbs
                                        {item.quantity > 1 && ` × ${item.quantity}`}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Mini visualization bar */}
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Load Preview</p>
                            <div className="relative h-12 bg-slate-200 rounded-lg overflow-hidden">
                              {/* Trailer bed */}
                              <div className="absolute inset-0 flex items-center px-2">
                                {load.items.map((item, itemIdx) => {
                                  const widthPct = Math.min((item.length / load.recommendedTruck.deckLength) * 100, 40)
                                  return (
                                    <div
                                      key={item.id}
                                      className="h-8 rounded mr-1 flex items-center justify-center text-white text-xs font-medium"
                                      style={{
                                        backgroundColor: colors[itemIdx % colors.length],
                                        width: `${Math.max(widthPct, 8)}%`,
                                        minWidth: '30px'
                                      }}
                                    >
                                      {itemIdx + 1}
                                    </div>
                                  )
                                })}
                              </div>
                              {/* Wheels */}
                              <div className="absolute bottom-0 right-2 flex gap-1">
                                <div className="w-3 h-3 bg-slate-600 rounded-full" />
                                <div className="w-3 h-3 bg-slate-600 rounded-full" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Warnings */}
                {result.loadPlan.warnings && result.loadPlan.warnings.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-1">Warnings:</p>
                    <ul className="text-sm text-amber-700 space-y-1">
                      {result.loadPlan.warnings.map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Unassigned items */}
                {result.loadPlan.unassignedItems && result.loadPlan.unassignedItems.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-800 mb-1">Items requiring special transport:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {result.loadPlan.unassignedItems.map((item, i) => (
                        <li key={i}>• {item.description} ({item.length}&apos;L × {item.width}&apos;W × {item.height}&apos;H, {item.weight.toLocaleString()} lbs)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {((result.recommendations && result.recommendations.length > 0) || (result.loadPlan && result.loadPlan.loads.length > 0)) && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Box className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Ready to Continue</p>
                    <p className="text-sm text-muted-foreground">
                      Visualize in 3D or plan your route with permits
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={planRoute} variant="outline" size="lg">
                    <Route className="mr-2 h-5 w-5" />
                    Plan Route
                  </Button>
                  <Button onClick={visualizeLoad} size="lg" className="shadow-md">
                    <Box className="mr-2 h-5 w-5" />
                    Visualize in 3D
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Editable Cargo Items Table */}
          {currentItems.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-4 text-lg font-semibold">Edit Cargo Items</h2>
              <EditableCargoTable
                items={currentItems}
                onItemsChange={handleItemsChange}
              />
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Parsed Load */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Extracted Information</h2>
              <ParsedLoadDisplay parsedLoad={result.parsedLoad} />
            </div>

            {/* Recommendations */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Truck Recommendations
                {result.recommendations && result.recommendations.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({result.recommendations.length} options)
                  </span>
                )}
              </h2>
              <TruckRecommendationList recommendations={result.recommendations || []} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
