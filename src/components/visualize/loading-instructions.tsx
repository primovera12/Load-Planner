'use client'

import { useState, useMemo } from 'react'
import {
  ClipboardList,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
  RotateCcw,
  MapPin,
  Scale,
  AlertTriangle,
  Printer,
} from 'lucide-react'
import {
  optimizeLoad,
  generateLoadingInstructions,
  type OptimizationResult,
} from '@/lib/load-optimizer'
import type { CargoItem } from '@/components/3d/cargo'
import { cn } from '@/lib/utils'

interface LoadingInstructionsProps {
  cargoItems: CargoItem[]
  trailerType: string
}

export function LoadingInstructions({
  cargoItems,
  trailerType,
}: LoadingInstructionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate optimization result and instructions
  const { result, instructions } = useMemo(() => {
    if (cargoItems.length === 0) {
      return { result: null, instructions: [] }
    }

    const result = optimizeLoad(cargoItems, trailerType, {
      prioritizeWeight: true,
      allowRotation: true,
      optimizeForBalance: true,
    })

    const instructions = generateLoadingInstructions(result)
    return { result, instructions }
  }, [cargoItems, trailerType])

  // Copy instructions to clipboard
  const handleCopy = async () => {
    if (instructions.length === 0) return

    try {
      await navigator.clipboard.writeText(instructions.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Download as text file
  const handleDownload = () => {
    if (instructions.length === 0) return

    const content = instructions.join('\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `loading-instructions-${new Date().toISOString().split('T')[0]}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Print instructions
  const handlePrint = () => {
    if (instructions.length === 0) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Loading Instructions</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              line-height: 1.6;
            }
            h1 { font-size: 24px; margin-bottom: 20px; }
            .instruction {
              margin: 15px 0;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 8px;
            }
            .instruction-header {
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 8px;
            }
            .instruction-detail {
              color: #666;
              font-size: 14px;
              margin: 4px 0;
            }
            .warning {
              background: #fef3cd;
              padding: 10px;
              border-radius: 4px;
              margin: 10px 0;
              color: #856404;
            }
            .summary {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #ddd;
            }
            @media print {
              body { padding: 20px; }
              .instruction { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Loading Instructions</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          ${instructions.map(line => {
            if (line.startsWith('LOADING SEQUENCE:') || line.startsWith('SUMMARY:') || line.startsWith('WARNINGS:')) {
              return `<h2 style="margin-top: 30px;">${line}</h2>`
            }
            if (line.match(/^\d+\./)) {
              return `<div class="instruction"><div class="instruction-header">${line}</div>`
            }
            if (line.startsWith('   ')) {
              return `<div class="instruction-detail">${line.trim()}</div>`
            }
            if (line.startsWith('•')) {
              return `<div class="warning">${line}</div>`
            }
            if (line.trim() === '') {
              return '</div>'
            }
            return `<p>${line}</p>`
          }).join('')}
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    printWindow.print()
  }

  if (cargoItems.length === 0) {
    return null
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Loading Instructions</span>
          {result && (
            <span className="text-xs text-slate-400">
              ({result.stats.itemsPlaced} items)
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && result && (
        <div className="px-4 pb-4 space-y-4">
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>

          {/* Loading sequence */}
          <div className="space-y-3">
            {result.placements
              .sort((a, b) => {
                // Sort back to front, then left to right
                if (Math.abs(a.position[0] - b.position[0]) > 1) {
                  return b.position[0] - a.position[0]
                }
                return a.position[2] - b.position[2]
              })
              .map((placement, idx) => (
                <LoadingStep
                  key={placement.item.id}
                  step={idx + 1}
                  item={placement.item}
                  position={placement.position}
                  rotated={placement.rotated}
                />
              ))}
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-slate-700">
              <div className="text-xs font-medium text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Warnings
              </div>
              {result.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="text-xs text-amber-400/80 bg-amber-500/10 px-3 py-2 rounded"
                >
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Individual loading step display
 */
function LoadingStep({
  step,
  item,
  position,
  rotated,
}: {
  step: number
  item: CargoItem
  position: [number, number, number]
  rotated: boolean
}) {
  const positionDescription = useMemo(() => {
    const [x, , z] = position
    const xDesc =
      x > 1 ? `${x.toFixed(1)}' toward rear` :
      x < -1 ? `${Math.abs(x).toFixed(1)}' toward front` :
      'at center'
    const zDesc =
      z > 0.5 ? `${z.toFixed(1)}' right of center` :
      z < -0.5 ? `${Math.abs(z).toFixed(1)}' left of center` :
      'centered'

    return `${xDesc}, ${zDesc}`
  }, [position])

  return (
    <div className="p-3 bg-slate-700/50 rounded-lg space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
            {step}
          </span>
          <span className="text-sm font-medium text-white">{item.name}</span>
        </div>
        {rotated && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
            <RotateCcw className="w-3 h-3" />
            Rotated 90°
          </span>
        )}
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <MapPin className="w-3 h-3" />
          <span>{positionDescription}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Scale className="w-3 h-3" />
          <span>{item.weight.toLocaleString()} lbs</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 col-span-2">
          <Package className="w-3 h-3" />
          <span>
            {item.length}' L × {item.width}' W × {item.height}' H
          </span>
        </div>
      </div>
    </div>
  )
}
