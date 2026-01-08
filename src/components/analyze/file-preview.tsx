'use client'

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react'

interface FilePreviewProps {
  file: File
  maxRows?: number
}

interface PreviewData {
  headers: string[]
  rows: unknown[][]
  totalRows: number
  sheetName: string
  detectedColumns: Record<string, number>
}

// Column detection patterns (simplified version from universal-parser)
const detectColumnType = (header: string): string | null => {
  const h = header.toLowerCase().trim()
  if (h.match(/desc|name|item|part|product|material|cargo|equipment/i)) return 'description'
  if (h.match(/qty|quantity|count|pcs/i)) return 'quantity'
  if (h.match(/length|len|lng|^l$/i)) return 'length'
  if (h.match(/width|wid|^w$/i)) return 'width'
  if (h.match(/height|hgt|^h$/i)) return 'height'
  if (h.match(/weight|wt|wgt|mass|gw|lbs|kg/i)) return 'weight'
  return null
}

export function FilePreview({ file, maxRows = 5 }: FilePreviewProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    async function loadPreview() {
      try {
        setLoading(true)
        setError(null)

        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })

        if (workbook.SheetNames.length === 0) {
          throw new Error('No sheets found in file')
        }

        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]

        if (jsonData.length < 1) {
          throw new Error('File appears to be empty')
        }

        // Find header row
        let headerRowIndex = 0
        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i] as unknown[]
          const rowStr = row.join(' ').toLowerCase()
          if (rowStr.match(/length|width|height|weight|description|dimension/i)) {
            headerRowIndex = i
            break
          }
        }

        const headers = (jsonData[headerRowIndex] as unknown[]).map(h => String(h || ''))
        const dataRows = jsonData.slice(headerRowIndex + 1, headerRowIndex + 1 + maxRows)
        const totalRows = jsonData.length - headerRowIndex - 1

        // Detect column types
        const detectedColumns: Record<string, number> = {}
        headers.forEach((header, index) => {
          const type = detectColumnType(header)
          if (type && detectedColumns[type] === undefined) {
            detectedColumns[type] = index
          }
        })

        setPreview({
          headers,
          rows: dataRows,
          totalRows,
          sheetName,
          detectedColumns,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to preview file')
      } finally {
        setLoading(false)
      }
    }

    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      loadPreview()
    } else {
      setLoading(false)
      setError('Preview not available for this file type')
    }
  }, [file, maxRows])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center text-muted-foreground">
            Loading preview...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return null // Don't show anything if preview fails
  }

  if (!preview) {
    return null
  }

  const getColumnBadge = (index: number) => {
    const types = Object.entries(preview.detectedColumns)
    const match = types.find(([, idx]) => idx === index)
    if (match) {
      const colors: Record<string, string> = {
        description: 'bg-blue-100 text-blue-800',
        quantity: 'bg-purple-100 text-purple-800',
        length: 'bg-green-100 text-green-800',
        width: 'bg-green-100 text-green-800',
        height: 'bg-green-100 text-green-800',
        weight: 'bg-orange-100 text-orange-800',
      }
      return (
        <Badge variant="secondary" className={`ml-1 text-xs ${colors[match[0]] || ''}`}>
          {match[0]}
        </Badge>
      )
    }
    return null
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
            Preview: {preview.sheetName}
            <span className="text-muted-foreground font-normal">
              ({preview.totalRows} rows)
            </span>
          </CardTitle>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {preview.headers.map((header, index) => (
                    <TableHead key={index} className="whitespace-nowrap">
                      {header || <span className="text-muted-foreground italic">empty</span>}
                      {getColumnBadge(index)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {(row as unknown[]).map((cell, cellIndex) => (
                      <TableCell key={cellIndex} className="whitespace-nowrap">
                        {cell !== null && cell !== undefined && cell !== ''
                          ? String(cell)
                          : <span className="text-muted-foreground">-</span>
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {preview.totalRows > maxRows && (
            <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/50 border-t">
              Showing {maxRows} of {preview.totalRows} rows
            </div>
          )}
          {Object.keys(preview.detectedColumns).length > 0 && (
            <div className="px-4 py-2 text-xs text-muted-foreground border-t">
              Auto-detected columns:{' '}
              {Object.keys(preview.detectedColumns).join(', ')}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
