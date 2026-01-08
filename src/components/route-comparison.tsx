'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  ArrowLeftRight,
  DollarSign,
  Route,
  Shield,
  Truck,
  Users,
  MapPin,
  Star,
  Check,
  Coins,
  Fuel,
  X,
} from 'lucide-react'
import { type SavedRoute } from '@/lib/route-storage'
import { cn } from '@/lib/utils'

interface RouteComparisonProps {
  savedRoutes: SavedRoute[]
}

export function RouteComparison({ savedRoutes }: RouteComparisonProps) {
  const [open, setOpen] = useState(false)
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])

  const toggleRoute = (id: string) => {
    setSelectedRoutes(prev => {
      if (prev.includes(id)) {
        return prev.filter(r => r !== id)
      }
      // Max 3 routes for comparison
      if (prev.length >= 3) {
        return [...prev.slice(1), id]
      }
      return [...prev, id]
    })
  }

  const selectedRouteData = savedRoutes.filter(r => selectedRoutes.includes(r.id))

  // Find best values for highlighting
  const bestValues = selectedRouteData.length >= 2 ? {
    lowestTotal: Math.min(...selectedRouteData.map(r => r.costs.total)),
    lowestPermits: Math.min(...selectedRouteData.map(r => r.costs.permits)),
    lowestEscorts: Math.min(...selectedRouteData.map(r => r.costs.escorts)),
    lowestTolls: Math.min(...selectedRouteData.map(r => r.costs.tolls)),
    lowestFuel: Math.min(...selectedRouteData.map(r => r.costs.fuel)),
    fewestStates: Math.min(...selectedRouteData.map(r => r.states.length)),
    shortestDistance: Math.min(...selectedRouteData.map(r => r.routeData?.totalDistance || Infinity)),
  } : null

  if (savedRoutes.length < 2) {
    return null
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="mr-2 h-4 w-4" />
        Compare
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Compare Routes
                </h2>
                <p className="text-sm text-muted-foreground">
                  Select 2-3 routes to compare costs, permits, and travel details
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 space-y-4">
              {/* Route Selection */}
              <div className="space-y-2 border-b pb-4">
                <div className="text-sm font-medium">Select routes to compare:</div>
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {savedRoutes.map(route => (
                    <label
                      key={route.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
                        selectedRoutes.includes(route.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-slate-200 hover:bg-slate-50'
                      )}
                      onClick={() => toggleRoute(route.id)}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center',
                        selectedRoutes.includes(route.id)
                          ? 'bg-primary border-primary'
                          : 'border-slate-300'
                      )}>
                        {selectedRoutes.includes(route.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{route.name}</span>
                          {route.isFavorite && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {route.origin} → {route.destination}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        ${route.costs.total.toLocaleString()}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Comparison Table */}
              {selectedRouteData.length >= 2 && (
                <div className="space-y-4">
                  {/* Route Headers */}
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedRouteData.length}, 1fr)` }}>
                    {selectedRouteData.map(route => (
                      <Card key={route.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {route.isFavorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                            <span className="font-semibold truncate">{route.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{route.origin}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{route.destination}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Cost Comparison */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cost Comparison
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      {/* Total Cost */}
                      <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: `120px repeat(${selectedRouteData.length}, 1fr)` }}>
                        <div className="bg-slate-50 p-3 text-sm font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          Total
                        </div>
                        {selectedRouteData.map(route => (
                          <div
                            key={route.id}
                            className={cn(
                              'bg-white p-3 text-center font-semibold',
                              bestValues?.lowestTotal === route.costs.total && 'bg-green-50 text-green-700'
                            )}
                          >
                            ${route.costs.total.toLocaleString()}
                            {bestValues?.lowestTotal === route.costs.total && (
                              <Check className="inline-block ml-1 h-4 w-4 text-green-600" />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Permits */}
                      <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: `120px repeat(${selectedRouteData.length}, 1fr)` }}>
                        <div className="bg-slate-50 p-3 text-sm font-medium flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          Permits
                        </div>
                        {selectedRouteData.map(route => (
                          <div
                            key={route.id}
                            className={cn(
                              'bg-white p-3 text-center',
                              bestValues?.lowestPermits === route.costs.permits && 'bg-blue-50 text-blue-700'
                            )}
                          >
                            ${route.costs.permits.toLocaleString()}
                          </div>
                        ))}
                      </div>

                      {/* Escorts */}
                      <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: `120px repeat(${selectedRouteData.length}, 1fr)` }}>
                        <div className="bg-slate-50 p-3 text-sm font-medium flex items-center gap-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          Escorts
                        </div>
                        {selectedRouteData.map(route => (
                          <div
                            key={route.id}
                            className={cn(
                              'bg-white p-3 text-center',
                              bestValues?.lowestEscorts === route.costs.escorts && 'bg-purple-50 text-purple-700'
                            )}
                          >
                            ${route.costs.escorts.toLocaleString()}
                          </div>
                        ))}
                      </div>

                      {/* Fuel */}
                      <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: `120px repeat(${selectedRouteData.length}, 1fr)` }}>
                        <div className="bg-slate-50 p-3 text-sm font-medium flex items-center gap-2">
                          <Fuel className="h-4 w-4 text-orange-600" />
                          Fuel
                        </div>
                        {selectedRouteData.map(route => (
                          <div
                            key={route.id}
                            className={cn(
                              'bg-white p-3 text-center',
                              bestValues?.lowestFuel === route.costs.fuel && 'bg-orange-50 text-orange-700'
                            )}
                          >
                            ${route.costs.fuel.toLocaleString()}
                          </div>
                        ))}
                      </div>

                      {/* Tolls */}
                      <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: `120px repeat(${selectedRouteData.length}, 1fr)` }}>
                        <div className="bg-slate-50 p-3 text-sm font-medium flex items-center gap-2">
                          <Coins className="h-4 w-4 text-amber-600" />
                          Tolls
                        </div>
                        {selectedRouteData.map(route => (
                          <div
                            key={route.id}
                            className={cn(
                              'bg-white p-3 text-center',
                              bestValues?.lowestTolls === route.costs.tolls && 'bg-amber-50 text-amber-700'
                            )}
                          >
                            ${route.costs.tolls.toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Route Details */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      Route Details
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      {/* Distance */}
                      <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: `120px repeat(${selectedRouteData.length}, 1fr)` }}>
                        <div className="bg-slate-50 p-3 text-sm font-medium">Distance</div>
                        {selectedRouteData.map(route => (
                          <div
                            key={route.id}
                            className={cn(
                              'bg-white p-3 text-center',
                              bestValues?.shortestDistance === (route.routeData?.totalDistance || Infinity) && 'bg-green-50 text-green-700'
                            )}
                          >
                            {route.routeData?.totalDistance
                              ? `${route.routeData.totalDistance.toLocaleString()} mi`
                              : 'N/A'}
                          </div>
                        ))}
                      </div>

                      {/* States */}
                      <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: `120px repeat(${selectedRouteData.length}, 1fr)` }}>
                        <div className="bg-slate-50 p-3 text-sm font-medium"># States</div>
                        {selectedRouteData.map(route => (
                          <div
                            key={route.id}
                            className={cn(
                              'bg-white p-3 text-center',
                              bestValues?.fewestStates === route.states.length && 'bg-green-50 text-green-700'
                            )}
                          >
                            {route.states.length}
                          </div>
                        ))}
                      </div>

                      {/* States List */}
                      <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: `120px repeat(${selectedRouteData.length}, 1fr)` }}>
                        <div className="bg-slate-50 p-3 text-sm font-medium">States</div>
                        {selectedRouteData.map(route => (
                          <div key={route.id} className="bg-white p-3">
                            <div className="flex flex-wrap gap-1">
                              {route.states.map(state => (
                                <Badge key={state} variant="outline" className="text-xs">
                                  {state}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cargo Dimensions */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Cargo Specifications
                    </div>
                    <div className="rounded-lg border overflow-hidden">
                      <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: `120px repeat(${selectedRouteData.length}, 1fr)` }}>
                        <div className="bg-slate-50 p-3 text-sm font-medium">Dimensions</div>
                        {selectedRouteData.map(route => (
                          <div key={route.id} className="bg-white p-3 text-center text-sm">
                            {route.cargo.length}&apos; × {route.cargo.width}&apos; × {route.cargo.height}&apos;
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: `120px repeat(${selectedRouteData.length}, 1fr)` }}>
                        <div className="bg-slate-50 p-3 text-sm font-medium">Weight</div>
                        {selectedRouteData.map(route => (
                          <div key={route.id} className="bg-white p-3 text-center text-sm">
                            {route.cargo.weight.toLocaleString()} lbs
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  {bestValues && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700 font-medium">
                        <Check className="h-5 w-5" />
                        Recommendation
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        {selectedRouteData.find(r => r.costs.total === bestValues.lowestTotal)?.name} has the lowest total cost
                        at ${bestValues.lowestTotal.toLocaleString()}
                        {bestValues.fewestStates !== selectedRouteData.find(r => r.costs.total === bestValues.lowestTotal)?.states.length && (
                          <span>, though {selectedRouteData.find(r => r.states.length === bestValues.fewestStates)?.name} crosses fewer states.</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedRouteData.length < 2 && (
                <div className="text-center py-8 text-muted-foreground">
                  Select at least 2 routes to compare
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
