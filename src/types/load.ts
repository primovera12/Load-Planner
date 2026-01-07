// Load and cargo type definitions

export interface LoadItem {
  id: string
  description: string
  quantity: number
  // Dimensions in feet
  length: number
  width: number
  height: number
  // Weight in pounds
  weight: number
  // Optional properties
  stackable?: boolean
  fragile?: boolean
  hazmat?: boolean
  notes?: string
}

export interface ParsedLoad {
  // Cargo dimensions (in feet)
  length: number
  width: number
  height: number
  // Weight in pounds
  weight: number
  // Location info
  origin?: string
  destination?: string
  // Parsed items (if multiple)
  items: LoadItem[]
  // Metadata
  description?: string
  pickupDate?: string
  deliveryDate?: string
  // Parsing confidence (0-100)
  confidence: number
  // Raw parsed fields for debugging
  rawFields?: Record<string, string>
}

export interface Location {
  address: string
  city?: string
  state?: string
  zipCode?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export type LoadStatus =
  | 'DRAFT'
  | 'ANALYZED'
  | 'ROUTED'
  | 'QUOTED'
  | 'BOOKED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'

export type LoadType =
  | 'STANDARD'
  | 'HEAVY_HAUL'
  | 'OVERSIZE'
  | 'SUPERLOAD'
  | 'HAZMAT'
  | 'SPECIALIZED'

export interface Load {
  id: string
  loadNumber: string
  status: LoadStatus
  type: LoadType
  // Cargo
  items: LoadItem[]
  totalWeight: number
  // Locations
  origin: Location
  destination: Location
  // Dates
  pickupDate?: Date
  deliveryDate?: Date
  // Metadata
  customerId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// API request/response types
export interface AnalyzeRequest {
  emailText: string
}

export interface AnalyzeResponse {
  success: boolean
  parsedLoad: ParsedLoad
  recommendations: import('./truck').TruckRecommendation[]
  error?: string
}
