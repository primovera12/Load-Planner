'use client'

import { Package } from 'lucide-react'
import { UniversalAnalyzer } from '@/components/universal-analyzer'
import { WizardNavigation } from '../WizardNavigation'
import { useWizard } from '../WizardProvider'
import { AnalyzeResponse } from '@/types'
import { LoadItem } from '@/types/load'

// Convert parsed items to LoadItems
function convertToLoadItems(parsedLoad: AnalyzeResponse['parsedLoad']): LoadItem[] {
  if (!parsedLoad?.items) return []

  return parsedLoad.items.map((item, index) => ({
    id: item.id || `item-${index}`,
    sku: item.sku || '',
    description: item.description || `Item ${index + 1}`,
    quantity: item.quantity || 1,
    length: item.length || 0,
    width: item.width || 0,
    height: item.height || 0,
    weight: item.weight || 0,
    stackable: item.stackable ?? true,
    bottomOnly: item.bottomOnly ?? false,
    maxLayers: item.maxLayers,
    maxLoad: item.maxLoad,
    orientation: item.orientation,
    geometry: item.geometry,
    color: item.color,
    priority: item.priority,
    fragile: false,
    hazmat: false,
  }))
}

export function InputStep() {
  const { state, dispatch, nextStep } = useWizard()

  const handleAnalysisComplete = (result: AnalyzeResponse) => {
    // Store items
    const items = convertToLoadItems(result.parsedLoad)
    dispatch({ type: 'SET_ITEMS', payload: items })

    // Store origin/destination if provided
    if (result.parsedLoad?.origin) {
      dispatch({ type: 'SET_ORIGIN', payload: result.parsedLoad.origin })
    }
    if (result.parsedLoad?.destination) {
      dispatch({ type: 'SET_DESTINATION', payload: result.parsedLoad.destination })
    }
    if (result.parsedLoad?.description) {
      dispatch({ type: 'SET_LOAD_DESCRIPTION', payload: result.parsedLoad.description })
    }

    // Store recommendations if available
    if (result.recommendations) {
      dispatch({ type: 'SET_RECOMMENDATIONS', payload: result.recommendations })
    }

    // Store parsed load
    if (result.parsedLoad) {
      dispatch({ type: 'SET_PARSED_LOAD', payload: result.parsedLoad })
    }

    // Store warnings
    if (result.warnings) {
      dispatch({ type: 'SET_WARNINGS', payload: result.warnings })
    }

    // Move to next step
    nextStep()
  }

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Package className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Upload Your Cargo Data</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Upload a spreadsheet, PDF, image, or paste text containing your cargo information.
          Our AI will extract the dimensions and weights automatically.
        </p>
      </div>

      {/* Universal analyzer with callback mode */}
      <UniversalAnalyzer
        onComplete={handleAnalysisComplete}
        skipRedirect={true}
        initialMode={state.inputMode}
        initialText={state.rawText}
      />

      {/* Navigation - only show back button to exit */}
      <WizardNavigation hideNext={true} showReset={state.items.length > 0} />
    </div>
  )
}
