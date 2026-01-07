/**
 * Scene storage utilities for persisting 3D visualization scenes
 * Uses localStorage for browser-based persistence
 */

import type { CargoItem } from '@/components/3d'
import type { ViewMode } from '@/components/3d'

export interface SavedScene {
  id: string
  name: string
  trailerType: string
  cargo: CargoItem[]
  viewMode: ViewMode
  settings: {
    showLegalLimits: boolean
    showDimensions: boolean
    showLabels: boolean
    showCenterOfGravity: boolean
    showTractor: boolean
  }
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY = 'load-planner-scenes'
const MAX_SCENES = 20

/**
 * Get all saved scenes from localStorage
 */
export function getSavedScenes(): SavedScene[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []
    const scenes = JSON.parse(data) as SavedScene[]
    // Sort by most recently updated
    return scenes.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch (error) {
    console.error('Failed to load saved scenes:', error)
    return []
  }
}

/**
 * Save a scene to localStorage
 */
export function saveScene(scene: Omit<SavedScene, 'id' | 'createdAt' | 'updatedAt'>): SavedScene {
  const scenes = getSavedScenes()

  const now = Date.now()
  const newScene: SavedScene = {
    ...scene,
    id: `scene-${now}`,
    createdAt: now,
    updatedAt: now,
  }

  // Add to beginning and limit total scenes
  const updatedScenes = [newScene, ...scenes].slice(0, MAX_SCENES)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedScenes))
  } catch (error) {
    console.error('Failed to save scene:', error)
    throw new Error('Failed to save scene. Storage may be full.')
  }

  return newScene
}

/**
 * Update an existing scene
 */
export function updateScene(id: string, updates: Partial<SavedScene>): SavedScene | null {
  const scenes = getSavedScenes()
  const index = scenes.findIndex((s) => s.id === id)

  if (index === -1) return null

  const updatedScene: SavedScene = {
    ...scenes[index],
    ...updates,
    updatedAt: Date.now(),
  }

  scenes[index] = updatedScene

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes))
  } catch (error) {
    console.error('Failed to update scene:', error)
    throw new Error('Failed to update scene.')
  }

  return updatedScene
}

/**
 * Delete a scene
 */
export function deleteScene(id: string): boolean {
  const scenes = getSavedScenes()
  const filteredScenes = scenes.filter((s) => s.id !== id)

  if (filteredScenes.length === scenes.length) return false

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredScenes))
    return true
  } catch (error) {
    console.error('Failed to delete scene:', error)
    return false
  }
}

/**
 * Get a single scene by ID
 */
export function getScene(id: string): SavedScene | null {
  const scenes = getSavedScenes()
  return scenes.find((s) => s.id === id) || null
}

/**
 * Clear all saved scenes
 */
export function clearAllScenes(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear scenes:', error)
  }
}

/**
 * Export scenes as JSON
 */
export function exportScenes(): string {
  const scenes = getSavedScenes()
  return JSON.stringify(scenes, null, 2)
}

/**
 * Import scenes from JSON
 */
export function importScenes(json: string): number {
  try {
    const imported = JSON.parse(json) as SavedScene[]
    if (!Array.isArray(imported)) throw new Error('Invalid format')

    const existing = getSavedScenes()
    const existingIds = new Set(existing.map((s) => s.id))

    // Only add scenes that don't already exist
    const newScenes = imported.filter((s) => !existingIds.has(s.id))
    const combined = [...newScenes, ...existing].slice(0, MAX_SCENES)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(combined))
    return newScenes.length
  } catch (error) {
    console.error('Failed to import scenes:', error)
    throw new Error('Invalid scene data format')
  }
}

/**
 * Format date for display
 */
export function formatSceneDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  // Less than 1 minute
  if (diff < 60000) return 'Just now'

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}h ago`
  }

  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}d ago`
  }

  // Otherwise show date
  return date.toLocaleDateString()
}
