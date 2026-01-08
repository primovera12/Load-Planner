// Wizard workflow types

import { LoadItem, ParsedLoad } from './load'
import { TruckType, TruckRecommendation } from './truck'

export type WizardStep = 'input' | 'review' | 'trailer' | 'organize' | 'plan' | 'export'

export const WIZARD_STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: 'input', label: 'Input', description: 'Upload or paste cargo data' },
  { id: 'review', label: 'Review', description: 'Verify cargo items' },
  { id: 'trailer', label: 'Trailer', description: 'Select trailer type' },
  { id: 'organize', label: 'Organize', description: 'Optimize cargo placement' },
  { id: 'plan', label: 'Plan', description: 'Review load plan' },
  { id: 'export', label: 'Export', description: 'Download & share' },
]

export interface ItemPlacement {
  itemId: string
  trailerId: string
  position: { x: number; y: number; z: number } // x = length (front-back), y = height, z = width (left-right)
  rotated: boolean // 90 degree rotation
  layer: number // Stacking layer (0 = floor)
}

export interface TrailerAssignment {
  trailerId: string
  trailer: TruckType
  itemIds: string[]
  placements: ItemPlacement[]
  totalWeight: number
  utilization: {
    length: number // percentage
    width: number
    height: number
    weight: number
    volume: number
  }
}

export interface LoadingInstruction {
  stepNumber: number
  itemId: string
  itemName: string
  action: 'load' | 'secure' | 'check'
  position: {
    description: string // "Front left, 3' from edge"
    coordinates: { x: number; y: number; z: number }
  }
  rotation: string // "Lengthwise" or "Crosswise"
  stackedOn?: string // Item name below if stacked
  secureInstructions: string[]
  notes: string[]
}

export interface WizardState {
  // Current step
  currentStep: WizardStep
  completedSteps: WizardStep[]

  // Step 1: Input
  inputMode: 'upload' | 'text'
  uploadedFile: File | null
  fileName: string | null
  rawText: string
  parseError: string | null

  // Step 2: Review Items
  items: LoadItem[]
  origin: string
  destination: string
  loadDescription: string
  pickupDate: string
  deliveryDate: string

  // Step 3: Trailer Selection
  recommendations: TruckRecommendation[]
  selectedTrailers: TruckType[]
  trailerAssignments: TrailerAssignment[]

  // Step 4: Organization
  placements: ItemPlacement[]
  optimizationRun: boolean
  manualAdjustments: boolean

  // Step 5: Review Plan
  parsedLoad: ParsedLoad | null
  loadingInstructions: LoadingInstruction[]
  warnings: string[]

  // Step 6: Export
  shareToken: string | null
  pdfGenerated: boolean
}

export type WizardAction =
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'COMPLETE_STEP'; payload: WizardStep }
  | { type: 'SET_INPUT_MODE'; payload: 'upload' | 'text' }
  | { type: 'SET_FILE'; payload: { file: File; name: string } }
  | { type: 'CLEAR_FILE' }
  | { type: 'SET_RAW_TEXT'; payload: string }
  | { type: 'SET_PARSE_ERROR'; payload: string | null }
  | { type: 'SET_ITEMS'; payload: LoadItem[] }
  | { type: 'UPDATE_ITEM'; payload: { id: string; updates: Partial<LoadItem> } }
  | { type: 'ADD_ITEM'; payload: LoadItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'SET_ORIGIN'; payload: string }
  | { type: 'SET_DESTINATION'; payload: string }
  | { type: 'SET_LOAD_DESCRIPTION'; payload: string }
  | { type: 'SET_PICKUP_DATE'; payload: string }
  | { type: 'SET_DELIVERY_DATE'; payload: string }
  | { type: 'SET_RECOMMENDATIONS'; payload: TruckRecommendation[] }
  | { type: 'SELECT_TRAILER'; payload: TruckType }
  | { type: 'REMOVE_TRAILER'; payload: string }
  | { type: 'SET_TRAILER_ASSIGNMENTS'; payload: TrailerAssignment[] }
  | { type: 'SET_PLACEMENTS'; payload: ItemPlacement[] }
  | { type: 'MOVE_ITEM'; payload: { itemId: string; position: { x: number; y: number; z: number } } }
  | { type: 'ROTATE_ITEM'; payload: string }
  | { type: 'SET_OPTIMIZATION_RUN'; payload: boolean }
  | { type: 'SET_MANUAL_ADJUSTMENTS'; payload: boolean }
  | { type: 'SET_PARSED_LOAD'; payload: ParsedLoad }
  | { type: 'SET_LOADING_INSTRUCTIONS'; payload: LoadingInstruction[] }
  | { type: 'SET_WARNINGS'; payload: string[] }
  | { type: 'SET_SHARE_TOKEN'; payload: string }
  | { type: 'SET_PDF_GENERATED'; payload: boolean }
  | { type: 'RESTORE_STATE'; payload: Partial<WizardState> }
  | { type: 'RESET_WIZARD' }

export const initialWizardState: WizardState = {
  currentStep: 'input',
  completedSteps: [],
  inputMode: 'upload',
  uploadedFile: null,
  fileName: null,
  rawText: '',
  parseError: null,
  items: [],
  origin: '',
  destination: '',
  loadDescription: '',
  pickupDate: '',
  deliveryDate: '',
  recommendations: [],
  selectedTrailers: [],
  trailerAssignments: [],
  placements: [],
  optimizationRun: false,
  manualAdjustments: false,
  parsedLoad: null,
  loadingInstructions: [],
  warnings: [],
  shareToken: null,
  pdfGenerated: false,
}
