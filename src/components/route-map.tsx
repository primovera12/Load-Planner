'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Navigation } from 'lucide-react'

// Types for route display
interface RoutePoint {
  lat: number
  lng: number
}

interface RouteMapProps {
  origin?: RoutePoint
  destination?: RoutePoint
  routePoints?: RoutePoint[]
  statesTraversed?: string[]
  bounds?: {
    northeast: RoutePoint
    southwest: RoutePoint
  }
}

// Dynamic import for Leaflet (client-side only)
export function RouteMap({
  origin,
  destination,
  routePoints,
  statesTraversed,
  bounds,
}: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return

    // Dynamically import Leaflet
    const loadLeaflet = async () => {
      const L = await import('leaflet')

      // Load Leaflet CSS via link tag (avoids TypeScript issues with CSS imports)
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)
      }

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      if (mapRef.current && !mapInstance) {
        // Initialize map centered on US
        const map = L.map(mapRef.current).setView([39.8283, -98.5795], 4)

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        setMapInstance(map)
        setIsLoaded(true)
      }
    }

    loadLeaflet()

    return () => {
      if (mapInstance) {
        mapInstance.remove()
      }
    }
  }, [])

  // Update map when route changes
  useEffect(() => {
    if (!mapInstance || !isLoaded) return

    const L = require('leaflet')

    // Clear existing layers except tile layer
    mapInstance.eachLayer((layer: any) => {
      if (!(layer instanceof L.TileLayer)) {
        mapInstance.removeLayer(layer)
      }
    })

    // Add origin marker
    if (origin) {
      const originIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      L.marker([origin.lat, origin.lng], { icon: originIcon })
        .addTo(mapInstance)
        .bindPopup('Origin')
    }

    // Add destination marker
    if (destination) {
      const destIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      L.marker([destination.lat, destination.lng], { icon: destIcon })
        .addTo(mapInstance)
        .bindPopup('Destination')
    }

    // Draw route polyline
    if (routePoints && routePoints.length > 1) {
      const latlngs = routePoints.map((p) => [p.lat, p.lng])
      L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
      }).addTo(mapInstance)
    }

    // Fit bounds if available
    if (bounds) {
      mapInstance.fitBounds([
        [bounds.southwest.lat, bounds.southwest.lng],
        [bounds.northeast.lat, bounds.northeast.lng],
      ], { padding: [50, 50] })
    } else if (origin && destination) {
      mapInstance.fitBounds([
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ], { padding: [50, 50] })
    }
  }, [mapInstance, isLoaded, origin, destination, routePoints, bounds])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Navigation className="h-5 w-5" />
          Route Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={mapRef}
          className="h-[400px] w-full rounded-lg border bg-slate-100"
          style={{ minHeight: '400px' }}
        />
        {statesTraversed && statesTraversed.length > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Route passes through:</span>
            <span className="font-medium">{statesTraversed.join(' → ')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Placeholder for when map hasn't loaded
export function RouteMapPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Navigation className="h-5 w-5" />
          Route Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full rounded-lg border bg-slate-100 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Enter origin and destination to view route</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
