'use client'

import { useMemo, useState } from 'react'
import {
  Check,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Ruler,
  Scale,
  Hash,
} from 'lucide-react'
import type { CargoImportItem } from '@/lib/excel-parser'
import { cn } from '@/lib/utils'

interface ImportPreviewProps {
  items: CargoImportItem[]
  onItemsChange?: (items: CargoImportItem[]) => void
  maxHeight?: number
}

interface ValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Validate a single cargo item
 */
function validateItem(item: CargoImportItem): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check required numeric fields
  if (!item.length || item.length <= 0) errors.push('Invalid length')
  if (!item.width || item.width <= 0) errors.push('Invalid width')
  if (!item.height || item.height <= 0) errors.push('Invalid height')
  if (!item.weight || item.weight <= 0) errors.push('Invalid weight')

  // Check reasonable ranges
  if (item.length && item.length > 100) warnings.push('Length exceeds 100 ft')
  if (item.width && item.width > 20) warnings.push('Width exceeds 20 ft')
  if (item.height && item.height > 20) warnings.push('Height exceeds 20 ft')
  if (item.weight && item.weight > 200000) warnings.push('Weight exceeds 200,000 lbs')

  // Check quantity
  if (item.quantity && item.quantity > 100) warnings.push('Large quantity')

  // Check for missing name
  if (!item.name || item.name.trim() === '') warnings.push('No name')

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  }
}

export function ImportPreview({
  items,
  onItemsChange,
  maxHeight = 400,
}: ImportPreviewProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [sortField, setSortField] = useState<keyof CargoImportItem | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Validate all items
  const validations = useMemo(
    () => items.map((item) => validateItem(item)),
    [items]
  )

  // Calculate summary stats
  const summary = useMemo(() => {
    const validCount = validations.filter((v) => v.valid).length
    const warningCount = validations.filter((v) => v.valid && v.warnings.length > 0).length
    const errorCount = validations.filter((v) => !v.valid).length

    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0) * (item.quantity || 1), 0)
    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0)

    return { validCount, warningCount, errorCount, totalWeight, totalItems }
  }, [items, validations])

  // Sort items
  const sortedItems = useMemo(() => {
    if (!sortField) return items.map((item, idx) => ({ item, idx }))

    return [...items]
      .map((item, idx) => ({ item, idx }))
      .sort((a, b) => {
        const aVal = a.item[sortField]
        const bVal = b.item[sortField]

        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        }

        const aStr = String(aVal)
        const bStr = String(bVal)
        return sortDirection === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr)
      })
  }, [items, sortField, sortDirection])

  const handleSort = (field: keyof CargoImportItem) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleRow = (idx: number) => {
    setExpandedRow((current) => (current === idx ? null : idx))
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-800/30 rounded-lg border border-slate-700/50">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No items to preview</p>
        <p className="text-sm text-slate-500 mt-1">
          Map your columns to see import data
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-4">
          {/* Valid count */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm text-slate-300">{summary.validCount} valid</span>
          </div>

          {/* Warning count */}
          {summary.warningCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm text-slate-300">{summary.warningCount} warnings</span>
            </div>
          )}

          {/* Error count */}
          {summary.errorCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm text-slate-300">{summary.errorCount} errors</span>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <Hash className="w-4 h-4" />
            {summary.totalItems} items
          </span>
          <span className="flex items-center gap-1.5">
            <Scale className="w-4 h-4" />
            {summary.totalWeight.toLocaleString()} lbs
          </span>
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-auto rounded-lg border border-slate-700"
        style={{ maxHeight }}
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-800 sticky top-0">
            <tr>
              <th className="w-10 px-3 py-2" />
              <SortableHeader
                label="Name"
                field="name"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Length"
                field="length"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="Width"
                field="width"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="Height"
                field="height"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="Weight"
                field="weight"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                label="Qty"
                field="quantity"
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {sortedItems.map(({ item, idx }) => {
              const validation = validations[idx]
              const isExpanded = expandedRow === idx

              return (
                <RowGroup key={idx}>
                  <tr
                    className={cn(
                      'hover:bg-slate-800/50 cursor-pointer transition-colors',
                      !validation.valid && 'bg-red-500/5',
                      validation.valid && validation.warnings.length > 0 && 'bg-amber-500/5'
                    )}
                    onClick={() => toggleRow(idx)}
                  >
                    {/* Status indicator */}
                    <td className="px-3 py-2">
                      {!validation.valid ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : validation.warnings.length > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-3 py-2 font-medium text-white">
                      {item.name || <span className="text-slate-500 italic">Unnamed</span>}
                    </td>

                    {/* Dimensions */}
                    <td className="px-3 py-2 text-right text-slate-300 font-mono">
                      {item.length ? `${item.length}'` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300 font-mono">
                      {item.width ? `${item.width}'` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300 font-mono">
                      {item.height ? `${item.height}'` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300 font-mono">
                      {item.weight ? `${item.weight.toLocaleString()}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-300 font-mono">
                      {item.quantity || 1}
                    </td>

                    {/* Expand indicator */}
                    <td className="px-3 py-2">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </td>
                  </tr>

                  {/* Expanded details */}
                  {isExpanded && (
                    <tr className="bg-slate-800/30">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="flex flex-wrap gap-4">
                          {/* Dimensions detail */}
                          <div className="flex items-center gap-2 text-xs">
                            <Ruler className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-400">
                              {item.length || 0}' L × {item.width || 0}' W × {item.height || 0}' H
                            </span>
                          </div>

                          {/* Weight detail */}
                          <div className="flex items-center gap-2 text-xs">
                            <Scale className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-400">
                              {((item.weight || 0) * (item.quantity || 1)).toLocaleString()} lbs total
                            </span>
                          </div>

                          {/* Validation messages */}
                          {validation.errors.map((err, i) => (
                            <span
                              key={`err-${i}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded"
                            >
                              <XCircle className="w-3 h-3" />
                              {err}
                            </span>
                          ))}
                          {validation.warnings.map((warn, i) => (
                            <span
                              key={`warn-${i}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {warn}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </RowGroup>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      {summary.errorCount > 0 && (
        <p className="text-sm text-amber-400">
          Items with errors will be skipped during import
        </p>
      )}
    </div>
  )
}

/**
 * Row group component for animation grouping
 */
function RowGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/**
 * Sortable table header
 */
function SortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  align = 'left',
}: {
  label: string
  field: keyof CargoImportItem
  sortField: keyof CargoImportItem | null
  sortDirection: 'asc' | 'desc'
  onSort: (field: keyof CargoImportItem) => void
  align?: 'left' | 'right'
}) {
  const isActive = sortField === field

  return (
    <th
      className={cn(
        'px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors',
        align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive && (
          sortDirection === 'asc' ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )
        )}
      </span>
    </th>
  )
}
