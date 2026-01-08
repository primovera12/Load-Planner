'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWizard } from './WizardProvider'
import { WIZARD_STEPS, WizardStep } from '@/types/wizard'

interface WizardStepperProps {
  className?: string
}

export function WizardStepper({ className }: WizardStepperProps) {
  const { state, goToStep, canGoToStep, isStepComplete, getStepIndex } = useWizard()
  const currentIndex = getStepIndex(state.currentStep)

  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      {/* Desktop stepper */}
      <ol className="hidden md:flex items-center w-full">
        {WIZARD_STEPS.map((step, index) => {
          const isComplete = isStepComplete(step.id)
          const isCurrent = state.currentStep === step.id
          const isClickable = canGoToStep(step.id)
          const isPast = index < currentIndex

          return (
            <li
              key={step.id}
              className={cn('flex items-center', index < WIZARD_STEPS.length - 1 && 'flex-1')}
            >
              <button
                onClick={() => isClickable && goToStep(step.id)}
                disabled={!isClickable}
                className={cn(
                  'group flex items-center',
                  isClickable && !isCurrent && 'cursor-pointer',
                  !isClickable && 'cursor-not-allowed opacity-50'
                )}
              >
                {/* Step circle */}
                <span
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                    isComplete && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && !isComplete && 'border-primary bg-primary/10 text-primary',
                    !isCurrent && !isComplete && 'border-muted-foreground/30 text-muted-foreground',
                    isClickable && !isCurrent && 'group-hover:border-primary/50'
                  )}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </span>

                {/* Step label */}
                <span className="ml-3 flex flex-col">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isCurrent && 'text-primary',
                      isComplete && 'text-foreground',
                      !isCurrent && !isComplete && 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="text-xs text-muted-foreground hidden lg:block">
                    {step.description}
                  </span>
                </span>
              </button>

              {/* Connector line */}
              {index < WIZARD_STEPS.length - 1 && (
                <div className="flex-1 mx-4">
                  <div
                    className={cn(
                      'h-0.5 transition-colors',
                      isPast || isComplete ? 'bg-primary' : 'bg-muted-foreground/20'
                    )}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {/* Mobile stepper */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary">
            Step {currentIndex + 1} of {WIZARD_STEPS.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {WIZARD_STEPS[currentIndex].label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step dots */}
        <div className="flex justify-between mt-2">
          {WIZARD_STEPS.map((step, index) => {
            const isComplete = isStepComplete(step.id)
            const isCurrent = state.currentStep === step.id
            const isClickable = canGoToStep(step.id)

            return (
              <button
                key={step.id}
                onClick={() => isClickable && goToStep(step.id)}
                disabled={!isClickable}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors',
                  isComplete && 'bg-primary text-primary-foreground',
                  isCurrent && !isComplete && 'bg-primary/20 text-primary border-2 border-primary',
                  !isCurrent && !isComplete && 'bg-muted text-muted-foreground',
                  !isClickable && 'opacity-50'
                )}
              >
                {isComplete ? <Check className="w-3 h-3" /> : index + 1}
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
