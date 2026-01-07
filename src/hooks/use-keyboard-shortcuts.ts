'use client'

import { useEffect, useCallback } from 'react'
import type { ViewMode } from '@/components/3d'

interface KeyboardShortcutsOptions {
  onViewChange?: (view: ViewMode) => void
  onDeleteSelected?: () => void
  onExportImage?: () => void
  onSave?: () => void
  onUndo?: () => void
  onRedo?: () => void
  onDeselect?: () => void
  onResetCamera?: () => void
  onToggleTractor?: () => void
  onToggleLimits?: () => void
  enabled?: boolean
}

/**
 * Custom hook for keyboard shortcuts in the 3D visualizer
 *
 * Shortcuts:
 * - 1: 3D view
 * - 2: Front view
 * - 3: Side view
 * - 4: Top view
 * - Delete/Backspace: Delete selected cargo
 * - Ctrl+S: Save scene
 * - Ctrl+E: Export image
 * - Ctrl+Z: Undo
 * - Ctrl+Shift+Z: Redo
 * - Escape: Deselect / exit mode
 * - R: Reset camera
 * - T: Toggle tractor visibility
 * - L: Toggle legal limits
 */
export function useKeyboardShortcuts({
  onViewChange,
  onDeleteSelected,
  onExportImage,
  onSave,
  onUndo,
  onRedo,
  onDeselect,
  onResetCamera,
  onToggleTractor,
  onToggleLimits,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const { key, ctrlKey, metaKey, shiftKey } = event
      const isModifierPressed = ctrlKey || metaKey

      // View mode shortcuts (1-4)
      if (!isModifierPressed && !shiftKey) {
        switch (key) {
          case '1':
            event.preventDefault()
            onViewChange?.('3d')
            return
          case '2':
            event.preventDefault()
            onViewChange?.('front')
            return
          case '3':
            event.preventDefault()
            onViewChange?.('side')
            return
          case '4':
            event.preventDefault()
            onViewChange?.('top')
            return
          case 'Delete':
          case 'Backspace':
            event.preventDefault()
            onDeleteSelected?.()
            return
          case 'Escape':
            event.preventDefault()
            onDeselect?.()
            return
          case 'r':
          case 'R':
            event.preventDefault()
            onResetCamera?.()
            return
          case 't':
          case 'T':
            event.preventDefault()
            onToggleTractor?.()
            return
          case 'l':
          case 'L':
            event.preventDefault()
            onToggleLimits?.()
            return
        }
      }

      // Modifier key shortcuts
      if (isModifierPressed) {
        switch (key.toLowerCase()) {
          case 's':
            event.preventDefault()
            onSave?.()
            return
          case 'e':
            event.preventDefault()
            onExportImage?.()
            return
          case 'z':
            event.preventDefault()
            if (shiftKey) {
              onRedo?.()
            } else {
              onUndo?.()
            }
            return
        }
      }
    },
    [
      enabled,
      onViewChange,
      onDeleteSelected,
      onExportImage,
      onSave,
      onUndo,
      onRedo,
      onDeselect,
      onResetCamera,
      onToggleTractor,
      onToggleLimits,
    ]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

/**
 * Get formatted shortcut hint text
 */
export function getShortcutHint(action: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')
  const modKey = isMac ? '⌘' : 'Ctrl'

  const shortcuts: Record<string, string> = {
    '3d': '1',
    front: '2',
    side: '3',
    top: '4',
    delete: 'Delete',
    save: `${modKey}+S`,
    export: `${modKey}+E`,
    undo: `${modKey}+Z`,
    redo: `${modKey}+Shift+Z`,
    deselect: 'Esc',
    reset: 'R',
    tractor: 'T',
    limits: 'L',
  }

  return shortcuts[action] || ''
}
