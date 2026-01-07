'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Route,
  MapPin,
  Truck,
  AlertTriangle,
  DollarSign,
  Shield,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react'
import { RoutePermitSummary, PermitRequirement } from '@/types'
import { statePermits } from '@/data/state-permits'

// US State codes
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

export default function RoutesPage() {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [width, setWidth] = useState('10')
  const [height, setHeight] = useState('12.5')
  const [length, setLength] = useState('32')
  const [weight, setWeight] = useState('72000')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<RoutePermitSummary | null>(null)
  const [expandedState, setExpandedState] = useState<string | null>(null)

  const toggleState = (code: string) => {
    setSelectedStates(prev =>
      prev.includes(code)
        ? prev.filter(s => s !== code)
        : [...prev, code]
    )
  }

  const calculatePermits = async () => {
    if (selectedStates.length === 0) {
      alert('Please select at least one state')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/permits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          states: selectedStates,
          width: parseFloat(width),
          height: parseFloat(height),
          length: parseFloat(length),
          grossWeight: parseFloat(weight),
        }),
      })

      const data = await response.json()
      if (data.success) {
        setResults(data.data)
      }
    } catch (error) {
      console.error('Error calculating permits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearAll = () => {
    setSelectedStates([])
    setResults(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Route className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Route Planner</h1>
              <p className="text-sm text-muted-foreground">
                Calculate permit requirements and costs for multi-state routes
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-1 space-y-6">
            {/* Cargo Specifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5" />
                  Cargo Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="width">Width (ft)</Label>
                    <Input
                      id="width"
                      type="number"
                      step="0.5"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Height (ft)</Label>
                    <Input
                      id="height"
                      type="number"
                      step="0.5"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="length">Length (ft)</Label>
                    <Input
                      id="length"
                      type="number"
                      step="1"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight">Gross Weight (lbs)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="1000"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick permit check */}
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="font-medium mb-2">Permit Status</div>
                  <div className="space-y-1 text-muted-foreground">
                    {parseFloat(width) > 8.5 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Width exceeds 8.5&apos; - Oversize
                      </div>
                    )}
                    {parseFloat(height) > 13.5 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Height exceeds 13.5&apos; - Oversize
                      </div>
                    )}
                    {parseFloat(length) > 65 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Length exceeds 65&apos; - Oversize
                      </div>
                    )}
                    {parseFloat(weight) > 80000 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        Weight exceeds 80,000 lbs - Overweight
                      </div>
                    )}
                    {parseFloat(width) <= 8.5 &&
                     parseFloat(height) <= 13.5 &&
                     parseFloat(length) <= 65 &&
                     parseFloat(weight) <= 80000 && (
                      <div className="text-green-600">
                        ✓ Within legal limits - No permits needed
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* State Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Route States
                </CardTitle>
                <CardDescription>
                  Select states your route passes through (in order)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-4">
                  {US_STATES.map((code) => (
                    <button
                      key={code}
                      onClick={() => toggleState(code)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        selectedStates.includes(code)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>

                {selectedStates.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Selected route ({selectedStates.length} states):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedStates.map((code, idx) => (
                        <span key={code} className="flex items-center">
                          <Badge variant="secondary">{code}</Badge>
                          {idx < selectedStates.length - 1 && (
                            <span className="mx-1 text-muted-foreground">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      className="text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={calculatePermits}
              disabled={isLoading || selectedStates.length === 0}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Calculate Permits
                </>
              )}
            </Button>
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-2 space-y-6">
            {results ? (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Permit Fees</p>
                          <p className="text-2xl font-bold">
                            ${results.totalPermitFees.toLocaleString()}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Escort Cost (Est.)</p>
                          <p className="text-2xl font-bold">
                            ${results.totalEscortCost.toLocaleString()}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Estimate</p>
                          <p className="text-2xl font-bold text-primary">
                            ${(results.totalPermitFees + results.totalEscortCost).toLocaleString()}
                          </p>
                        </div>
                        <Shield className="h-8 w-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Warnings */}
                {results.warnings.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-amber-800 mb-2">Warnings</div>
                          <ul className="space-y-1 text-sm text-amber-700">
                            {results.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Travel Restrictions */}
                {results.overallRestrictions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5" />
                        Travel Restrictions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {results.overallRestrictions.map((r, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Note</Badge>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* State-by-State Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">State-by-State Breakdown</CardTitle>
                    <CardDescription>
                      Click a state to see detailed requirements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.states.map((state) => (
                        <StatePermitCard
                          key={state.stateCode}
                          permit={state}
                          expanded={expandedState === state.stateCode}
                          onToggle={() =>
                            setExpandedState(
                              expandedState === state.stateCode ? null : state.stateCode
                            )
                          }
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center">
                  <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium text-lg mb-2">No Route Calculated</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Enter your cargo specifications and select the states your route passes through,
                    then click &quot;Calculate Permits&quot; to see requirements and costs.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatePermitCard({
  permit,
  expanded,
  onToggle
}: {
  permit: PermitRequirement
  expanded: boolean
  onToggle: () => void
}) {
  const hasIssues = permit.oversizeRequired || permit.overweightRequired || permit.escortsRequired > 0

  return (
    <div className={`rounded-lg border ${hasIssues ? 'border-amber-200' : 'border-slate-200'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge variant={hasIssues ? 'destructive' : 'secondary'} className="font-mono">
            {permit.stateCode}
          </Badge>
          <span className="font-medium">{permit.state}</span>
          {permit.isSuperload && (
            <Badge variant="destructive" className="text-xs">SUPERLOAD</Badge>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            ${permit.estimatedFee.toLocaleString()}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3 bg-slate-50 space-y-3">
          {/* Permit Requirements */}
          <div className="flex flex-wrap gap-2">
            {permit.oversizeRequired && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Oversize Permit Required
              </Badge>
            )}
            {permit.overweightRequired && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Overweight Permit Required
              </Badge>
            )}
            {!permit.oversizeRequired && !permit.overweightRequired && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                No Permit Required
              </Badge>
            )}
          </div>

          {/* Escorts */}
          {(permit.escortsRequired > 0 || permit.poleCarRequired || permit.policeEscortRequired) && (
            <div className="text-sm">
              <span className="font-medium">Escorts: </span>
              {permit.escortsRequired > 0 && `${permit.escortsRequired} escort vehicle(s)`}
              {permit.poleCarRequired && ' + Pole car'}
              {permit.policeEscortRequired && ' + Police escort'}
            </div>
          )}

          {/* Reasons */}
          {permit.reasons.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-1">Reasons:</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {permit.reasons.map((r, idx) => (
                  <li key={idx}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Travel Restrictions */}
          {permit.travelRestrictions.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-1">Travel Restrictions:</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {permit.travelRestrictions.map((r, idx) => (
                  <li key={idx}>• {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
