/**
 * Permit Types for Load Planner
 */

export interface LegalLimits {
  maxWidth: number // feet
  maxHeight: number // feet
  maxLength: {
    single: number
    combination: number
  }
  maxWeight: {
    gross: number
    perAxle?: {
      single: number
      tandem: number
      tridem?: number
    }
  }
}

export interface DimensionSurcharge {
  threshold: number
  fee: number
}

export interface WeightBracket {
  upTo: number
  fee: number
}

export interface OversizePermit {
  singleTrip: {
    baseFee: number
    dimensionSurcharges?: {
      width?: DimensionSurcharge[]
      height?: DimensionSurcharge[]
      length?: DimensionSurcharge[]
    }
    processingTime: string
    validity: string
  }
  annual?: {
    baseFee: number
    maxWidth?: number
    maxHeight?: number
    maxLength?: number
  }
}

export interface OverweightPermit {
  singleTrip: {
    baseFee: number
    perMileFee?: number
    tonMileFee?: number
    weightBrackets?: WeightBracket[]
    extraLegalFees?: {
      perTrip?: number
    }
  }
}

export interface EscortRules {
  width: {
    oneEscort: number
    twoEscorts: number
    front?: boolean
    rear?: boolean
  }
  height?: {
    poleCar: number
  }
  length?: {
    oneEscort: number
    twoEscorts?: number
  }
  policeEscort?: {
    width?: number
    height?: number
    fee: number
  }
}

export interface TravelRestrictions {
  noNightTravel: boolean
  nightDefinition?: string
  noWeekendTravel?: boolean
  weekendDefinition?: string
  noHolidayTravel: boolean
  holidays?: string[]
  peakHourRestrictions?: string
  weatherRestrictions?: string
}

export interface StateContact {
  agency: string
  phone: string
  email?: string
  website: string
  permitPortal?: string
}

export interface SuperloadThresholds {
  width?: number
  height?: number
  length?: number
  weight?: number
  requiresRouteSurvey?: boolean
  requiresBridgeAnalysis?: boolean
}

export interface StatePermitData {
  stateCode: string
  stateName: string
  timezone: string
  legalLimits: LegalLimits
  oversizePermits: OversizePermit
  overweightPermits: OverweightPermit
  escortRules: EscortRules
  travelRestrictions: TravelRestrictions
  contact: StateContact
  superloadThresholds?: SuperloadThresholds
  notes?: string[]
}

// Permit calculation results
export interface PermitRequirement {
  state: string
  stateCode: string
  oversizeRequired: boolean
  overweightRequired: boolean
  isSuperload: boolean
  escortsRequired: number
  poleCarRequired: boolean
  policeEscortRequired: boolean
  estimatedFee: number
  reasons: string[]
  travelRestrictions: string[]
}

export interface RoutePermitSummary {
  states: PermitRequirement[]
  totalPermitFees: number
  totalEscortCost: number
  estimatedEscortsPerDay: number
  overallRestrictions: string[]
  warnings: string[]
}
