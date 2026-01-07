'use client'

import { useCallback, useState } from 'react'
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  onClear?: () => void
  selectedFile?: File | null
  isProcessing?: boolean
  error?: string | null
  acceptedTypes?: string[]
}

const DEFAULT_ACCEPTED_TYPES = [
  '.xlsx',
  '.xls',
  '.csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]

export function FileUpload({
  onFileSelect,
  onClear,
  selectedFile,
  isProcessing = false,
  error = null,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        if (isValidFile(file, acceptedTypes)) {
          onFileSelect(file)
        }
      }
    },
    [onFileSelect, acceptedTypes]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onFileSelect(files[0])
      }
      // Reset input value to allow re-selecting same file
      e.target.value = ''
    },
    [onFileSelect]
  )

  const handleClear = useCallback(() => {
    onClear?.()
  }, [onClear])

  // Determine display state
  const hasFile = selectedFile !== null
  const hasError = error !== null

  return (
    <div className="w-full">
      {/* Drop zone / File selected display */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all duration-200',
          isDragging && 'border-blue-500 bg-blue-500/10',
          !isDragging && !hasFile && !hasError && 'border-slate-600 hover:border-slate-500 bg-slate-800/50',
          hasFile && !hasError && 'border-green-500/50 bg-green-500/10',
          hasError && 'border-red-500/50 bg-red-500/10'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Hidden file input */}
        <input
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />

        <div className="p-8 text-center">
          {isProcessing ? (
            // Processing state
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <div>
                <p className="text-slate-300 font-medium">Processing file...</p>
                <p className="text-sm text-slate-500 mt-1">Parsing spreadsheet data</p>
              </div>
            </div>
          ) : hasFile && !hasError ? (
            // File selected state
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-slate-300 font-medium">{selectedFile?.name}</p>
                <p className="text-sm text-slate-500 mt-1">
                  {formatFileSize(selectedFile?.size || 0)}
                </p>
              </div>
              {onClear && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleClear()
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                  Remove file
                </button>
              )}
            </div>
          ) : hasError ? (
            // Error state
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-red-400 font-medium">Error processing file</p>
                <p className="text-sm text-red-400/70 mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleClear()
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
                Try again
              </button>
            </div>
          ) : (
            // Default drop zone state
            <div className="space-y-3">
              <div
                className={cn(
                  'mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors',
                  isDragging ? 'bg-blue-500/20' : 'bg-slate-700'
                )}
              >
                {isDragging ? (
                  <FileSpreadsheet className="w-6 h-6 text-blue-400" />
                ) : (
                  <Upload className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-slate-300 font-medium">
                  {isDragging ? 'Drop your file here' : 'Drag & drop your file here'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  or click to browse
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Supports Excel (.xlsx, .xls) and CSV files</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Check if file type is valid
 */
function isValidFile(file: File, acceptedTypes: string[]): boolean {
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
  return (
    acceptedTypes.includes(file.type) ||
    acceptedTypes.includes(fileExtension)
  )
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
