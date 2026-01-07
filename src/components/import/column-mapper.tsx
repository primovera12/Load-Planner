'use client'

import { useMemo } from 'react'
import { Check, AlertCircle, Info, ChevronDown } from 'lucide-react'
import type { ParsedSheet, ColumnMapping } from '@/lib/excel-parser'
import {
  getFieldLabel,
  isFieldRequired,
  validateMapping,
  getColumnSuggestions,
} from '@/lib/column-detector'
import { cn } from '@/lib/utils'

interface ColumnMapperProps {
  sheet: ParsedSheet
  mapping: ColumnMapping
  onMappingChange: (mapping: ColumnMapping) => void
}

const FIELD_ORDER: (keyof ColumnMapping)[] = [
  'name',
  'length',
  'width',
  'height',
  'weight',
  'quantity',
]

export function ColumnMapper({
  sheet,
  mapping,
  onMappingChange,
}: ColumnMapperProps) {
  // Validate current mapping
  const validation = useMemo(() => validateMapping(mapping), [mapping])

  // Get suggestions for unmapped fields
  const suggestions = useMemo(
    () => getColumnSuggestions(sheet, mapping),
    [sheet, mapping]
  )

  // Get currently used columns
  const usedColumns = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean)),
    [mapping]
  )

  const handleFieldChange = (field: keyof ColumnMapping, value: string) => {
    const newMapping = { ...mapping }
    if (value === '') {
      delete newMapping[field]
    } else {
      newMapping[field] = value
    }
    onMappingChange(newMapping)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Map Columns</h3>
        <div className="flex items-center gap-2">
          {validation.valid ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green-400 bg-green-500/10 rounded-full">
              <Check className="w-3.5 h-3.5" />
              Ready to import
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-500/10 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              {validation.errors.length} required field{validation.errors.length !== 1 ? 's' : ''} missing
            </span>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p>Map your spreadsheet columns to the cargo fields below.</p>
          <p className="text-blue-400/70 mt-1">
            Required fields: Length, Width, Height, Weight
          </p>
        </div>
      </div>

      {/* Column mapping fields */}
      <div className="grid gap-4">
        {FIELD_ORDER.map((field) => {
          const required = isFieldRequired(field)
          const currentValue = mapping[field] || ''
          const fieldSuggestions = suggestions[field] || []
          const isMapped = Boolean(currentValue)

          return (
            <div
              key={field}
              className={cn(
                'p-4 rounded-lg border transition-colors',
                isMapped
                  ? 'bg-slate-800/50 border-slate-700'
                  : required
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-slate-800/30 border-slate-700/50'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Field label */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      isMapped ? 'bg-green-500' : required ? 'bg-amber-500' : 'bg-slate-600'
                    )}
                  />
                  <span className="text-sm font-medium text-white">
                    {getFieldLabel(field)}
                  </span>
                  {required && !isMapped && (
                    <span className="text-xs text-amber-400">Required</span>
                  )}
                </div>

                {/* Column selector */}
                <div className="relative min-w-[200px]">
                  <select
                    value={currentValue}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    className={cn(
                      'w-full appearance-none px-3 py-2 pr-8 text-sm rounded-md border bg-slate-900 transition-colors cursor-pointer',
                      isMapped
                        ? 'border-green-500/30 text-white'
                        : 'border-slate-600 text-slate-400'
                    )}
                  >
                    <option value="">-- Select column --</option>

                    {/* Suggested columns first */}
                    {fieldSuggestions.length > 0 && (
                      <optgroup label="Suggested">
                        {fieldSuggestions.map((header) => (
                          <option
                            key={`suggested-${header}`}
                            value={header}
                            disabled={usedColumns.has(header) && mapping[field] !== header}
                          >
                            {header}
                            {usedColumns.has(header) && mapping[field] !== header ? ' (in use)' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {/* All columns */}
                    <optgroup label="All Columns">
                      {sheet.headers.map((header) => (
                        <option
                          key={header}
                          value={header}
                          disabled={usedColumns.has(header) && mapping[field] !== header}
                        >
                          {header}
                          {usedColumns.has(header) && mapping[field] !== header ? ' (in use)' : ''}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Sample data preview */}
              {isMapped && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1.5">Sample values:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sheet.rows.slice(0, 5).map((row, idx) => {
                      const value = row[currentValue]
                      if (value === null || value === undefined) return null
                      return (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded"
                        >
                          {String(value)}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Validation warnings */}
      {validation.warnings.length > 0 && (
        <div className="space-y-2">
          {validation.warnings.map((warning, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 bg-slate-800/50 rounded-lg"
            >
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0" />
              {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Summary of mapped columns for confirmation
 */
export function MappingSummary({ mapping }: { mapping: ColumnMapping }) {
  const validation = validateMapping(mapping)
  const mappedCount = Object.values(mapping).filter(Boolean).length

  return (
    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">Mapping Summary</h4>
        <span className="text-xs text-slate-400">
          {mappedCount} of 6 fields mapped
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {FIELD_ORDER.map((field) => {
          const value = mapping[field]
          const required = isFieldRequired(field)
          return (
            <div key={field} className="flex items-center justify-between gap-2">
              <span className="text-slate-400">{getFieldLabel(field)}:</span>
              {value ? (
                <span className="text-green-400 truncate max-w-[120px]">{value}</span>
              ) : (
                <span className={required ? 'text-amber-400' : 'text-slate-600'}>
                  {required ? 'Not set' : 'Optional'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {!validation.valid && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-amber-400">
            Please map all required fields to continue
          </p>
        </div>
      )}
    </div>
  )
}
