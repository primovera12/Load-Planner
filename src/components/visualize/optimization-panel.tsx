'use client'

import { useState, useCallback } from 'react'
import {
  Wand2,
  RotateCcw,
  Scale,
  Maximize2,
  Check,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
  BarChart3,
} from 'lucide-react'
import {
  optimizeLoad,
  applyOptimization,
  type OptimizationResult,
  type OptimizationStats,
} from '@/lib/load-optimizer'
import type { CargoItem } from '@/components/3d/cargo'
import { cn } from '@/lib/utils'

interface OptimizationPanelProps {
  cargoItems: CargoItem[]
  trailerType: string
  onApplyOptimization: (optimizedItems: CargoItem[]) => void
}

interface OptimizationPreferences {
  prioritizeWeight: boolean
  allowRotation: boolean
  optimizeForBalance: boolean
}

export function OptimizationPanel({
  cargoItems,
  trailerType,
  onApplyOptimization,
}: OptimizationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [preferences, setPreferences] = useState<OptimizationPreferences>({
    prioritizeWeight: true,
    allowRotation: true,
    optimizeForBalance: true,
  })

  // Run optimization
  const handleOptimize = useCallback(async () => {
    if (cargoItems.length === 0) return

    setIsOptimizing(true)

    // Simulate async operation for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 500))

    const result = optimizeLoad(cargoItems, trailerType, {
      prioritizeWeight: preferences.prioritizeWeight,
      allowRotation: preferences.allowRotation,
      optimizeForBalance: preferences.optimizeForBalance,
    })

    setOptimizationResult(result)
    setIsOptimizing(false)
  }, [cargoItems, trailerType, preferences])

  // Apply the optimization
  const handleApply = useCallback(() => {
    if (!optimizationResult) return

    const optimizedItems = applyOptimization(cargoItems, optimizationResult)
    onApplyOptimization(optimizedItems)
    setOptimizationResult(null) // Clear result after applying
  }, [cargoItems, optimizationResult, onApplyOptimization])

  // Clear optimization result
  const handleClear = useCallback(() => {
    setOptimizationResult(null)
  }, [])

  const hasItems = cargoItems.length > 0

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">Load Optimizer</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Preferences */}
          <div className="space-y-2">
            <PreferenceToggle
              icon={<Scale className="w-3.5 h-3.5" />}
              label="Prioritize weight distribution"
              checked={preferences.prioritizeWeight}
              onChange={(v) => setPreferences((p) => ({ ...p, prioritizeWeight: v }))}
            />
            <PreferenceToggle
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              label="Allow rotation"
              checked={preferences.allowRotation}
              onChange={(v) => setPreferences((p) => ({ ...p, allowRotation: v }))}
            />
            <PreferenceToggle
              icon={<Maximize2 className="w-3.5 h-3.5" />}
              label="Optimize for balance"
              checked={preferences.optimizeForBalance}
              onChange={(v) => setPreferences((p) => ({ ...p, optimizeForBalance: v }))}
            />
          </div>

          {/* Optimize Button */}
          <button
            onClick={handleOptimize}
            disabled={!hasItems || isOptimizing}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              hasItems && !isOptimizing
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            )}
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Optimize Load
              </>
            )}
          </button>

          {/* Optimization Result */}
          {optimizationResult && (
            <OptimizationResultDisplay
              result={optimizationResult}
              onApply={handleApply}
              onClear={handleClear}
            />
          )}

          {/* No items message */}
          {!hasItems && (
            <p className="text-xs text-slate-500 text-center">
              Add cargo items to enable optimization
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Preference toggle component
 */
function PreferenceToggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <div
        className={cn(
          'relative w-8 h-5 rounded-full transition-colors',
          checked ? 'bg-purple-600' : 'bg-slate-600'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            checked ? 'left-3.5' : 'left-0.5'
          )}
        />
      </div>
      <span className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-slate-300">
        {icon}
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  )
}

/**
 * Optimization result display
 */
function OptimizationResultDisplay({
  result,
  onApply,
  onClear,
}: {
  result: OptimizationResult
  onApply: () => void
  onClear: () => void
}) {
  const { stats, warnings, success, placements, unplacedItems } = result

  return (
    <div className="space-y-3 pt-3 border-t border-slate-700">
      {/* Status */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
          success
            ? 'bg-green-500/10 text-green-400'
            : 'bg-amber-500/10 text-amber-400'
        )}
      >
        {success ? (
          <>
            <Check className="w-4 h-4" />
            All {stats.itemsPlaced} items placed successfully
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4" />
            {stats.itemsPlaced} of {stats.itemsTotal} items placed
          </>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Package className="w-4 h-4" />}
          label="Space Used"
          value={`${stats.spaceUtilization}%`}
          status={stats.spaceUtilization > 80 ? 'good' : stats.spaceUtilization > 50 ? 'ok' : 'low'}
        />
        <StatCard
          icon={<BarChart3 className="w-4 h-4" />}
          label="Volume Used"
          value={`${stats.volumeUtilization}%`}
          status={stats.volumeUtilization > 50 ? 'good' : stats.volumeUtilization > 25 ? 'ok' : 'low'}
        />
        <StatCard
          icon={<Scale className="w-4 h-4" />}
          label="Total Weight"
          value={`${stats.totalWeight.toLocaleString()}`}
          suffix="lbs"
        />
        <StatCard
          icon={<Maximize2 className="w-4 h-4" />}
          label="Balance"
          value={stats.weightBalance > 0 ? 'Rear' : stats.weightBalance < 0 ? 'Front' : 'Center'}
          subvalue={`${Math.abs(stats.weightBalance * 100).toFixed(0)}%`}
          status={Math.abs(stats.weightBalance) < 0.2 ? 'good' : Math.abs(stats.weightBalance) < 0.4 ? 'ok' : 'low'}
        />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.slice(0, 3).map((warning, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 px-2 py-1.5 text-xs text-amber-400 bg-amber-500/10 rounded"
            >
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              {warning}
            </div>
          ))}
          {warnings.length > 3 && (
            <p className="text-xs text-slate-500 px-2">
              +{warnings.length - 3} more warnings
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onApply}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
          Apply
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/**
 * Statistics card component
 */
function StatCard({
  icon,
  label,
  value,
  suffix,
  subvalue,
  status,
}: {
  icon: React.ReactNode
  label: string
  value: string
  suffix?: string
  subvalue?: string
  status?: 'good' | 'ok' | 'low'
}) {
  const statusColors = {
    good: 'text-green-400',
    ok: 'text-amber-400',
    low: 'text-red-400',
  }

  return (
    <div className="p-2 bg-slate-700/50 rounded-lg">
      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-lg font-semibold', status ? statusColors[status] : 'text-white')}>
          {value}
        </span>
        {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
        {subvalue && <span className="text-xs text-slate-400 ml-1">{subvalue}</span>}
      </div>
    </div>
  )
}
