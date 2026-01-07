/**
 * Save and load column mappings to/from localStorage
 */

import type { ColumnMapping } from './excel-parser'

const STORAGE_KEY = 'load-planner-column-mappings'

export interface SavedMapping {
  id: string
  name: string
  mapping: ColumnMapping
  createdAt: string
  usedCount: number
}

/**
 * Get all saved mappings
 */
export function getSavedMappings(): SavedMapping[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load mappings:', error)
    return []
  }
}

/**
 * Save a new mapping
 */
export function saveMapping(name: string, mapping: ColumnMapping): SavedMapping {
  const mappings = getSavedMappings()

  const newMapping: SavedMapping = {
    id: `mapping-${Date.now()}`,
    name: name.trim(),
    mapping,
    createdAt: new Date().toISOString(),
    usedCount: 0,
  }

  mappings.push(newMapping)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
  } catch (error) {
    console.error('Failed to save mapping:', error)
  }

  return newMapping
}

/**
 * Delete a saved mapping
 */
export function deleteMapping(id: string): void {
  const mappings = getSavedMappings()
  const filtered = mappings.filter((m) => m.id !== id)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error('Failed to delete mapping:', error)
  }
}

/**
 * Increment usage count for a mapping
 */
export function incrementMappingUsage(id: string): void {
  const mappings = getSavedMappings()
  const mapping = mappings.find((m) => m.id === id)

  if (mapping) {
    mapping.usedCount++
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
    } catch (error) {
      console.error('Failed to update mapping usage:', error)
    }
  }
}

/**
 * Get mapping by ID
 */
export function getMappingById(id: string): SavedMapping | null {
  const mappings = getSavedMappings()
  return mappings.find((m) => m.id === id) || null
}

/**
 * Check if a mapping with similar structure already exists
 */
export function findSimilarMapping(mapping: ColumnMapping): SavedMapping | null {
  const mappings = getSavedMappings()

  return mappings.find((saved) => {
    const savedKeys = Object.keys(saved.mapping).sort()
    const newKeys = Object.keys(mapping).sort()

    if (savedKeys.length !== newKeys.length) return false

    return savedKeys.every((key, index) => {
      return key === newKeys[index] && saved.mapping[key as keyof ColumnMapping] === mapping[key as keyof ColumnMapping]
    })
  }) || null
}

/**
 * Get recently used mappings (sorted by usage count)
 */
export function getRecentMappings(limit: number = 5): SavedMapping[] {
  const mappings = getSavedMappings()
  return mappings
    .sort((a, b) => b.usedCount - a.usedCount)
    .slice(0, limit)
}

/**
 * Generate a suggested name for a mapping based on column names
 */
export function suggestMappingName(mapping: ColumnMapping): string {
  const columns = Object.values(mapping).filter(Boolean)
  if (columns.length === 0) return 'Untitled Mapping'

  // Use first 2-3 column names
  const preview = columns.slice(0, 3).join(', ')
  return `Mapping: ${preview}${columns.length > 3 ? '...' : ''}`
}

/**
 * Format date for display
 */
export function formatMappingDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString()
}
