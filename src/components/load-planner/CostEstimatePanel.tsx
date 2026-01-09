'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CostEstimate,
  MultiStopRoute,
  StatePermitInfo,
} from '@/types/route-planning'
import {
  DollarSign,
  Fuel,
  FileText,
  Users,
  Route,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'

interface CostEstimatePanelProps {
  route: MultiStopRoute | null
  permits: StatePermitInfo[]
  cargo: {
    width: number
    height: number
    length: number
    grossWeight: number
  }
  collapsed?: boolean
  onCostEstimateChange?: (estimate: CostEstimate | null) => void
}

export function CostEstimatePanel({
  route,
  permits,
  cargo,
  collapsed: initialCollapsed = false,
  onCostEstimateChange,
}: CostEstimatePanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [isLoading, setIsLoading] = useState(false)
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch cost estimate when route or cargo changes
  useEffect(() => {
    async function fetchCostEstimate() {
      if (!route || route.totalDistance === 0) {
        setCostEstimate(null)
        onCostEstimateChange?.(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/costs/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distance: route.totalDistance,
            states: route.statesTraversed,
            cargo,
            permits,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch cost estimate')
        }

        const data = await response.json()
        setCostEstimate(data)
        onCostEstimateChange?.(data)
      } catch (err) {
        console.error('Cost estimate error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')

        // Create a fallback estimate
        const fallbackEstimate = createFallbackEstimate(
          route.totalDistance,
          cargo,
          permits
        )
        setCostEstimate(fallbackEstimate)
        onCostEstimateChange?.(fallbackEstimate)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCostEstimate()
  }, [route, cargo, permits, onCostEstimateChange])

  // Create fallback estimate if API fails
  function createFallbackEstimate(
    distance: number,
    cargoSpecs: typeof cargo,
    permitInfo: StatePermitInfo[]
  ): CostEstimate {
    const ratePerMile = 3.25
    const lineHaul = distance * ratePerMile
    const fuelGallons = distance / 6
    const fuelPrice = 4.0
    const fuelCost = fuelGallons * fuelPrice
    const permitFees = permitInfo.reduce((sum, p) => sum + p.permitFee, 0)
    const escortCosts = permitInfo.reduce((sum, p) => sum + p.escortCost, 0)

    return {
      fuel: {
        totalGallons: Math.round(fuelGallons * 10) / 10,
        averagePrice: fuelPrice,
        totalCost: Math.round(fuelCost * 100) / 100,
      },
      permits: {
        states: permitInfo,
        totalPermitFees: permitFees,
        totalEscortCost: escortCosts,
      },
      rate: {
        baseRatePerMile: ratePerMile,
        oversizeSurcharge: 0,
        overweightSurcharge: 0,
        fuelSurcharge: 0,
        totalRatePerMile: ratePerMile,
        totalRate: lineHaul,
        distance,
        confidence: 'low',
        breakdown: {
          lineHaul,
          fuelSurcharge: 0,
          oversizeFees: 0,
          overweightFees: 0,
        },
      },
      tolls: {
        estimated: 0,
        byState: [],
      },
      total: Math.round((lineHaul + fuelCost + permitFees + escortCosts) * 100) / 100,
      breakdown: {
        lineHaul,
        fuel: fuelCost,
        permits: permitFees,
        escorts: escortCosts,
        tolls: 0,
        other: 0,
      },
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCurrencyDecimal = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Card className="border-green-100">
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Cost Estimate
            {costEstimate && (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">
                {formatCurrency(costEstimate.total)}
              </Badge>
            )}
          </CardTitle>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !route || route.totalDistance === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Calculate a route to see cost estimates</p>
            </div>
          ) : costEstimate ? (
            <>
              {/* Total */}
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600 mb-1">Estimated Total Cost</p>
                <p className="text-3xl font-bold text-green-700">
                  {formatCurrency(costEstimate.total)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {route.totalDistance} miles •{' '}
                  {formatCurrencyDecimal(costEstimate.total / route.totalDistance)}/mi
                </p>
                {costEstimate.rate.confidence !== 'high' && (
                  <Badge
                    variant="outline"
                    className="mt-2 text-amber-600 border-amber-300"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {costEstimate.rate.confidence === 'low'
                      ? 'Rough Estimate'
                      : 'Estimate'}
                  </Badge>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Cost Breakdown
                </h4>

                {/* Line Haul */}
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Line Haul</span>
                    <span className="text-xs text-gray-400">
                      ({formatCurrencyDecimal(costEstimate.rate.totalRatePerMile)}/mi)
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(costEstimate.breakdown.lineHaul)}
                  </span>
                </div>

                {/* Fuel */}
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-2">
                    <Fuel className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Fuel</span>
                    <span className="text-xs text-gray-400">
                      ({costEstimate.fuel.totalGallons} gal @{' '}
                      {formatCurrencyDecimal(costEstimate.fuel.averagePrice)})
                    </span>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(costEstimate.breakdown.fuel)}
                  </span>
                </div>

                {/* Permits */}
                {costEstimate.breakdown.permits > 0 && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Permits</span>
                      <span className="text-xs text-gray-400">
                        ({costEstimate.permits.states.length} states)
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(costEstimate.breakdown.permits)}
                    </span>
                  </div>
                )}

                {/* Escorts */}
                {costEstimate.breakdown.escorts > 0 && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Escort Vehicles</span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(costEstimate.breakdown.escorts)}
                    </span>
                  </div>
                )}

                {/* Tolls */}
                {costEstimate.breakdown.tolls > 0 && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Tolls (est.)</span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(costEstimate.breakdown.tolls)}
                    </span>
                  </div>
                )}

                {/* Surcharges (if any) */}
                {(costEstimate.rate.oversizeSurcharge > 0 ||
                  costEstimate.rate.overweightSurcharge > 0) && (
                  <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
                    <p className="font-medium mb-1">Surcharges included:</p>
                    {costEstimate.rate.oversizeSurcharge > 0 && (
                      <p>
                        • Oversize: {formatCurrencyDecimal(costEstimate.rate.oversizeSurcharge)}/mi
                      </p>
                    )}
                    {costEstimate.rate.overweightSurcharge > 0 && (
                      <p>
                        • Overweight: {formatCurrencyDecimal(costEstimate.rate.overweightSurcharge)}/mi
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* State Summary */}
              {permits.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500">
                    Permits needed in: {permits.map((p) => p.stateCode).join(', ')}
                  </p>
                </div>
              )}
            </>
          ) : error ? (
            <div className="text-center py-6 text-red-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  )
}

export default CostEstimatePanel
