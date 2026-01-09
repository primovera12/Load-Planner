/**
 * Route Planning Types
 * Types for multi-stop route planning, customer management, and cost estimation
 */

// Stop types
export type StopType = 'PICKUP' | 'DELIVERY'

// Route stop - represents a single pickup or delivery location
export interface RouteStop {
  id: string
  type: StopType
  sequence: number  // Order in route (0, 1, 2...)

  // Location
  address: string
  city?: string
  state?: string
  zipCode?: string
  placeId?: string  // Google Places ID for autocomplete
  latitude?: number
  longitude?: number
  formattedAddress?: string  // Full formatted address from Google

  // Contact at this stop
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  notes?: string

  // Timing
  scheduledDate?: string  // ISO date string
  scheduledTime?: string  // e.g., "08:00-12:00"

  // Items picked up or delivered at this stop
  itemIds: string[]
}

// Assignment of an item to pickup and delivery stops
export interface ItemStopAssignment {
  itemId: string
  itemDescription: string
  pickupStopId: string
  deliveryStopId: string
}

// Single leg between two stops
export interface RouteLeg {
  fromStopId: string
  toStopId: string
  distance: number  // miles
  duration: number  // minutes
  polyline: string  // Encoded polyline for map
  statesInLeg: string[]  // States traversed in this leg
}

// Complete multi-stop route
export interface MultiStopRoute {
  stops: RouteStop[]
  legs: RouteLeg[]
  totalDistance: number  // miles
  totalDuration: number  // minutes
  statesTraversed: string[]  // All states in order
  polyline: string  // Full route polyline
  optimized: boolean  // Whether route has been optimized
}

// Route optimization result
export interface RouteOptimizationResult {
  originalOrder: string[]  // Stop IDs in original order
  optimizedOrder: string[]  // Stop IDs in optimal order
  originalDistance: number
  optimizedDistance: number
  distanceSaved: number
  timeSaved: number  // minutes
  isValid: boolean  // Respects pickup-before-delivery constraints
  message?: string
}

// Customer info for the load
export interface LoadCustomer {
  id?: string  // If selecting existing customer
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  placeId?: string
}

// Fuel price data
export interface FuelPrice {
  state: string
  region?: string
  dieselPrice: number  // Price per gallon
  source: 'EIA' | 'GasBuddy' | 'manual'
  lastUpdated: string  // ISO date
}

// Truck stop info
export interface TruckStopInfo {
  id: string
  name: string
  address: string
  city: string
  state: string
  coordinates: {
    lat: number
    lng: number
  }
  amenities: string[]  // 'fuel', 'scales', 'parking', 'restaurant', 'showers', etc.
  fuelPrice?: number
  distanceFromRoute?: number  // miles off route
}

// Rate estimate
export interface RateEstimate {
  baseRatePerMile: number
  oversizeSurcharge: number
  overweightSurcharge: number
  fuelSurcharge: number
  totalRatePerMile: number
  totalRate: number
  distance: number
  confidence: 'high' | 'medium' | 'low'
  breakdown: {
    lineHaul: number
    fuelSurcharge: number
    oversizeFees: number
    overweightFees: number
  }
}

// Per-state permit info
export interface StatePermitInfo {
  state: string
  stateCode: string
  distanceInState: number  // miles
  oversizeRequired: boolean
  overweightRequired: boolean
  isSuperload: boolean
  permitFee: number
  escortsRequired: number
  poleCarRequired: boolean
  policeEscortRequired: boolean
  escortCost: number
  travelRestrictions: string[]
  reasons: string[]
}

// Complete cost estimate
export interface CostEstimate {
  fuel: {
    totalGallons: number
    averagePrice: number
    totalCost: number
  }
  permits: {
    states: StatePermitInfo[]
    totalPermitFees: number
    totalEscortCost: number
  }
  rate: RateEstimate
  tolls: {
    estimated: number
    byState: { state: string; amount: number }[]
  }
  total: number
  breakdown: {
    lineHaul: number
    fuel: number
    permits: number
    escorts: number
    tolls: number
    other: number
  }
}

// API request/response types
export interface MultiStopRouteRequest {
  stops: Omit<RouteStop, 'id'>[]
  cargo: {
    width: number
    height: number
    length: number
    grossWeight: number
  }
  options?: {
    avoidTolls?: boolean
    avoidHighways?: boolean
    truckRoute?: boolean  // Use truck-optimized routing
  }
}

export interface MultiStopRouteResponse {
  success: boolean
  data?: {
    route: MultiStopRoute
    permits: {
      states: StatePermitInfo[]
      totalPermitFees: number
      totalEscortCost: number
      warnings: string[]
    }
    costs: CostEstimate
    truckStops: TruckStopInfo[]
  }
  error?: string
}

export interface RouteOptimizeRequest {
  stops: RouteStop[]
  itemAssignments: ItemStopAssignment[]
}

export interface RouteOptimizeResponse {
  success: boolean
  data?: RouteOptimizationResult
  error?: string
}

// Google Places types for autocomplete
export interface PlacePrediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
  types: string[]
}

export interface PlaceDetails {
  placeId: string
  formattedAddress: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  latitude: number
  longitude: number
}
