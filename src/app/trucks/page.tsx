import { trucks, getCategories } from '@/data/trucks'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Truck, Ruler, Scale, ArrowUpDown } from 'lucide-react'
import { formatDimension, formatWeight } from '@/lib/unit-converter'

export default function TrucksPage() {
  const categories = getCategories()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Trailer Types</h1>
              <p className="text-sm text-muted-foreground">
                Browse all {trucks.length} trailer types with specifications and best use cases
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6 rounded-lg border bg-white p-4">
          <h3 className="text-sm font-medium mb-3">Understanding Deck Heights</h3>
          <p className="text-sm text-muted-foreground mb-3">
            The deck height determines the maximum legal cargo height. Total height (cargo + deck)
            must not exceed <span className="font-mono bg-slate-100 px-1 rounded">13.5 feet</span> without permits.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>Lowest deck (more height clearance)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span>Medium deck</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span>Standard deck</span>
            </div>
          </div>
        </div>

        {/* Trucks Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {trucks.map((truck) => {
            const deckColor =
              truck.deckHeight <= 2
                ? 'bg-green-500'
                : truck.deckHeight <= 3.5
                ? 'bg-yellow-500'
                : 'bg-blue-500'

            return (
              <Card key={truck.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{truck.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {truck.category.replace(/_/g, ' ')}
                      </CardDescription>
                    </div>
                    <div
                      className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-white ${deckColor}`}
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      {formatDimension(truck.deckHeight)} deck
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{truck.description}</p>

                  {/* Specs */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Ruler className="h-3 w-3" />
                        <span className="text-xs">Max Cargo Height</span>
                      </div>
                      <div className="font-semibold">
                        {formatDimension(truck.maxLegalCargoHeight)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Scale className="h-3 w-3" />
                        <span className="text-xs">Max Weight</span>
                      </div>
                      <div className="font-semibold">
                        {formatWeight(truck.maxCargoWeight)}
                      </div>
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div className="text-xs text-muted-foreground">
                    Deck: {formatDimension(truck.deckLength)} L × {formatDimension(truck.deckWidth)} W
                    {truck.wellLength && ` • Well: ${formatDimension(truck.wellLength)}`}
                  </div>

                  {/* Best For */}
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Best For:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {truck.bestFor.slice(0, 3).map((use, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {use}
                        </Badge>
                      ))}
                      {truck.bestFor.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{truck.bestFor.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Loading Method */}
                  <div className="pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Loading: </span>
                    <span className="text-xs font-medium capitalize">
                      {truck.loadingMethod.replace('-', ' ')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
