// Truck and trailer type definitions

export type TrailerCategory =
  | 'FLATBED'
  | 'STEP_DECK'
  | 'RGN'
  | 'LOWBOY'
  | 'DOUBLE_DROP'
  | 'LANDOLL'
  | 'CONESTOGA'
  | 'DRY_VAN'
  | 'REEFER'
  | 'CURTAIN_SIDE'
  | 'MULTI_AXLE'
  | 'SCHNABEL'
  | 'PERIMETER'
  | 'STEERABLE'
  | 'BLADE'

// Commonality tier: 1 = very common, 5 = rare/specialized
export type CommonalityTier = 1 | 2 | 3 | 4 | 5

export interface TruckType {
  id: string
  name: string
  category: TrailerCategory
  description: string
  // Deck specifications (in feet)
  deckHeight: number
  deckLength: number
  deckWidth: number
  // Well dimensions for step deck, double drop, etc.
  wellLength?: number
  wellHeight?: number
  // Capacity
  maxCargoWeight: number // in pounds
  tareWeight: number // trailer weight in pounds
  // Legal maximums this truck can handle legally (without permits)
  maxLegalCargoHeight: number // 13.5 - deckHeight
  maxLegalCargoWidth: number // 8.5 ft standard
  // Commonality/availability (1=very common, 5=rare/specialized)
  commonality: CommonalityTier
  availabilityNote?: string // e.g., "Requires heavy haul specialist"
  // Features
  features: string[]
  // Best suited for
  bestFor: string[]
  // Loading method
  loadingMethod: 'crane' | 'drive-on' | 'forklift' | 'ramp' | 'tilt'
  // Image/icon
  imageUrl?: string
}

export type PermitType =
  | 'OVERSIZE_WIDTH'
  | 'OVERSIZE_HEIGHT'
  | 'OVERSIZE_LENGTH'
  | 'OVERWEIGHT'
  | 'SUPERLOAD'

export interface PermitRequired {
  type: PermitType
  reason: string
  estimatedCost?: number
}

export interface FitAnalysis {
  // Does cargo fit on this trailer?
  fits: boolean
  // Total height (cargo + deck)
  totalHeight: number
  // Clearance from legal limits
  heightClearance: number // 13.5 - totalHeight
  widthClearance: number // 8.5 - cargoWidth
  // Weight analysis
  totalWeight: number // cargo + tare + tractor (~17000 lbs)
  weightClearance: number // 80000 - totalWeight
  // Legal status
  isLegal: boolean
  exceedsHeight: boolean
  exceedsWidth: boolean
  exceedsWeight: boolean
  exceedsLength: boolean
}

export interface TruckRecommendation {
  truck: TruckType
  // Score from 0-100
  score: number
  // Fit analysis
  fit: FitAnalysis
  // Required permits
  permitsRequired: PermitRequired[]
  // Recommendation reason
  reason: string
  // Warnings
  warnings: string[]
  // Is this the best choice?
  isBestChoice: boolean
}

// Legal limits (federal defaults, states may vary)
export const LEGAL_LIMITS = {
  HEIGHT: 13.5, // feet
  WIDTH: 8.5, // feet
  LENGTH_SINGLE: 48, // feet (single trailer)
  LENGTH_COMBINATION: 75, // feet (tractor + trailer)
  GROSS_WEIGHT: 80000, // pounds
  TRACTOR_WEIGHT: 17000, // typical tractor weight in pounds
} as const

// Permit thresholds for superloads (varies by state)
export const SUPERLOAD_THRESHOLDS = {
  WIDTH: 16, // feet
  HEIGHT: 16, // feet
  LENGTH: 120, // feet
  WEIGHT: 200000, // pounds
} as const

// Commonality scoring: bonus/penalty applied to truck selection score
export const COMMONALITY_SCORES: Record<CommonalityTier, number> = {
  1: 15,  // Very Common (Flatbed, Dry Van) - highest bonus
  2: 10,  // Common (Step Deck, Reefer)
  3: 5,   // Moderate (RGN, Conestoga, Landoll)
  4: 0,   // Specialized (Lowboy, Double Drop)
  5: -5,  // Rare/Heavy Haul (Multi-Axle, Schnabel, Perimeter) - penalty
}

// Human-readable labels for commonality tiers
export const COMMONALITY_LABELS: Record<CommonalityTier, string> = {
  1: 'Very Common',
  2: 'Common',
  3: 'Moderate',
  4: 'Specialized',
  5: 'Heavy Haul',
}
