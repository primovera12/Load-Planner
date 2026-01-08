'use client'

import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWizard } from './WizardProvider'
import { cn } from '@/lib/utils'
import { WIZARD_STEPS } from '@/types/wizard'

interface WizardNavigationProps {
  className?: string
  onNextClick?: () => Promise<boolean> | boolean // Return false to prevent navigation
  nextLabel?: string
  nextDisabled?: boolean
  showReset?: boolean
  hideBack?: boolean
  hideNext?: boolean
}

export function WizardNavigation({
  className,
  onNextClick,
  nextLabel,
  nextDisabled = false,
  showReset = false,
  hideBack = false,
  hideNext = false,
}: WizardNavigationProps) {
  const { state, nextStep, prevStep, getStepIndex, resetWizard } = useWizard()
  const currentIndex = getStepIndex(state.currentStep)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentIndex === WIZARD_STEPS.length - 1

  const handleNext = async () => {
    if (onNextClick) {
      const canProceed = await onNextClick()
      if (!canProceed) return
    }
    nextStep()
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to start over? All progress will be lost.')) {
      resetWizard()
    }
  }

  return (
    <div className={cn('flex items-center justify-between pt-6 border-t', className)}>
      <div className="flex items-center gap-2">
        {!hideBack && (
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={isFirstStep}
            className={cn(isFirstStep && 'invisible')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

        {showReset && (
          <Button variant="ghost" onClick={handleReset} className="text-muted-foreground">
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        )}
      </div>

      {!hideNext && (
        <Button onClick={handleNext} disabled={nextDisabled || isLastStep}>
          {nextLabel || (isLastStep ? 'Finish' : 'Continue')}
          {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
        </Button>
      )}
    </div>
  )
}
