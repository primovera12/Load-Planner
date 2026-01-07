import { LoadAnalyzer } from '@/components/load-analyzer'
import { Truck } from 'lucide-react'

export default function AnalyzePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Load Planner</span>
          </div>
          <nav className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              AI-Powered Freight Optimization
            </span>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          {/* Page Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">
              Quick Load Analyzer
            </h1>
            <p className="mt-2 text-muted-foreground">
              Paste a freight request email to instantly get cargo dimensions and
              truck recommendations
            </p>
          </div>

          {/* Analyzer Component */}
          <LoadAnalyzer />

          {/* Footer Info */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>
              Load Planner uses AI to parse freight emails and recommend the best
              trailer type based on cargo dimensions, weight, and legal limits.
            </p>
            <p className="mt-2">
              <strong>Legal Limits:</strong> Height 13.5&apos; | Width 8.5&apos; | GVW
              80,000 lbs
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
