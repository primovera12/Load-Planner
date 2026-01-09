'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StopCard } from './StopCard'
import {
  RouteStop,
  StopType,
  MultiStopRoute,
  ItemStopAssignment,
} from '@/types/route-planning'
import { LoadItem } from '@/types/load'
import {
  Plus,
  Route,
  Truck,
  MapPin,
  Clock,
  Zap,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'

interface MultiStopRouteBuilderProps {
  stops: RouteStop[]
  items: LoadItem[]
  onStopsChange: (stops: RouteStop[]) => void
  onRouteCalculated?: (route: MultiStopRoute) => void
  collapsed?: boolean
}

// Generate unique ID
function generateId(): string {
  return `stop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function MultiStopRouteBuilder({
  stops,
  items,
  onStopsChange,
  onRouteCalculated,
  collapsed: initialCollapsed = false,
}: MultiStopRouteBuilderProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [routeInfo, setRouteInfo] = useState<MultiStopRoute | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  // Add a new stop
  const addStop = useCallback(
    (type: StopType) => {
      const newStop: RouteStop = {
        id: generateId(),
        type,
        sequence: stops.length,
        address: '',
        itemIds: [],
      }
      onStopsChange([...stops, newStop])
    },
    [stops, onStopsChange]
  )

  // Update a stop
  const updateStop = useCallback(
    (stopId: string, updatedStop: RouteStop) => {
      const newStops = stops.map((stop) =>
        stop.id === stopId ? updatedStop : stop
      )
      onStopsChange(newStops)
    },
    [stops, onStopsChange]
  )

  // Delete a stop
  const deleteStop = useCallback(
    (stopId: string) => {
      const newStops = stops
        .filter((stop) => stop.id !== stopId)
        .map((stop, index) => ({
          ...stop,
          sequence: index,
        }))
      onStopsChange(newStops)
    },
    [stops, onStopsChange]
  )

  // Move stop up
  const moveStopUp = useCallback(
    (index: number) => {
      if (index <= 0) return
      const newStops = [...stops]
      const temp = newStops[index]
      newStops[index] = newStops[index - 1]
      newStops[index - 1] = temp
      // Update sequences
      newStops.forEach((stop, i) => {
        stop.sequence = i
      })
      onStopsChange(newStops)
    },
    [stops, onStopsChange]
  )

  // Move stop down
  const moveStopDown = useCallback(
    (index: number) => {
      if (index >= stops.length - 1) return
      const newStops = [...stops]
      const temp = newStops[index]
      newStops[index] = newStops[index + 1]
      newStops[index + 1] = temp
      // Update sequences
      newStops.forEach((stop, i) => {
        stop.sequence = i
      })
      onStopsChange(newStops)
    },
    [stops, onStopsChange]
  )

  // Calculate route
  const calculateRoute = useCallback(async () => {
    // Filter stops with valid addresses
    const validStops = stops.filter(
      (stop) => stop.latitude && stop.longitude
    )

    if (validStops.length < 2) {
      setError('Need at least 2 stops with valid addresses to calculate route')
      return
    }

    setIsCalculating(true)
    setError(null)

    try {
      const response = await fetch('/api/routes/multi-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stops: validStops }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to calculate route')
      }

      const data = await response.json()
      setRouteInfo(data.route)
      onRouteCalculated?.(data.route)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Route calculation failed')
    } finally {
      setIsCalculating(false)
    }
  }, [stops, onRouteCalculated])

  // Optimize route
  const optimizeRoute = useCallback(async () => {
    const validStops = stops.filter(
      (stop) => stop.latitude && stop.longitude
    )

    if (validStops.length < 3) {
      setError('Need at least 3 stops to optimize route')
      return
    }

    // Build item assignments for pickup-before-delivery constraint
    const itemAssignments: ItemStopAssignment[] = []
    items.forEach((item) => {
      const pickupStop = stops.find(
        (s) => s.type === 'PICKUP' && s.itemIds?.includes(item.id)
      )
      const deliveryStop = stops.find(
        (s) => s.type === 'DELIVERY' && s.itemIds?.includes(item.id)
      )
      if (pickupStop && deliveryStop) {
        itemAssignments.push({
          itemId: item.id,
          itemDescription: item.description || item.id,
          pickupStopId: pickupStop.id,
          deliveryStopId: deliveryStop.id,
        })
      }
    })

    setIsOptimizing(true)
    setError(null)
    setWarnings([])

    try {
      const response = await fetch('/api/routes/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stops: validStops,
          itemAssignments,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to optimize route')
      }

      const data = await response.json()

      if (data.optimizedOrder) {
        // Reorder stops according to optimized order
        const stopMap = new Map(stops.map((s) => [s.id, s]))
        const reorderedStops = data.optimizedOrder
          .map((id: string) => stopMap.get(id))
          .filter(Boolean)
          .map((stop: RouteStop, index: number) => ({
            ...stop,
            sequence: index,
          }))

        // Add any stops not in the optimized order at the end
        stops.forEach((stop) => {
          if (!data.optimizedOrder.includes(stop.id)) {
            reorderedStops.push({
              ...stop,
              sequence: reorderedStops.length,
            })
          }
        })

        onStopsChange(reorderedStops)

        // Show savings info
        if (data.distanceSaved > 0) {
          setWarnings([
            `Route optimized! Saved ${data.distanceSaved.toFixed(1)} miles and ${Math.round(data.timeSaved)} minutes.`,
          ])
        }

        // Recalculate route with new order
        await calculateRoute()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Route optimization failed')
    } finally {
      setIsOptimizing(false)
    }
  }, [stops, items, onStopsChange, calculateRoute])

  // Validate item assignments
  const validateAssignments = useCallback(() => {
    const newWarnings: string[] = []

    items.forEach((item) => {
      const pickups = stops.filter(
        (s) => s.type === 'PICKUP' && s.itemIds?.includes(item.id)
      )
      const deliveries = stops.filter(
        (s) => s.type === 'DELIVERY' && s.itemIds?.includes(item.id)
      )

      if (pickups.length === 0) {
        newWarnings.push(
          `Item "${item.description || item.id}" has no pickup location`
        )
      }
      if (deliveries.length === 0) {
        newWarnings.push(
          `Item "${item.description || item.id}" has no delivery location`
        )
      }
      if (pickups.length > 0 && deliveries.length > 0) {
        // Check if any pickup comes after its delivery
        const firstPickupSeq = Math.min(...pickups.map((p) => p.sequence))
        const firstDeliverySeq = Math.min(...deliveries.map((d) => d.sequence))
        if (firstDeliverySeq < firstPickupSeq) {
          newWarnings.push(
            `Item "${item.description || item.id}" delivery is before pickup in route order`
          )
        }
      }
    })

    setWarnings(newWarnings)
  }, [stops, items])

  // Validate when stops or items change
  useEffect(() => {
    validateAssignments()
  }, [validateAssignments])

  // Count stops by type
  const pickupCount = stops.filter((s) => s.type === 'PICKUP').length
  const deliveryCount = stops.filter((s) => s.type === 'DELIVERY').length

  return (
    <Card className="border-purple-100">
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4 text-purple-600" />
            Route Stops
            <div className="flex gap-1 ml-2">
              {pickupCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  {pickupCount} Pickup{pickupCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {deliveryCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  {deliveryCount} Delivery{deliveryCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
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
          {/* Add Stop Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => addStop('PICKUP')}
              className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Pickup
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addStop('DELIVERY')}
              className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Delivery
            </Button>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert variant="default" className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Stops List */}
          <div className="space-y-2">
            {stops.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No stops added yet</p>
                <p className="text-sm">Add pickup and delivery locations above</p>
              </div>
            ) : (
              stops.map((stop, index) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  index={index}
                  items={items}
                  onChange={(updatedStop) => updateStop(stop.id, updatedStop)}
                  onDelete={() => deleteStop(stop.id)}
                  onMoveUp={() => moveStopUp(index)}
                  onMoveDown={() => moveStopDown(index)}
                  canMoveUp={index > 0}
                  canMoveDown={index < stops.length - 1}
                />
              ))
            )}
          </div>

          {/* Route Actions */}
          {stops.length >= 2 && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={calculateRoute}
                disabled={isCalculating || isOptimizing}
                className="flex-1"
              >
                {isCalculating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4 mr-1" />
                )}
                Calculate Route
              </Button>
              {stops.length >= 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={optimizeRoute}
                  disabled={isCalculating || isOptimizing}
                  className="flex-1"
                >
                  {isOptimizing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-1" />
                  )}
                  Optimize Route
                </Button>
              )}
            </div>
          )}

          {/* Route Summary */}
          {routeInfo && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Route className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {routeInfo.totalDistance.toFixed(1)} mi
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {Math.floor(routeInfo.totalDuration / 60)}h{' '}
                    {Math.round(routeInfo.totalDuration % 60)}m
                  </span>
                </div>
              </div>
              {routeInfo.statesTraversed.length > 0 && (
                <div className="text-xs text-gray-600">
                  States: {routeInfo.statesTraversed.join(' → ')}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default MultiStopRouteBuilder
