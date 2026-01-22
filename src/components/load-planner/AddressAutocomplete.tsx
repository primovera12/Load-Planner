'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, MapPin } from 'lucide-react'
import { PlaceDetails } from '@/types/route-planning'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect?: (place: PlaceDetails) => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

// Load Google Maps script
let googleMapsPromise: Promise<void> | null = null

function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      resolve()
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      reject(new Error('Google Maps API key not configured'))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

// Parse address components from Google Places result
function parseAddressComponents(
  components: google.maps.GeocoderAddressComponent[]
): Partial<PlaceDetails> {
  const result: Partial<PlaceDetails> = {}

  for (const component of components) {
    const types = component.types

    if (types.includes('street_number')) {
      result.address = (result.address || '') + component.long_name + ' '
    }
    if (types.includes('route')) {
      result.address = (result.address || '') + component.long_name
    }
    if (types.includes('locality')) {
      result.city = component.long_name
    }
    if (types.includes('administrative_area_level_1')) {
      result.state = component.short_name
    }
    if (types.includes('postal_code')) {
      result.zipCode = component.long_name
    }
    if (types.includes('country')) {
      result.country = component.short_name
    }
  }

  return result
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address...',
  label,
  required = false,
  disabled = false,
  className = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize Google Places Autocomplete
  useEffect(() => {
    let isMounted = true

    async function initAutocomplete() {
      try {
        await loadGoogleMapsScript()

        if (!isMounted || !inputRef.current) return

        // Create autocomplete instance
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: ['us', 'ca'] },
          fields: ['place_id', 'formatted_address', 'address_components', 'geometry'],
        })

        // Listen for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace()
          if (!place || !place.place_id) return

          const components = place.address_components || []
          const parsed = parseAddressComponents(components)

          const placeDetails: PlaceDetails = {
            placeId: place.place_id,
            formattedAddress: place.formatted_address || '',
            address: parsed.address?.trim() || '',
            city: parsed.city || '',
            state: parsed.state || '',
            zipCode: parsed.zipCode || '',
            country: parsed.country || 'US',
            latitude: place.geometry?.location?.lat() || 0,
            longitude: place.geometry?.location?.lng() || 0,
          }

          onChange(place.formatted_address || '')
          onPlaceSelect?.(placeDetails)
        })

        setIsLoading(false)
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load autocomplete')
          setIsLoading(false)
        }
      }
    }

    initAutocomplete()

    return () => {
      isMounted = false
      // Cleanup autocomplete listeners
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [onChange, onPlaceSelect])

  // Handle manual input changes
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange]
  )

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <Label htmlFor="address-input" className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={isLoading ? 'Loading...' : placeholder}
          disabled={disabled || isLoading}
          className="pl-10 pr-10"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// Export a wrapper component that provides the Google Maps context
export function AddressAutocompleteWithProvider(props: AddressAutocompleteProps) {
  return <AddressAutocomplete {...props} />
}

export default AddressAutocomplete
