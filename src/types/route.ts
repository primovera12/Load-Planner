/**
 * Route Types for Load Planner
 */

export interface Coordinates {
  lat: number
  lng: number
}

export interface RouteLocation {
  address: string
  city: string
  state: string
  stateCode: string
  zipCode?: string
  coordinates?: Coordinates
}

export interface RouteSegment {
  from: RouteLocation
  to: RouteLocation
  distance: number // miles
  duration: number // minutes
  statesTraversed: string[] // state codes
}

export interface RouteInfo {
  origin: RouteLocation
  destination: RouteLocation
  totalDistance: number // miles
  totalDuration: number // minutes
  statesTraversed: string[] // state codes in order
  segments: RouteSegment[]
  geometry?: Coordinates[] // for drawing on map
}

export interface RoutePlanRequest {
  origin: string
  destination: string
  cargoWidth: number
  cargoHeight: number
  cargoLength: number
  grossWeight: number
}

export interface RoutePlanResponse {
  route: RouteInfo
  permits: import('./permit').RoutePermitSummary
  estimatedCosts: {
    permits: number
    escorts: number
    fuel: number // rough estimate
    total: number
  }
}
