'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
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
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { FilePreview } from '@/components/analyze/file-preview'

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

interface UniversalAnalyzerProps {
  /** Called when analysis completes successfully */
  onComplete?: (result: AnalyzeResponse) => void
  /** Skip automatic redirect to /load-plan (use with onComplete) */
  skipRedirect?: boolean
  /** Initial input mode */
  initialMode?: 'upload' | 'text'
  /** Initial text value */
  initialText?: string
}

export function UniversalAnalyzer({
  onComplete,
  skipRedirect = false,
  initialMode = 'upload',
  initialText = '',
}: UniversalAnalyzerProps = {}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState(initialText)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'upload' | 'text'>(initialMode)

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

      if (data.error && !data.success) {
        setError(data.error)
        setResult(data)
      } else if (data.success) {
        // Call onComplete callback if provided
        if (onComplete) {
          onComplete(data)
        }

        // Redirect to load plan page unless skipRedirect is true
        if (!skipRedirect) {
          sessionStorage.setItem('load-plan-result', JSON.stringify(data))
          router.push('/load-plan')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
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

      {/* Warning Message - only shown if analysis failed but returned partial data */}
      {result?.warning && !error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{result.warning}</p>
        </div>
      )}
    </div>
  )
}
