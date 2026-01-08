'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react'
import {
  WizardState,
  WizardAction,
  WizardStep,
  initialWizardState,
  WIZARD_STEPS,
} from '@/types/wizard'

const STORAGE_KEY = 'load-planner-wizard-state'

// Wizard reducer
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload }

    case 'COMPLETE_STEP':
      if (!state.completedSteps.includes(action.payload)) {
        return { ...state, completedSteps: [...state.completedSteps, action.payload] }
      }
      return state

    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.payload }

    case 'SET_FILE':
      return {
        ...state,
        uploadedFile: action.payload.file,
        fileName: action.payload.name,
        parseError: null,
      }

    case 'CLEAR_FILE':
      return { ...state, uploadedFile: null, fileName: null }

    case 'SET_RAW_TEXT':
      return { ...state, rawText: action.payload, parseError: null }

    case 'SET_PARSE_ERROR':
      return { ...state, parseError: action.payload }

    case 'SET_ITEMS':
      return { ...state, items: action.payload }

    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload.updates } : item
        ),
      }

    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] }

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((item) => item.id !== action.payload) }

    case 'SET_ORIGIN':
      return { ...state, origin: action.payload }

    case 'SET_DESTINATION':
      return { ...state, destination: action.payload }

    case 'SET_LOAD_DESCRIPTION':
      return { ...state, loadDescription: action.payload }

    case 'SET_PICKUP_DATE':
      return { ...state, pickupDate: action.payload }

    case 'SET_DELIVERY_DATE':
      return { ...state, deliveryDate: action.payload }

    case 'SET_RECOMMENDATIONS':
      return { ...state, recommendations: action.payload }

    case 'SELECT_TRAILER':
      // Prevent duplicates
      if (state.selectedTrailers.some((t) => t.id === action.payload.id)) {
        return state
      }
      return { ...state, selectedTrailers: [...state.selectedTrailers, action.payload] }

    case 'REMOVE_TRAILER':
      return {
        ...state,
        selectedTrailers: state.selectedTrailers.filter((t) => t.id !== action.payload),
        trailerAssignments: state.trailerAssignments.filter((a) => a.trailerId !== action.payload),
      }

    case 'SET_TRAILER_ASSIGNMENTS':
      return { ...state, trailerAssignments: action.payload }

    case 'SET_PLACEMENTS':
      return { ...state, placements: action.payload }

    case 'MOVE_ITEM':
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.itemId === action.payload.itemId ? { ...p, position: action.payload.position } : p
        ),
        manualAdjustments: true,
      }

    case 'ROTATE_ITEM':
      return {
        ...state,
        placements: state.placements.map((p) =>
          p.itemId === action.payload ? { ...p, rotated: !p.rotated } : p
        ),
        manualAdjustments: true,
      }

    case 'SET_OPTIMIZATION_RUN':
      return { ...state, optimizationRun: action.payload }

    case 'SET_MANUAL_ADJUSTMENTS':
      return { ...state, manualAdjustments: action.payload }

    case 'SET_PARSED_LOAD':
      return { ...state, parsedLoad: action.payload }

    case 'SET_LOADING_INSTRUCTIONS':
      return { ...state, loadingInstructions: action.payload }

    case 'SET_WARNINGS':
      return { ...state, warnings: action.payload }

    case 'SET_SHARE_TOKEN':
      return { ...state, shareToken: action.payload }

    case 'SET_PDF_GENERATED':
      return { ...state, pdfGenerated: action.payload }

    case 'RESTORE_STATE':
      return { ...state, ...action.payload }

    case 'RESET_WIZARD':
      return initialWizardState

    default:
      return state
  }
}

// Context type
interface WizardContextType {
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  // Helper functions
  goToStep: (step: WizardStep) => void
  nextStep: () => void
  prevStep: () => void
  canGoToStep: (step: WizardStep) => boolean
  isStepComplete: (step: WizardStep) => boolean
  getStepIndex: (step: WizardStep) => number
  resetWizard: () => void
}

const WizardContext = createContext<WizardContextType | null>(null)

// Serialize state for storage (excluding File objects)
function serializeState(state: WizardState): string {
  const serializable = {
    ...state,
    uploadedFile: null, // Can't serialize File objects
  }
  return JSON.stringify(serializable)
}

// Deserialize state from storage
function deserializeState(json: string): Partial<WizardState> | null {
  try {
    const parsed = JSON.parse(json)
    return parsed
  } catch {
    return null
  }
}

interface WizardProviderProps {
  children: ReactNode
}

export function WizardProvider({ children }: WizardProviderProps) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState)

  // Restore state from session storage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const restored = deserializeState(saved)
      if (restored) {
        dispatch({ type: 'RESTORE_STATE', payload: restored })
      }
    }
  }, [])

  // Save state to session storage on every change
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, serializeState(state))
  }, [state])

  // Helper functions
  const getStepIndex = useCallback((step: WizardStep): number => {
    return WIZARD_STEPS.findIndex((s) => s.id === step)
  }, [])

  const goToStep = useCallback((step: WizardStep) => {
    dispatch({ type: 'SET_STEP', payload: step })
  }, [])

  const nextStep = useCallback(() => {
    const currentIndex = getStepIndex(state.currentStep)
    if (currentIndex < WIZARD_STEPS.length - 1) {
      dispatch({ type: 'COMPLETE_STEP', payload: state.currentStep })
      dispatch({ type: 'SET_STEP', payload: WIZARD_STEPS[currentIndex + 1].id })
    }
  }, [state.currentStep, getStepIndex])

  const prevStep = useCallback(() => {
    const currentIndex = getStepIndex(state.currentStep)
    if (currentIndex > 0) {
      dispatch({ type: 'SET_STEP', payload: WIZARD_STEPS[currentIndex - 1].id })
    }
  }, [state.currentStep, getStepIndex])

  const canGoToStep = useCallback(
    (step: WizardStep): boolean => {
      const targetIndex = getStepIndex(step)
      const currentIndex = getStepIndex(state.currentStep)

      // Can always go back
      if (targetIndex <= currentIndex) return true

      // Can only go forward if all previous steps are complete
      for (let i = 0; i < targetIndex; i++) {
        if (!state.completedSteps.includes(WIZARD_STEPS[i].id)) {
          return false
        }
      }
      return true
    },
    [state.currentStep, state.completedSteps, getStepIndex]
  )

  const isStepComplete = useCallback(
    (step: WizardStep): boolean => {
      return state.completedSteps.includes(step)
    },
    [state.completedSteps]
  )

  const resetWizard = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    dispatch({ type: 'RESET_WIZARD' })
  }, [])

  const value: WizardContextType = {
    state,
    dispatch,
    goToStep,
    nextStep,
    prevStep,
    canGoToStep,
    isStepComplete,
    getStepIndex,
    resetWizard,
  }

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}

// Hook to use wizard context
export function useWizard(): WizardContextType {
  const context = useContext(WizardContext)
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return context
}
