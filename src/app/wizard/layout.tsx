import { WizardProvider } from '@/components/wizard'

export const metadata = {
  title: 'Load Planning Wizard | Load Planner',
  description: 'Step-by-step cargo load planning wizard',
}

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WizardProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {children}
      </div>
    </WizardProvider>
  )
}
