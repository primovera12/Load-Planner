'use client'

import { useState, useEffect } from 'react'
import {
  Save,
  FolderOpen,
  Trash2,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import {
  getSavedMappings,
  saveMapping,
  deleteMapping,
  incrementMappingUsage,
  suggestMappingName,
  formatMappingDate,
  type SavedMapping,
} from '@/lib/mapping-storage'
import type { ColumnMapping } from '@/lib/excel-parser'
import { cn } from '@/lib/utils'

interface SavedMappingsProps {
  currentMapping: ColumnMapping
  onLoadMapping: (mapping: ColumnMapping) => void
}

export function SavedMappings({
  currentMapping,
  onLoadMapping,
}: SavedMappingsProps) {
  const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Load saved mappings on mount
  useEffect(() => {
    setSavedMappings(getSavedMappings())
  }, [])

  // Handle save mapping
  const handleSave = () => {
    if (!saveName.trim()) return

    saveMapping(saveName, currentMapping)
    setSavedMappings(getSavedMappings())
    setShowSaveDialog(false)
    setSaveName('')
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2000)
  }

  // Handle load mapping
  const handleLoad = (mapping: SavedMapping) => {
    incrementMappingUsage(mapping.id)
    onLoadMapping(mapping.mapping)
    setIsExpanded(false)
  }

  // Handle delete mapping
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteMapping(id)
    setSavedMappings(getSavedMappings())
  }

  // Open save dialog with suggested name
  const openSaveDialog = () => {
    setSaveName(suggestMappingName(currentMapping))
    setShowSaveDialog(true)
  }

  const hasMapping = Object.values(currentMapping).some(Boolean)

  return (
    <div className="space-y-2">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={openSaveDialog}
          disabled={!hasMapping}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
            hasMapping
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          )}
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-green-400" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Mapping
            </>
          )}
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
            savedMappings.length > 0
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          )}
          disabled={savedMappings.length === 0}
        >
          <FolderOpen className="w-4 h-4" />
          Load ({savedMappings.length})
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Save Mapping</span>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Enter mapping name..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') setShowSaveDialog(false)
            }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              className={cn(
                'flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                saveName.trim()
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              )}
            >
              Save
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Saved mappings list */}
      {isExpanded && savedMappings.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {savedMappings.map((mapping) => (
            <button
              key={mapping.id}
              onClick={() => handleLoad(mapping)}
              className="w-full p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 text-left transition-colors group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">
                    {mapping.name}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatMappingDate(mapping.createdAt)}
                    </span>
                    {mapping.usedCount > 0 && (
                      <span>Used {mapping.usedCount}x</span>
                    )}
                  </div>
                  {/* Show mapped columns */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(mapping.mapping)
                      .filter(([, value]) => value)
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <span
                          key={key}
                          className="px-1.5 py-0.5 text-[10px] bg-slate-600 text-slate-300 rounded"
                        >
                          {key}: {value}
                        </span>
                      ))}
                    {Object.values(mapping.mapping).filter(Boolean).length > 4 && (
                      <span className="text-[10px] text-slate-500">
                        +{Object.values(mapping.mapping).filter(Boolean).length - 4} more
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(mapping.id, e)}
                  className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete mapping"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {isExpanded && savedMappings.length === 0 && (
        <div className="p-4 text-center text-slate-500 text-sm">
          No saved mappings yet
        </div>
      )}
    </div>
  )
}
