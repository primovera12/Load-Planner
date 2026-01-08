'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Truck, ArrowLeft } from 'lucide-react'
import { useWizard, WizardStepper } from '@/components/wizard'
import { WizardStep } from '@/types/wizard'
import { Button } from '@/components/ui/button'

// Step components (will be created next)
import { InputStep } from '@/components/wizard/steps/InputStep'
import { ReviewItemsStep } from '@/components/wizard/steps/ReviewItemsStep'
import { TrailerSelectionStep } from '@/components/wizard/steps/TrailerSelectionStep'
import { OrganizeStep } from '@/components/wizard/steps/OrganizeStep'
import { ReviewPlanStep } from '@/components/wizard/steps/ReviewPlanStep'
import { ExportStep } from '@/components/wizard/steps/ExportStep'

// Loading fallback
function StepLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  )
}

// Step renderer
function StepContent({ step }: { step: WizardStep }) {
  switch (step) {
    case 'input':
      return <InputStep />
    case 'review':
      return <ReviewItemsStep />
    case 'trailer':
      return <TrailerSelectionStep />
    case 'organize':
      return <OrganizeStep />
    case 'plan':
      return <ReviewPlanStep />
    case 'export':
      return <ExportStep />
    default:
      return <InputStep />
  }
}

// Inner component that uses searchParams
function WizardContent() {
  const searchParams = useSearchParams()
  const { state, goToStep } = useWizard()

  // Sync URL step param with wizard state
  useEffect(() => {
    const urlStep = searchParams.get('step') as WizardStep | null
    if (urlStep && urlStep !== state.currentStep) {
      goToStep(urlStep)
    }
  }, [searchParams, state.currentStep, goToStep])

  // Update URL when step changes
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('step', state.currentStep)
    window.history.replaceState({}, '', url.toString())
  }, [state.currentStep])

  return (
    <>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Exit Wizard</span>
            </Link>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              <span className="font-semibold">Load Planning Wizard</span>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/load-plan">View Previous Plans</Link>
            </Button>
          </div>
          <WizardStepper />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Suspense fallback={<StepLoading />}>
            <StepContent step={state.currentStep} />
          </Suspense>
        </div>
      </main>
    </>
  )
}

// Main page component with Suspense boundary for useSearchParams
export default function WizardPage() {
  return (
    <Suspense fallback={<StepLoading />}>
      <WizardContent />
    </Suspense>
  )
}
