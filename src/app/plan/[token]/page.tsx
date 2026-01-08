'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Truck,
  Package,
  Scale,
  MapPin,
  Download,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SharedPlanData {
  items: Array<{
    id: string
    description: string
    length: number
    width: number
    height: number
    weight: number
    quantity: number
  }>
  placements: Array<{
    itemId: string
    position: { x: number; y: number; z: number }
    rotated: boolean
  }>
  trailers: Array<{
    id: string
    name: string
    deckLength: number
    deckWidth: number
    deckHeight: number
    maxCargoWeight: number
  }>
  origin: string
  destination: string
  description: string
  instructions: Array<{
    stepNumber: number
    itemName: string
    position: { description: string }
    rotation: string
    secureInstructions: string[]
  }>
}

// Simple isometric view for the shared page
function SimpleIsometricView({
  trailer,
  items,
  placements,
}: {
  trailer: { deckLength: number; deckWidth: number; deckHeight: number }
  items: SharedPlanData['items']
  placements: SharedPlanData['placements']
}) {
  const scale = 4
  const isoAngle = 30
  const cosA = Math.cos((isoAngle * Math.PI) / 180)
  const sinA = Math.sin((isoAngle * Math.PI) / 180)

  const toIso = (x: number, y: number, z: number) => ({
    x: (x - z) * cosA * scale + 300,
    y: (x + z) * sinA * scale - y * scale + 150,
  })

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  return (
    <svg width="100%" height="250" viewBox="0 0 600 250" className="mx-auto">
      {/* Deck */}
      <polygon
        points={`${toIso(0, 0, 0).x},${toIso(0, 0, 0).y} ${toIso(0, 0, trailer.deckWidth).x},${toIso(0, 0, trailer.deckWidth).y} ${toIso(trailer.deckLength, 0, trailer.deckWidth).x},${toIso(trailer.deckLength, 0, trailer.deckWidth).y} ${toIso(trailer.deckLength, 0, 0).x},${toIso(trailer.deckLength, 0, 0).y}`}
        fill="#e2e8f0"
        stroke="#64748b"
        strokeWidth={1}
      />

      {/* Cargo items */}
      {placements.map((placement, index) => {
        const item = items.find(i => i.id === placement.itemId)
        if (!item) return null

        const length = placement.rotated ? item.width : item.length
        const width = placement.rotated ? item.length : item.width
        const height = item.height
        const { x, z } = placement.position
        const color = colors[index % colors.length]

        const p5 = toIso(x, height, z)
        const p6 = toIso(x + length, height, z)
        const p7 = toIso(x + length, height, z + width)
        const p8 = toIso(x, height, z + width)
        const p1 = toIso(x, 0, z)
        const p2 = toIso(x + length, 0, z)
        const p3 = toIso(x + length, 0, z + width)

        return (
          <g key={item.id}>
            <polygon
              points={`${p5.x},${p5.y} ${p6.x},${p6.y} ${p7.x},${p7.y} ${p8.x},${p8.y}`}
              fill={color}
              fillOpacity={0.9}
              stroke="#000"
              strokeWidth={0.5}
            />
            <polygon
              points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p6.x},${p6.y} ${p5.x},${p5.y}`}
              fill={color}
              fillOpacity={0.7}
              stroke="#000"
              strokeWidth={0.5}
            />
            <polygon
              points={`${p2.x},${p2.y} ${p3.x},${p3.y} ${p7.x},${p7.y} ${p6.x},${p6.y}`}
              fill={color}
              fillOpacity={0.5}
              stroke="#000"
              strokeWidth={0.5}
            />
          </g>
        )
      })}
    </svg>
  )
}

export default function SharedPlanPage() {
  const params = useParams()
  const token = params?.token as string
  const [data, setData] = useState<SharedPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlan() {
      if (!token) return

      try {
        const response = await fetch(`/api/load-plan-share/${token}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load plan')
        }

        setData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plan')
      } finally {
        setLoading(false)
      }
    }

    fetchPlan()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading load plan...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Load Plan Not Found</h1>
            <p className="text-muted-foreground mb-4">
              {error || 'This link may have expired or been removed.'}
            </p>
            <Button asChild>
              <Link href="/wizard">Create New Load Plan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalWeight = data.items.reduce((sum, item) => sum + item.weight * item.quantity, 0)
  const trailer = data.trailers[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" />
              <span className="font-semibold text-lg">Load Plan</span>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/wizard">
                <ExternalLink className="w-4 h-4 mr-2" />
                Create Your Own
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Title and route */}
          {(data.description || data.origin || data.destination) && (
            <div className="text-center">
              {data.description && (
                <h1 className="text-2xl font-bold mb-2">{data.description}</h1>
              )}
              {(data.origin || data.destination) && (
                <p className="text-muted-foreground flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {data.origin || 'Origin'} → {data.destination || 'Destination'}
                </p>
              )}
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <Truck className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-lg font-bold">{trailer?.name || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Trailer</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <Package className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-lg font-bold">{data.items.length}</p>
                <p className="text-xs text-muted-foreground">Items</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <Scale className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-lg font-bold">{totalWeight.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total lbs</p>
              </CardContent>
            </Card>
          </div>

          {/* Visualization */}
          {trailer && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Load Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleIsometricView
                  trailer={trailer}
                  items={data.items}
                  placements={data.placements}
                />
              </CardContent>
            </Card>
          )}

          {/* Loading instructions */}
          {data.instructions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Loading Sequence</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Orientation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.instructions.map((instruction) => (
                      <TableRow key={instruction.stepNumber}>
                        <TableCell className="font-medium">{instruction.stepNumber}</TableCell>
                        <TableCell>{instruction.itemName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {instruction.position.description}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {instruction.rotation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Items list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Dimensions (ft)</TableHead>
                    <TableHead className="text-right">Weight (lbs)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.length} × {item.width} × {item.height}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.weight.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground py-4">
            <p>Generated with Load Planner</p>
            <Button variant="link" size="sm" asChild>
              <Link href="/wizard">Create your own load plan →</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
