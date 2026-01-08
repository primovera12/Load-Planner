'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
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
} from 'lucide-react'

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
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload')

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

      if (data.error && !data.success) {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const visualizeLoad = () => {
    if (!result?.parsedLoad || !result.recommendations?.length) return

    const bestRec = result.recommendations.find(r => r.isBestChoice) || result.recommendations[0]
    const trailerType = bestRec.truck.category.toLowerCase().replace('_', '-') as
      'flatbed' | 'step-deck' | 'rgn' | 'lowboy' | 'double-drop'

    const cargoItems = result.parsedLoad.items.length > 0
      ? result.parsedLoad.items.map((item, index) => ({
          id: `cargo-${Date.now()}-${index}`,
          name: item.description || `Item ${index + 1}`,
          width: item.width,
          height: item.height,
          length: item.length,
          weight: item.weight,
          color: '#3b82f6',
          position: [0, 0, 0] as [number, number, number],
        }))
      : [{
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
              <div className="p-6">
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

      {/* Results Section */}
      {result && result.parsedLoad && (
        <div className="space-y-6">
          {/* Success Banner */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Analysis Complete!</p>
              <p className="text-sm text-green-600">
                Found {result.parsedLoad.items.length || 1} cargo item(s) with {result.recommendations?.length || 0} truck recommendations
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {result.recommendations && result.recommendations.length > 0 && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="flex items-center justify-between py-4">
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
                <div className="flex items-center gap-3">
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
