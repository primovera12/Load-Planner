'use client'

import { ParsedLoad } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfidenceBadge } from './confidence-badge'
import { formatDimension, formatWeight } from '@/lib/unit-converter'
import {
  Ruler,
  Scale,
  MapPin,
  Package,
} from 'lucide-react'

interface ParsedLoadDisplayProps {
  parsedLoad: ParsedLoad
}

export function ParsedLoadDisplay({ parsedLoad }: ParsedLoadDisplayProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Parsed Load Details</CardTitle>
          <ConfidenceBadge confidence={parsedLoad.confidence} />
        </div>
        {parsedLoad.description && (
          <p className="text-sm text-muted-foreground">{parsedLoad.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dimensions */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Ruler className="h-4 w-4" />
            Dimensions
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-muted p-3 text-center">
              <div className="text-xs text-muted-foreground">Length</div>
              <div className="text-lg font-semibold">
                {parsedLoad.length > 0 ? formatDimension(parsedLoad.length) : '—'}
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <div className="text-xs text-muted-foreground">Width</div>
              <div className="text-lg font-semibold">
                {parsedLoad.width > 0 ? formatDimension(parsedLoad.width) : '—'}
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <div className="text-xs text-muted-foreground">Height</div>
              <div className="text-lg font-semibold">
                {parsedLoad.height > 0 ? formatDimension(parsedLoad.height) : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Scale className="h-4 w-4" />
            Weight
          </div>
          <div className="rounded-lg bg-muted p-3">
            <div className="text-2xl font-bold">
              {parsedLoad.weight > 0 ? formatWeight(parsedLoad.weight) : '—'}
            </div>
          </div>
        </div>

        {/* Locations */}
        {(parsedLoad.origin || parsedLoad.destination) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Route
            </div>
            <div className="space-y-2">
              {parsedLoad.origin && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-12">
                    FROM
                  </span>
                  <span className="text-sm">{parsedLoad.origin}</span>
                </div>
              )}
              {parsedLoad.destination && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground w-12">
                    TO
                  </span>
                  <span className="text-sm">{parsedLoad.destination}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items (if multiple) */}
        {parsedLoad.items.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Package className="h-4 w-4" />
              Items ({parsedLoad.items.length})
            </div>
            <div className="space-y-1">
              {parsedLoad.items.map((item, index) => (
                <div
                  key={item.id}
                  className="text-sm text-muted-foreground"
                >
                  {index + 1}. {item.description} ({formatDimension(item.length)} x{' '}
                  {formatDimension(item.width)} x {formatDimension(item.height)},{' '}
                  {formatWeight(item.weight)})
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
