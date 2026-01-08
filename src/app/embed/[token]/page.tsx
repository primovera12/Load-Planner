'use client'

import { useState, useEffect, use } from 'react'
import { Truck, Package, Loader2, AlertTriangle } from 'lucide-react'

interface EmbedData {
  entityType: 'QUOTE' | 'LOAD'
  entity: any
  owner: {
    company: string | null
  }
}

export default function EmbedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<EmbedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [token])

  async function fetchData() {
    try {
      const response = await fetch(`/api/share/${token}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        setError('Unable to load')
      }
    } catch {
      setError('Unable to load')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px] bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px] bg-white">
        <div className="text-center text-gray-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const { entity, entityType, owner } = data

  if (entityType === 'QUOTE') {
    return (
      <div className="bg-white border rounded-lg overflow-hidden font-sans">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              <span className="font-semibold">{owner.company || 'Load Planner'}</span>
            </div>
            <span className="text-sm opacity-90">Quote</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-mono font-bold text-lg">{entity.quoteNumber}</p>
              {entity.customer && (
                <p className="text-sm text-gray-500">{entity.customer.name}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(entity.total)}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                entity.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                entity.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {entity.status}
              </span>
            </div>
          </div>

          {/* Line items preview */}
          <div className="border-t pt-3">
            <p className="text-xs text-gray-500 mb-2">
              {entity.lineItems?.length || 0} line items
            </p>
            {entity.lineItems?.slice(0, 3).map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm py-1">
                <span className="text-gray-600 truncate flex-1">{item.description}</span>
                <span className="font-medium ml-2">{formatCurrency(item.total)}</span>
              </div>
            ))}
            {entity.lineItems?.length > 3 && (
              <p className="text-xs text-gray-400 mt-1">
                +{entity.lineItems.length - 3} more items
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <a
          href={`${window.location.origin}/share/${token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gray-50 border-t px-4 py-2 text-center text-sm text-blue-600 hover:bg-gray-100 transition-colors"
        >
          View Full Quote →
        </a>
      </div>
    )
  }

  // Load embed
  return (
    <div className="bg-white border rounded-lg overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <span className="font-semibold">{owner.company || 'Load Planner'}</span>
          </div>
          <span className="text-sm opacity-90">Load</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="font-mono font-bold text-lg mb-2">{entity.loadNumber}</p>

        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <span>{entity.origin}</span>
          <span className="text-gray-400">→</span>
          <span>{entity.destination}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Dimensions</p>
            <p className="font-medium">
              {entity.length}' × {entity.width}' × {entity.height}'
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Weight</p>
            <p className="font-medium">{entity.weight.toLocaleString()} lbs</p>
          </div>
        </div>

        {entity.description && (
          <p className="text-sm text-gray-600 mt-3 border-t pt-3">
            {entity.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <a
        href={`${window.location.origin}/share/${token}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-gray-50 border-t px-4 py-2 text-center text-sm text-green-600 hover:bg-gray-100 transition-colors"
      >
        View Full Details →
      </a>
    </div>
  )
}
