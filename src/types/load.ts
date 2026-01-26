// Load and cargo type definitions

// Geometry types for 3D visualization
export type ItemGeometry = 'box' | 'cylinder' | 'hollow-cylinder'

// Orientation flags (bitmask like Cargo Planner)
// 1 = Fixed (longship), 3 = Rotatable (default), 63 = Tiltable
export type OrientationMode = 1 | 3 | 63 | number

// Divisibility type - how an item can be split across trucks
export type DivisibleBy = 'quantity' | 'weight'

export interface LoadItem {
  id: string
  sku?: string // Item identifier/SKU
  description: string
  quantity: number
  // Dimensions in feet
  length: number
  width: number
  height: number
  // Weight in pounds
  weight: number
  // Stacking properties
  stackable?: boolean
  bottomOnly?: boolean // Can only be placed at bottom, nothing stacked on top
  maxLayers?: number // Max items that can stack on this
  maxLoad?: number // Max weight that can be placed on top (lbs)
  // Orientation/rotation
  orientation?: OrientationMode // 1=fixed, 3=rotatable, 63=tiltable
  // Visual properties
  geometry?: ItemGeometry // box, cylinder, hollow-cylinder
  color?: string // Hex color for visualization
  // Loading order
  priority?: number // Higher = load first
  loadIn?: string // Target container/trailer
  destination?: string // For multi-stop routes
  // Other properties
  fragile?: boolean
  hazmat?: boolean
  notes?: string
  // Divisibility properties - for splitting across trucks
  divisible?: boolean // Can this item be split across multiple trucks?
  divisibleBy?: DivisibleBy // How to divide: 'quantity' (split units) or 'weight' (split bulk)
  minSplitQuantity?: number // Min units per split when divisibleBy='quantity' (default: 1)
  minSplitWeight?: number // Min lbs per split when divisibleBy='weight' (default: 1000)
  // Split tracking - set when item is a split portion of an original
  originalItemId?: string // Reference to parent item if this is a split portion
  splitIndex?: number // Which part of the split this is (1, 2, 3...)
  totalSplitParts?: number // Total number of parts the original was split into
}

// Track how an item was split for reporting
export interface SplitItemGroup {
  originalItemId: string
  originalItem: LoadItem
  splits: LoadItem[]
  splitType: DivisibleBy
  totalParts: number
}

export interface ParsedLoad {
  // Cargo dimensions (in feet)
  length: number
  width: number
  height: number
  // Weight in pounds (heaviest single item for truck selection)
  weight: number
  // Total weight of all items (for multi-truck planning)
  totalWeight?: number
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

export interface AnalyzeMetadata {
  fileName?: string
  fileType?: string
  parsedRows?: number
  parseMethod?: 'pattern' | 'AI'
  itemsFound?: number
  hasAIFallback?: boolean
}

export interface AnalyzeResponse {
  success: boolean
  parsedLoad: ParsedLoad
  recommendations: import('./truck').TruckRecommendation[]
  loadPlan?: import('@/lib/load-planner').LoadPlan
  metadata?: AnalyzeMetadata
  rawText?: string
  error?: string
  warning?: string
  warnings?: string[]
}
